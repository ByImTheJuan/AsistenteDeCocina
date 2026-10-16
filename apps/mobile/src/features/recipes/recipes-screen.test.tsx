import { screen, userEvent } from '@testing-library/react-native';

import type { PantryRecipe, PantryRecipes, RecipeCatalogue, RecipeSummary } from './recipes-api';
import { RecipeFiltersProvider } from './recipe-filters-context';
import { RecipesScreen } from './recipes-screen';

import { renderSignedIn } from '@/features/account/account-test-utils';
import { NetworkError } from '@/lib/api-client';

// The shared session manager created on import is not used here.
jest.mock('@react-native-google-signin/google-signin', () => ({}));
jest.mock('expo-secure-store', () => ({}));
// In the app the tabs provide the safe area; here, the library's stand-in.
jest.mock('react-native-safe-area-context', () =>
  jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useRouter: () => ({ push: mockPush }),
}));

// In the app the tab's layout provides the search and filters.
function Screen() {
  return (
    <RecipeFiltersProvider>
      <RecipesScreen />
    </RecipeFiltersProvider>
  );
}

const tortilla: RecipeSummary = {
  id: 'rec_tortilla_patatas',
  name: 'Tortilla de patatas',
  imageUrl: null,
  totalMinutes: 45,
  mainIngredients: [
    { id: 'ing_patata', name: 'Patata' },
    { id: 'ing_huevo', name: 'Huevo' },
    { id: 'ing_cebolla', name: 'Cebolla' },
  ],
  allergensUncertain: false,
  rating: null,
  caloriesPerServing: 678,
};
const gazpacho: RecipeSummary = {
  id: 'rec_gazpacho',
  name: 'Gazpacho andaluz',
  imageUrl: 'https://example.com/gazpacho.jpg',
  totalMinutes: 140,
  mainIngredients: [{ id: 'ing_tomate', name: 'Tomate' }],
  allergensUncertain: true,
  rating: { average: 4.5, count: 12 },
  caloriesPerServing: null,
};
const catalogue: RecipeCatalogue = { recipes: [gazpacho, tortilla], hiddenCount: 0 };

const PANTRY = 'GET /recipes/pantry?today=2026-10-16';
const nothingToCheck: PantryRecipe['pantry'] = {
  canPrepare: true,
  missing: [],
  checkQuantity: [],
  checkToTaste: [],
  using: [],
};
const food = (id: string, name: string) => ({ id, name });
const pantryRecipes: PantryRecipes = {
  recipes: [
    {
      ...gazpacho,
      pantry: {
        ...nothingToCheck,
        canPrepare: false,
        missing: [
          {
            ingredient: food('ing_pepino', 'Pepino'),
            needed: { quantity: 1, unit: 'PIECE' },
            have: null,
            expired: false,
          },
        ],
        using: [
          {
            ingredient: food('ing_tomate', 'Tomate'),
            expiresOn: '2026-10-17',
            dateKind: 'USE_BY',
          },
        ],
      },
    },
    {
      ...tortilla,
      pantry: {
        ...nothingToCheck,
        checkQuantity: [food('ing_patata', 'Patata')],
        checkToTaste: [food('ing_sal', 'Sal')],
        using: [
          { ingredient: food('ing_patata', 'Patata'), expiresOn: null, dateKind: null },
          { ingredient: food('ing_huevo', 'Huevo'), expiresOn: '2026-11-20', dateKind: 'USE_BY' },
        ],
      },
    },
    {
      ...tortilla,
      id: 'rec_lentejas',
      name: 'Lentejas estofadas',
      pantry: {
        ...nothingToCheck,
        canPrepare: false,
        missing: [
          {
            ingredient: food('ing_chorizo', 'Chorizo'),
            needed: { quantity: 150, unit: 'GRAM' },
            have: { quantity: 100, unit: 'GRAM' },
            expired: false,
          },
          {
            ingredient: food('ing_pimiento', 'Pimiento'),
            needed: { quantity: 1, unit: 'PIECE' },
            have: null,
            expired: true,
          },
        ],
        using: [{ ingredient: food('ing_lentejas', 'Lentejas'), expiresOn: null, dateKind: null }],
      },
    },
  ],
  hiddenCount: 0,
  inventoryEmpty: false,
};

describe('RecipesScreen', () => {
  const user = userEvent.setup();
  const renderScreen = (getCatalogue: () => unknown) =>
    renderSignedIn(<Screen />, { 'GET /recipes': getCatalogue });

  beforeEach(() => {
    mockPush.mockClear();
  });

  it('shows progress while the catalogue loads', async () => {
    await renderScreen(() => new Promise(() => {}));

    expect(await screen.findByLabelText('Cargando las recetas')).toBeOnTheScreen();
  });

  it('explains a failed load and retries', async () => {
    let attempts = 0;
    await renderScreen(() => {
      attempts += 1;
      if (attempts === 1) {
        throw new NetworkError();
      }
      return catalogue;
    });

    expect(await screen.findByText('No se han podido cargar las recetas')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('Tortilla de patatas')).toBeOnTheScreen();
  });

  it('shows the name, main ingredients, time and that there are no ratings', async () => {
    await renderScreen(() => catalogue);

    expect(
      await screen.findByRole('button', {
        name: 'Tortilla de patatas, 45 min, 678 kcal por ración, Patata, huevo y cebolla, Sin valoraciones',
      }),
    ).toBeOnTheScreen();
    expect(screen.getByText('Patata, huevo y cebolla')).toBeOnTheScreen();
    expect(screen.getByText('45 min · 678 kcal · Sin valoraciones')).toBeOnTheScreen();
  });

  it('shows the rating when a recipe has one', async () => {
    await renderScreen(() => catalogue);

    expect(await screen.findByText('2 h 20 min · 4,5 · 12 valoraciones')).toBeOnTheScreen();
  });

  it('lists the recipes in the order of the API', async () => {
    await renderScreen(() => catalogue);

    await screen.findByText('Tortilla de patatas');
    const names = screen
      .getAllByRole('button')
      .map((button) => button.props.accessibilityLabel as string)
      // Recipe rows: name, time, …; not the filter buttons.
      .filter((label) => label.includes(','))
      .map((label) => label.split(',')[0]);
    expect(names).toEqual(['Gazpacho andaluz', 'Tortilla de patatas']);
  });

  it('shows the picture when there is one and a stand-in otherwise', async () => {
    await renderScreen(() => catalogue);

    await screen.findByText('Tortilla de patatas');
    expect(screen.getAllByTestId('recipe-image', { includeHiddenElements: true })).toHaveLength(1);
    expect(screen.getAllByTestId('recipe-image-placeholder', { includeHiddenElements: true })).toHaveLength(1);
  });

  it('marks the recipes whose allergens must be checked', async () => {
    await renderScreen(() => catalogue);

    expect(
      await screen.findByRole('button', { name: /^Gazpacho andaluz, .*Revisa los alérgenos$/ }),
    ).toBeOnTheScreen();
    expect(screen.getAllByText('Revisa los alérgenos')).toHaveLength(1);
  });

  it('says how many recipes were hidden for the restrictions', async () => {
    await renderScreen(() => ({ ...catalogue, hiddenCount: 3 }));

    expect(
      await screen.findByText(
        'Ocultamos 3 recetas que no son aptas según tus alergias e intolerancias.',
      ),
    ).toBeOnTheScreen();
  });

  it('says nothing about hidden recipes when none were', async () => {
    await renderScreen(() => catalogue);

    await screen.findByText('Tortilla de patatas');
    expect(screen.queryByText(/^Ocultamos/)).not.toBeOnTheScreen();
  });

  it('explains when every recipe clashes with the restrictions', async () => {
    await renderScreen(() => ({ recipes: [], hiddenCount: 24 }));

    expect(await screen.findByText('No hay recetas aptas para ti')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Todas las recetas del catálogo contienen algo de tus alergias e intolerancias.',
      ),
    ).toBeOnTheScreen();
  });

  it('opens a recipe', async () => {
    await renderScreen(() => catalogue);

    await user.press(await screen.findByRole('button', { name: /^Tortilla de patatas/ }));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/recipes/[id]',
      params: { id: 'rec_tortilla_patatas' },
    });
  });

  describe('with the pantry', () => {
    // Only the date is faked: the day the screen asks the recipes for.
    beforeEach(() => {
      jest.useFakeTimers({
        now: new Date(2026, 9, 16, 10),
        doNotFake: [
          'hrtime',
          'nextTick',
          'performance',
          'queueMicrotask',
          'requestAnimationFrame',
          'cancelAnimationFrame',
          'requestIdleCallback',
          'cancelIdleCallback',
          'setImmediate',
          'clearImmediate',
          'setInterval',
          'clearInterval',
          'setTimeout',
          'clearTimeout',
        ],
      });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    const showPantry = async (getPantry: () => unknown) => {
      await renderSignedIn(<Screen />, {
        'GET /recipes': () => catalogue,
        [PANTRY]: getPantry,
      });
      await screen.findByText('Tortilla de patatas');
      await user.press(screen.getByRole('radio', { name: /Con mi despensa/ }));
    };

    const recipeNames = () =>
      screen
        .getAllByRole('button')
        .map((button) => button.props.accessibilityLabel as string)
        .filter((label) => label.includes(','))
        .map((label) => label.split(',')[0]);

    it('groups the recipes by how well they use the pantry', async () => {
      await showPantry(() => pantryRecipes);

      expect(await screen.findByText('Aprovecha lo que caduca pronto')).toBeOnTheScreen();
      const headings = screen.getAllByRole('header').map((heading) => heading.props.children);
      expect(headings).toEqual([
        'Recetas',
        'Aprovecha lo que caduca pronto',
        'Puedes prepararlas',
        'Te falta poco',
      ]);
      expect(recipeNames()).toEqual([
        'Gazpacho andaluz',
        'Tortilla de patatas',
        'Lentejas estofadas',
      ]);
    });

    it('says what each recipe uses up, lacks and has to be checked', async () => {
      await showPantry(() => pantryRecipes);

      expect(await screen.findByText('Usa Tomate · Caduca mañana')).toBeOnTheScreen();
      expect(screen.getByText('Falta: Pepino')).toBeOnTheScreen();
      expect(screen.getByText('Comprueba la cantidad de: Patata')).toBeOnTheScreen();
      expect(screen.getByText('Comprueba que tienes: Sal')).toBeOnTheScreen();
      expect(screen.getByText('Falta: Chorizo (tienes 100 g de 150 g)')).toBeOnTheScreen();
      expect(screen.getByText('Caducado, no se cuenta: Pimiento')).toBeOnTheScreen();
      expect(
        screen.getByRole('button', {
          name: /^Lentejas estofadas, .*Falta: Chorizo \(tienes 100 g de 150 g\), Caducado, no se cuenta: Pimiento$/,
        }),
      ).toBeOnTheScreen();
    });

    it('reminds to check the food before cooking', async () => {
      await showPantry(() => pantryRecipes);

      expect(
        await screen.findByText(/^Revisa que los alimentos estén en buen estado antes de cocinar/),
      ).toBeOnTheScreen();
    });

    it('offers the whole catalogue when the pantry is empty', async () => {
      await showPantry(() => ({ recipes: [], hiddenCount: 0, inventoryEmpty: true }));

      expect(await screen.findByText('Tu despensa está vacía')).toBeOnTheScreen();
      await user.press(screen.getByRole('button', { name: 'Ver todas las recetas' }));

      expect(await screen.findByText('Gazpacho andaluz')).toBeOnTheScreen();
    });

    it('offers the whole catalogue when no recipe uses the pantry well', async () => {
      await showPantry(() => ({
        ...pantryRecipes,
        recipes: [{ ...tortilla, pantry: { ...nothingToCheck, canPrepare: false } }],
      }));

      expect(await screen.findByText('Todavía no hay recetas para tu despensa')).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Ver todas las recetas' })).toBeOnTheScreen();
    });

    it('explains a failed load and retries', async () => {
      let attempts = 0;
      await showPantry(() => {
        attempts += 1;
        if (attempts === 1) {
          throw new NetworkError();
        }
        return pantryRecipes;
      });

      expect(await screen.findByText('No se han podido cargar las recetas')).toBeOnTheScreen();
      await user.press(screen.getByRole('button', { name: 'Reintentar' }));

      expect(await screen.findByText('Puedes prepararlas')).toBeOnTheScreen();
    });

    it('says how many recipes were hidden for the restrictions', async () => {
      await showPantry(() => ({ ...pantryRecipes, hiddenCount: 1 }));

      expect(
        await screen.findByText(
          'Ocultamos 1 receta que no es apta según tus alergias e intolerancias.',
        ),
      ).toBeOnTheScreen();
    });
  });
});
