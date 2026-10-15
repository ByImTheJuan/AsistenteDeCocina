import { screen, userEvent, waitFor } from '@testing-library/react-native';

import type { DietaryRestrictions } from './dietary-restrictions-api';
import { DietaryRestrictionsScreen } from './dietary-restrictions-screen';

import { renderSignedIn } from '@/features/account/account-test-utils';
import { ApiError, NetworkError } from '@/lib/api-client';

// The shared session manager created on import is not used here.
jest.mock('@react-native-google-signin/google-signin', () => ({}));
jest.mock('expo-secure-store', () => ({}));
// Leaving with unsaved changes is covered in the hook's own test; here only
// when the screen asks for the warning.
const mockUnsavedChangesWarning = jest.fn();
jest.mock('@/hooks/use-unsaved-changes-warning', () => ({
  useUnsavedChangesWarning: (hasUnsavedChanges: boolean) =>
    mockUnsavedChangesWarning(hasUnsavedChanges),
}));

const kiwi = { id: 'ing_kiwi', name: 'Kiwi', category: 'FRUIT', defaultUnit: 'PIECE' as const };
const melocoton = {
  id: 'ing_melocoton',
  name: 'Melocotón',
  category: 'FRUIT',
  defaultUnit: 'PIECE' as const,
};
const leche = {
  id: 'ing_leche',
  name: 'Leche',
  category: 'DAIRY_EGG',
  defaultUnit: 'LITER' as const,
};
const queso = {
  id: 'ing_queso',
  name: 'Queso',
  category: 'DAIRY_EGG',
  defaultUnit: 'GRAM' as const,
};

const empty: DietaryRestrictions = {
  allergens: [],
  ingredients: [],
  conflictingLikedIngredients: [],
};
const configured: DietaryRestrictions = {
  allergens: ['MILK', 'TREE_NUTS'],
  ingredients: [kiwi],
  conflictingLikedIngredients: [],
};

type Handler = (body: unknown) => unknown;

/** Answers a save as the API does, reporting `conflicts` as the liked foods it forbids. */
const echo =
  (conflicts: DietaryRestrictions['conflictingLikedIngredients'] = []): Handler =>
  (body) => {
    const catalogue = [kiwi, melocoton, leche, queso];
    const { allergens, ingredientIds } = body as { allergens: string[]; ingredientIds: string[] };
    return {
      allergens,
      ingredients: catalogue.filter(({ id }) => ingredientIds.includes(id)),
      conflictingLikedIngredients: conflicts,
    };
  };

describe('DietaryRestrictionsScreen', () => {
  const user = userEvent.setup();

  const renderScreen = (saved: DietaryRestrictions, routes: Record<string, Handler> = {}) =>
    renderSignedIn(<DietaryRestrictionsScreen />, {
      'GET /dietary-restrictions': () => saved,
      'PUT /dietary-restrictions': echo(),
      'GET /ingredients': () => [kiwi, leche, melocoton, queso],
      'GET /ingredients?search=melo': () => [melocoton],
      ...routes,
    });
  const saveButton = () => screen.getByRole('button', { name: 'Guardar' });
  const allergen = (name: string) => screen.getByRole('checkbox', { name });

  describe('loading', () => {
    it('shows progress while the restrictions load', async () => {
      await renderScreen(empty, { 'GET /dietary-restrictions': () => new Promise(() => {}) });

      expect(await screen.findByLabelText('Cargando tus restricciones')).toBeOnTheScreen();
    });

    it('explains a failed load and retries', async () => {
      let attempts = 0;
      await renderScreen(empty, {
        'GET /dietary-restrictions': () => {
          attempts += 1;
          if (attempts === 1) {
            throw new NetworkError();
          }
          return configured;
        },
      });

      expect(await screen.findByText(/No hemos podido conectar/)).toBeOnTheScreen();
      await user.press(screen.getByRole('button', { name: 'Reintentar' }));

      expect(await screen.findByRole('checkbox', { name: 'Leche' })).toBeChecked();
    });
  });

  describe('what the screen explains', () => {
    it('presents the restrictions as a matter of safety, not of taste', async () => {
      await renderScreen(empty);

      expect(
        await screen.findByText(/es una restricción de seguridad, no un gusto/),
      ).toBeOnTheScreen();
    });

    it('warns that it cannot rule out traces or cross-contamination', async () => {
      await renderScreen(empty);

      expect(
        await screen.findByText(
          /no puede garantizar la ausencia de trazas ni de contaminación cruzada/,
        ),
      ).toBeOnTheScreen();
    });
  });

  describe('a user without restrictions', () => {
    it('offers the 18 allergens and intolerances, none checked', async () => {
      await renderScreen(empty);

      await screen.findByRole('checkbox', { name: 'Gluten' });
      const options = screen.getAllByRole('checkbox');

      expect(options).toHaveLength(18);
      for (const option of options) {
        expect(option).not.toBeChecked();
      }
      expect(allergen('Frutos de cáscara')).toBeOnTheScreen();
      expect(allergen('Lactosa')).toBeOnTheScreen();
      expect(allergen('Sorbitol')).toBeOnTheScreen();
    });

    it('has nothing to save until something changes', async () => {
      await renderScreen(empty);

      await screen.findByRole('checkbox', { name: 'Gluten' });

      expect(saveButton()).toBeDisabled();
    });
  });

  describe('allergens', () => {
    it('shows the saved ones checked', async () => {
      await renderScreen(configured);

      expect(await screen.findByRole('checkbox', { name: 'Leche' })).toBeChecked();
      expect(allergen('Frutos de cáscara')).toBeChecked();
      expect(allergen('Huevo')).not.toBeChecked();
    });

    it('saves the checked ones in the order of the list', async () => {
      const test = await renderScreen(empty);

      await user.press(await screen.findByRole('checkbox', { name: 'Lactosa' }));
      await user.press(allergen('Gluten'));
      expect(allergen('Gluten')).toBeChecked();
      await user.press(saveButton());

      expect(await screen.findByText('Restricciones guardadas.')).toBeOnTheScreen();
      expect(test.sentTo('PUT /dietary-restrictions')).toEqual([
        { allergens: ['GLUTEN', 'LACTOSE'], ingredientIds: [] },
      ]);
      expect(saveButton()).toBeDisabled();
    });

    it('removes one by unchecking it', async () => {
      const test = await renderScreen(configured);

      await user.press(await screen.findByRole('checkbox', { name: 'Leche' }));
      expect(allergen('Leche')).not.toBeChecked();
      await user.press(saveButton());

      await screen.findByText('Restricciones guardadas.');
      expect(test.sentTo('PUT /dietary-restrictions')).toEqual([
        { allergens: ['TREE_NUTS'], ingredientIds: ['ing_kiwi'] },
      ]);
    });

    it('has nothing to save after checking and unchecking the same one', async () => {
      await renderScreen(configured);

      await user.press(await screen.findByRole('checkbox', { name: 'Huevo' }));
      expect(saveButton()).toBeEnabled();
      await user.press(allergen('Huevo'));

      expect(saveButton()).toBeDisabled();
    });
  });

  describe('other foods', () => {
    it('shows the saved ones', async () => {
      await renderScreen(configured);

      expect(
        await screen.findByRole('button', { name: 'Quitar Kiwi de tus restricciones' }),
      ).toBeOnTheScreen();
    });

    it('adds the ones found by searching and saves them', async () => {
      const test = await renderScreen(empty);

      await user.press(await screen.findByRole('button', { name: 'Añadir alimento' }));
      expect(screen.getByText('Alimentos que no puedo comer')).toBeOnTheScreen();
      await user.type(screen.getByLabelText('Buscar alimento'), 'melo');
      // The whole catalogue stays listed until the search answers.
      await waitFor(() =>
        expect(screen.queryByRole('checkbox', { name: 'Kiwi' })).not.toBeOnTheScreen(),
      );
      await user.press(screen.getByRole('checkbox', { name: 'Melocotón' }));
      await user.press(screen.getByRole('button', { name: 'Hecho' }));

      expect(
        screen.getByRole('button', { name: 'Quitar Melocotón de tus restricciones' }),
      ).toBeOnTheScreen();
      await user.press(saveButton());

      await screen.findByText('Restricciones guardadas.');
      expect(test.sentTo('PUT /dietary-restrictions')).toEqual([
        { allergens: [], ingredientIds: ['ing_melocoton'] },
      ]);
    });

    it('removes one', async () => {
      const test = await renderScreen(configured);

      await user.press(
        await screen.findByRole('button', { name: 'Quitar Kiwi de tus restricciones' }),
      );
      await user.press(saveButton());

      await screen.findByText('Restricciones guardadas.');
      expect(test.sentTo('PUT /dietary-restrictions')).toEqual([
        { allergens: ['MILK', 'TREE_NUTS'], ingredientIds: [] },
      ]);
    });
  });

  describe('conflicts with the food preferences', () => {
    it('says nothing when there are none', async () => {
      await renderScreen(configured);

      await screen.findByRole('checkbox', { name: 'Leche' });

      expect(screen.queryByLabelText('Conflicto con tus preferencias')).not.toBeOnTheScreen();
    });

    it('names the liked foods the saved restrictions forbid', async () => {
      await renderScreen({ ...configured, conflictingLikedIngredients: [leche, queso] });

      expect(await screen.findByLabelText('Conflicto con tus preferencias')).toHaveTextContent(
        /chocan con las restricciones guardadas: Leche, Queso\. La restricción manda\./,
      );
    });

    it('reports the ones a new restriction causes once it is saved', async () => {
      await renderScreen(empty, { 'PUT /dietary-restrictions': echo([leche]) });

      await user.press(await screen.findByRole('checkbox', { name: 'Lactosa' }));
      expect(screen.queryByLabelText('Conflicto con tus preferencias')).not.toBeOnTheScreen();
      await user.press(saveButton());

      expect(await screen.findByLabelText('Conflicto con tus preferencias')).toHaveTextContent(
        /Leche/,
      );
    });
  });

  describe('leaving the screen', () => {
    it('does not warn while nothing has changed', async () => {
      await renderScreen(configured);

      await screen.findByRole('checkbox', { name: 'Leche' });

      expect(mockUnsavedChangesWarning).toHaveBeenLastCalledWith(false);
    });

    it('warns once there is a change to lose, until it is saved', async () => {
      await renderScreen(configured);

      await user.press(await screen.findByRole('checkbox', { name: 'Huevo' }));
      expect(mockUnsavedChangesWarning).toHaveBeenLastCalledWith(true);
      await user.press(saveButton());

      await screen.findByText('Restricciones guardadas.');
      expect(mockUnsavedChangesWarning).toHaveBeenLastCalledWith(false);
    });

    it('keeps warning when saving fails', async () => {
      await renderScreen(configured, {
        'PUT /dietary-restrictions': () => {
          throw new NetworkError();
        },
      });

      await user.press(
        await screen.findByRole('button', { name: 'Quitar Kiwi de tus restricciones' }),
      );
      await user.press(saveButton());

      await screen.findByRole('alert');
      expect(mockUnsavedChangesWarning).toHaveBeenLastCalledWith(true);
    });
  });

  describe('saving', () => {
    it('keeps the changes and explains it when the connection fails', async () => {
      let attempts = 0;
      const test = await renderScreen(empty, {
        'PUT /dietary-restrictions': (body) => {
          attempts += 1;
          if (attempts === 1) {
            throw new NetworkError();
          }
          return echo()(body);
        },
      });

      await user.press(await screen.findByRole('checkbox', { name: 'Cacahuetes' }));
      await user.press(saveButton());

      expect(await screen.findByRole('alert')).toHaveTextContent(
        /No hemos podido conectar.*Tus cambios siguen aquí, sin guardar\./,
      );
      expect(screen.queryByText('Restricciones guardadas.')).not.toBeOnTheScreen();
      expect(allergen('Cacahuetes')).toBeChecked();
      expect(saveButton()).toBeEnabled();

      await user.press(saveButton());

      expect(await screen.findByText('Restricciones guardadas.')).toBeOnTheScreen();
      expect(screen.queryByRole('alert')).not.toBeOnTheScreen();
      expect(test.sentTo('PUT /dietary-restrictions')).toHaveLength(2);
    });

    it('explains an error of the API', async () => {
      await renderScreen(configured, {
        'PUT /dietary-restrictions': () => {
          throw new ApiError(400, 'unknown_ingredient');
        },
      });

      await user.press(await screen.findByRole('checkbox', { name: 'Huevo' }));
      await user.press(saveButton());

      expect(await screen.findByRole('alert')).toHaveTextContent(/ya no está disponible/);
    });

    it('stops saying it is saved once something changes again', async () => {
      await renderScreen(empty);

      await user.press(await screen.findByRole('checkbox', { name: 'Huevo' }));
      await user.press(saveButton());
      await screen.findByText('Restricciones guardadas.');
      await user.press(allergen('Soja'));

      expect(screen.queryByText('Restricciones guardadas.')).not.toBeOnTheScreen();
      expect(saveButton()).toBeEnabled();
    });
  });
});
