import { screen, userEvent, waitFor, within } from '@testing-library/react-native';

import type { FoodPreferences } from './food-preferences-api';
import { FoodPreferencesScreen } from './food-preferences-screen';

import { renderSignedIn } from '@/features/account/account-test-utils';
import { ApiError, NetworkError } from '@/lib/api-client';

// The shared session manager created on import is not used here.
jest.mock('@react-native-google-signin/google-signin', () => ({}));
jest.mock('expo-secure-store', () => ({}));

const tomate = { id: 'ing_tomate', name: 'Tomate', category: 'VEGETABLE' };
const tomillo = { id: 'ing_tomillo', name: 'Tomillo', category: 'HERB_SPICE' };
const ajo = { id: 'ing_ajo', name: 'Ajo', category: 'VEGETABLE' };
const pollo = { id: 'ing_pollo', name: 'Pollo', category: 'MEAT' };

const empty: FoodPreferences = { diet: null, liked: [], avoided: [] };
const configured: FoodPreferences = {
  diet: 'VEGETARIAN',
  liked: [tomate],
  avoided: [pollo],
};

type Handler = (body: unknown) => unknown;

/** Answers a save as the API does: with the ingredients of the ids it received. */
const echo: Handler = (body) => {
  const catalogue = [tomate, tomillo, ajo, pollo];
  const { diet, likedIngredientIds, avoidedIngredientIds } = body as {
    diet: FoodPreferences['diet'];
    likedIngredientIds: string[];
    avoidedIngredientIds: string[];
  };
  const byId = (ids: string[]) => catalogue.filter(({ id }) => ids.includes(id));
  return {
    diet,
    liked: byId(likedIngredientIds),
    avoided: byId(avoidedIngredientIds),
  };
};

describe('FoodPreferencesScreen', () => {
  const user = userEvent.setup();

  const renderScreen = (saved: FoodPreferences, routes: Record<string, Handler> = {}) =>
    renderSignedIn(<FoodPreferencesScreen />, {
      'GET /food-preferences': () => saved,
      'PUT /food-preferences': echo,
      'GET /ingredients': () => [ajo, pollo, tomate, tomillo],
      'GET /ingredients?search=tom': () => [tomate, tomillo],
      ...routes,
    });
  const saveButton = () => screen.getByRole('button', { name: 'Guardar' });

  describe('loading', () => {
    it('shows progress while the preferences load', async () => {
      await renderScreen(empty, {
        'GET /food-preferences': () => new Promise(() => {}),
      });

      expect(await screen.findByLabelText('Cargando tus preferencias')).toBeOnTheScreen();
    });

    it('explains a failed load and retries', async () => {
      let attempts = 0;
      await renderScreen(empty, {
        'GET /food-preferences': () => {
          attempts += 1;
          if (attempts === 1) {
            throw new NetworkError();
          }
          return configured;
        },
      });

      expect(await screen.findByText(/No hemos podido conectar/)).toBeOnTheScreen();
      await user.press(screen.getByRole('button', { name: 'Reintentar' }));

      expect(await screen.findByRole('radio', { name: 'Vegetariana' })).toBeChecked();
    });
  });

  describe('a user who has not configured anything', () => {
    it('starts without a diet and with both lists empty', async () => {
      await renderScreen(empty);

      expect(await screen.findByRole('radio', { name: 'Sin preferencia' })).toBeChecked();
      expect(screen.getByRole('radio', { name: 'Vegana' })).not.toBeChecked();
      expect(
        screen.getByText('Todavía no has añadido ningún alimento que te guste.'),
      ).toBeOnTheScreen();
      expect(
        screen.getByText('Todavía no has añadido ningún alimento que prefieras evitar.'),
      ).toBeOnTheScreen();
    });

    it('has nothing to save until something changes', async () => {
      await renderScreen(empty);

      await screen.findByRole('radio', { name: 'Sin preferencia' });

      expect(saveButton()).toBeDisabled();
    });

    it('tells preferences apart from allergies', async () => {
      await renderScreen(empty);

      expect(await screen.findByText(/no sirve para alergias ni intolerancias/)).toBeOnTheScreen();
    });
  });

  describe('diet', () => {
    it('saves the chosen diet', async () => {
      const test = await renderScreen(empty);

      await user.press(await screen.findByRole('radio', { name: 'Vegana' }));
      expect(screen.getByRole('radio', { name: 'Vegana' })).toBeChecked();
      expect(screen.getByRole('radio', { name: 'Sin preferencia' })).not.toBeChecked();
      await user.press(saveButton());

      expect(await screen.findByText('Preferencias guardadas.')).toBeOnTheScreen();
      expect(test.sentTo('PUT /food-preferences')).toEqual([
        { diet: 'VEGAN', likedIngredientIds: [], avoidedIngredientIds: [] },
      ]);
      expect(saveButton()).toBeDisabled();
    });

    it('goes back to no preference', async () => {
      const test = await renderScreen(configured);

      await user.press(await screen.findByRole('radio', { name: 'Sin preferencia' }));
      await user.press(saveButton());

      await screen.findByText('Preferencias guardadas.');
      expect(test.sentTo('PUT /food-preferences')).toEqual([
        {
          diet: null,
          likedIngredientIds: ['ing_tomate'],
          avoidedIngredientIds: ['ing_pollo'],
        },
      ]);
    });
  });

  describe('ingredients', () => {
    it('shows the saved ones in their list', async () => {
      await renderScreen(configured);

      expect(
        await screen.findByRole('button', {
          name: 'Quitar Tomate de «Me gustan»',
        }),
      ).toBeOnTheScreen();
      expect(
        screen.getByRole('button', {
          name: 'Quitar Pollo de «Prefiero evitar»',
        }),
      ).toBeOnTheScreen();
    });

    it('adds the ones found by searching and saves them', async () => {
      const test = await renderScreen(empty);

      await user.press(await screen.findByRole('button', { name: 'Añadir a «Me gustan»' }));
      await user.type(screen.getByLabelText('Buscar alimento'), 'tom');
      // The whole catalogue stays listed until the search answers.
      await waitFor(() =>
        expect(screen.queryByRole('checkbox', { name: 'Ajo' })).not.toBeOnTheScreen(),
      );
      await user.press(screen.getByRole('checkbox', { name: 'Tomillo' }));
      expect(screen.getByRole('checkbox', { name: 'Tomillo' })).toBeChecked();
      await user.press(screen.getByRole('button', { name: 'Hecho' }));

      expect(screen.queryByLabelText('Buscar alimento')).not.toBeOnTheScreen();
      expect(
        screen.getByRole('button', { name: 'Quitar Tomillo de «Me gustan»' }),
      ).toBeOnTheScreen();
      await user.press(saveButton());

      await screen.findByText('Preferencias guardadas.');
      expect(test.sentTo('PUT /food-preferences')).toEqual([
        {
          diet: null,
          likedIngredientIds: ['ing_tomillo'],
          avoidedIngredientIds: [],
        },
      ]);
    });

    it('adds to the list of what to avoid', async () => {
      const test = await renderScreen(empty);

      await user.press(
        await screen.findByRole('button', {
          name: 'Añadir a «Prefiero evitar»',
        }),
      );
      await user.press(await screen.findByRole('checkbox', { name: 'Ajo' }));
      await user.press(screen.getByRole('button', { name: 'Hecho' }));
      await user.press(saveButton());

      await screen.findByText('Preferencias guardadas.');
      expect(test.sentTo('PUT /food-preferences')).toEqual([
        {
          diet: null,
          likedIngredientIds: [],
          avoidedIngredientIds: ['ing_ajo'],
        },
      ]);
    });

    it('removes an ingredient from its list', async () => {
      const test = await renderScreen(configured);

      await user.press(
        await screen.findByRole('button', {
          name: 'Quitar Pollo de «Prefiero evitar»',
        }),
      );
      expect(
        screen.queryByRole('button', {
          name: 'Quitar Pollo de «Prefiero evitar»',
        }),
      ).not.toBeOnTheScreen();
      await user.press(saveButton());

      await screen.findByText('Preferencias guardadas.');
      expect(test.sentTo('PUT /food-preferences')).toEqual([
        {
          diet: 'VEGETARIAN',
          likedIngredientIds: ['ing_tomate'],
          avoidedIngredientIds: [],
        },
      ]);
    });

    it('unchecks in the search an ingredient already in the list', async () => {
      await renderScreen(configured);

      await user.press(await screen.findByRole('button', { name: 'Añadir a «Me gustan»' }));
      const tomato = await screen.findByRole('checkbox', { name: 'Tomate' });
      expect(tomato).toBeChecked();
      await user.press(tomato);
      await user.press(screen.getByRole('button', { name: 'Hecho' }));

      expect(
        screen.queryByRole('button', { name: 'Quitar Tomate de «Me gustan»' }),
      ).not.toBeOnTheScreen();
    });

    it('does not offer for one list what is in the other', async () => {
      await renderScreen(configured);

      await user.press(await screen.findByRole('button', { name: 'Añadir a «Me gustan»' }));
      const chicken = await screen.findByRole('checkbox', { name: 'Pollo' });

      expect(chicken).toBeDisabled();
      expect(within(chicken).getByText('En «Prefiero evitar»')).toBeOnTheScreen();
      await user.press(chicken);
      await user.press(screen.getByRole('button', { name: 'Hecho' }));
      expect(
        screen.queryByRole('button', { name: 'Quitar Pollo de «Me gustan»' }),
      ).not.toBeOnTheScreen();
    });

    it('says when no ingredient matches the search', async () => {
      await renderScreen(empty, { 'GET /ingredients?search=zzz': () => [] });

      await user.press(await screen.findByRole('button', { name: 'Añadir a «Me gustan»' }));
      await user.type(screen.getByLabelText('Buscar alimento'), 'zzz');

      expect(
        await screen.findByText('No hay ningún alimento que coincida con «zzz».'),
      ).toBeOnTheScreen();
    });

    it('explains a failed search and retries', async () => {
      let attempts = 0;
      await renderScreen(empty, {
        'GET /ingredients': () => {
          attempts += 1;
          if (attempts === 1) {
            throw new NetworkError();
          }
          return [ajo];
        },
      });

      await user.press(await screen.findByRole('button', { name: 'Añadir a «Me gustan»' }));
      expect(await screen.findByText(/No hemos podido conectar/)).toBeOnTheScreen();
      await user.press(screen.getByRole('button', { name: 'Reintentar' }));

      expect(await screen.findByRole('checkbox', { name: 'Ajo' })).toBeOnTheScreen();
    });

    it('says there may be more ingredients than the ones listed', async () => {
      const many = Array.from({ length: 50 }, (_, index) => ({
        id: `ing_${index}`,
        name: `Alimento ${index}`,
        category: 'OTHER',
      }));
      await renderScreen(empty, { 'GET /ingredients': () => many });

      await user.press(await screen.findByRole('button', { name: 'Añadir a «Me gustan»' }));

      expect(await screen.findByText(/Hay más alimentos/)).toBeOnTheScreen();
    });
  });

  describe('saving', () => {
    it('keeps the changes and explains it when the connection fails', async () => {
      let attempts = 0;
      const test = await renderScreen(empty, {
        'PUT /food-preferences': (body) => {
          attempts += 1;
          if (attempts === 1) {
            throw new NetworkError();
          }
          return echo(body);
        },
      });

      await user.press(await screen.findByRole('radio', { name: 'Flexitariana' }));
      await user.press(saveButton());

      expect(await screen.findByRole('alert')).toHaveTextContent(
        /No hemos podido conectar.*Tus cambios siguen aquí, sin guardar\./,
      );
      expect(screen.queryByText('Preferencias guardadas.')).not.toBeOnTheScreen();
      expect(screen.getByRole('radio', { name: 'Flexitariana' })).toBeChecked();
      expect(saveButton()).toBeEnabled();

      await user.press(saveButton());

      expect(await screen.findByText('Preferencias guardadas.')).toBeOnTheScreen();
      expect(screen.queryByRole('alert')).not.toBeOnTheScreen();
      expect(test.sentTo('PUT /food-preferences')).toHaveLength(2);
    });

    it('explains an error of the API', async () => {
      await renderScreen(configured, {
        'PUT /food-preferences': () => {
          throw new ApiError(400, 'unknown_ingredient');
        },
      });

      await user.press(await screen.findByRole('radio', { name: 'Vegana' }));
      await user.press(saveButton());

      expect(await screen.findByRole('alert')).toHaveTextContent(/ya no está disponible/);
    });

    it('stops saying it is saved once something changes again', async () => {
      await renderScreen(empty);

      await user.press(await screen.findByRole('radio', { name: 'Vegana' }));
      await user.press(saveButton());
      await screen.findByText('Preferencias guardadas.');
      await user.press(screen.getByRole('radio', { name: 'Pescetariana' }));

      expect(screen.queryByText('Preferencias guardadas.')).not.toBeOnTheScreen();
      expect(saveButton()).toBeEnabled();
    });
  });
});
