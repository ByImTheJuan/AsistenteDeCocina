import { screen, userEvent, waitFor } from '@testing-library/react-native';

import { AssignRecipeScreen } from './assign-recipe-screen';
import { fakeToday, gazpacho, tortilla, tuesdayLunch } from './meal-plan-test-utils';

import { renderSignedIn } from '@/features/account/account-test-utils';
import { ApiError, NetworkError } from '@/lib/api-client';

// The shared session manager created on import is not used here.
jest.mock('@react-native-google-signin/google-signin', () => ({}));
jest.mock('expo-secure-store', () => ({}));
// Stable, like the router expo-router returns.
const mockRouter = { back: jest.fn() };
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockParams,
}));

const CATALOGUE = 'GET /recipes';
const catalogue = { recipes: [gazpacho, tortilla], hiddenCount: 1 };

type Handler = (body: unknown) => unknown;

describe('AssignRecipeScreen', () => {
  const user = userEvent.setup();

  const renderScreen = (routes: Record<string, Handler> = {}) =>
    renderSignedIn(<AssignRecipeScreen />, {
      [CATALOGUE]: () => catalogue,
      'POST /meal-plan': (body) => ({ ...tuesdayLunch, ...(body as object) }),
      'PUT /meal-plan/entry-1': (body) => ({ ...tuesdayLunch, ...(body as object) }),
      ...routes,
    });
  const option = (name: RegExp) => screen.findByRole('button', { name });

  beforeEach(() => {
    fakeToday();
    mockParams = { date: '2026-10-20', meal: 'LUNCH' };
    mockRouter.back.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('says which meal it fills and offers the apt recipes', async () => {
    await renderScreen();

    expect(screen.getByRole('header', { name: 'Comida del martes 20 oct' })).toBeOnTheScreen();
    expect(screen.getByText(/Solo aparecen las recetas aptas/)).toBeOnTheScreen();
    expect(
      await option(/^Gazpacho andaluz, 20 min, Revisa los alérgenos$/),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole('button', {
        name: 'Tortilla de patatas, 45 min, 320 kcal por ración, Patata y huevo',
      }),
    ).toBeOnTheScreen();
  });

  it('plans the recipe chosen and goes back to the plan', async () => {
    const test = await renderScreen();

    await user.press(await option(/^Tortilla de patatas/));

    expect(test.sentTo('POST /meal-plan')).toEqual([
      { date: '2026-10-20', meal: 'LUNCH', recipeId: tortilla.id },
    ]);
    expect(mockRouter.back).toHaveBeenCalled();
  });

  it('puts the recipe chosen in place of the planned one', async () => {
    mockParams = { date: '2026-10-20', meal: 'LUNCH', entryId: 'entry-1' };
    const test = await renderScreen();
    expect(screen.getByText(/Elige la receta que quieres poner en su lugar/)).toBeOnTheScreen();

    await user.press(await option(/^Gazpacho andaluz/));

    expect(test.sentTo('PUT /meal-plan/entry-1')).toEqual([
      { date: '2026-10-20', meal: 'LUNCH', recipeId: gazpacho.id },
    ]);
    expect(test.sentTo('POST /meal-plan')).toEqual([]);
    expect(mockRouter.back).toHaveBeenCalled();
  });

  it('stays and explains why when the meal already has a recipe', async () => {
    await renderScreen({
      'POST /meal-plan': () => {
        throw new ApiError(409, 'meal_slot_taken');
      },
    });

    await user.press(await option(/^Tortilla de patatas/));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /Ya tienes una receta en esa comida/,
    );
    expect(mockRouter.back).not.toHaveBeenCalled();
  });

  it('explains a recipe that is no longer apt', async () => {
    await renderScreen({
      'POST /meal-plan': () => {
        throw new ApiError(409, 'recipe_not_allowed');
      },
    });

    await user.press(await option(/^Tortilla de patatas/));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /no es apta según tus alergias e intolerancias/,
    );
  });

  it('searches the recipes', async () => {
    const test = await renderScreen({
      'GET /recipes?search=tortilla': () => ({ recipes: [tortilla], hiddenCount: 0 }),
    });
    await option(/^Gazpacho andaluz/);

    await user.type(screen.getByLabelText('Buscar recetas'), 'tortilla');

    // The previous list stays until the results arrive.
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /^Gazpacho andaluz/ })).toBeNull(),
    );
    expect(screen.getByRole('button', { name: /^Tortilla de patatas/ })).toBeOnTheScreen();
    expect(test.sentTo('GET /recipes?search=tortilla')).toHaveLength(1);
  });

  it('says so when nothing matches the search', async () => {
    await renderScreen({
      'GET /recipes?search=xyz': () => ({ recipes: [], hiddenCount: 0 }),
    });
    await option(/^Gazpacho andaluz/);

    await user.type(screen.getByLabelText('Buscar recetas'), 'xyz');

    expect(await screen.findByText('No hay recetas que coincidan')).toBeOnTheScreen();
  });

  it('reports recipes that could not be loaded and retries', async () => {
    let fail = true;
    await renderScreen({
      [CATALOGUE]: () => {
        if (fail) {
          throw new NetworkError();
        }
        return catalogue;
      },
    });

    expect(await screen.findByText('No se han podido cargar las recetas')).toBeOnTheScreen();
    fail = false;
    await user.press(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await option(/^Gazpacho andaluz/)).toBeOnTheScreen();
  });

  it('does not offer recipes for a meal it does not know', async () => {
    mockParams = { date: '2026-10-20', meal: 'SNACK' };
    await renderScreen();

    expect(screen.getByText('No se ha encontrado esa comida')).toBeOnTheScreen();
  });
});
