import { screen, userEvent } from '@testing-library/react-native';

import type { RecipeCatalogue, RecipeSummary } from './recipes-api';
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
};
const gazpacho: RecipeSummary = {
  id: 'rec_gazpacho',
  name: 'Gazpacho andaluz',
  imageUrl: 'https://example.com/gazpacho.jpg',
  totalMinutes: 140,
  mainIngredients: [{ id: 'ing_tomate', name: 'Tomate' }],
  allergensUncertain: true,
  rating: { average: 4.5, count: 12 },
};
const catalogue: RecipeCatalogue = { recipes: [gazpacho, tortilla], hiddenCount: 0 };

describe('RecipesScreen', () => {
  const user = userEvent.setup();
  const renderScreen = (getCatalogue: () => unknown) =>
    renderSignedIn(<RecipesScreen />, { 'GET /recipes': getCatalogue });

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
        name: 'Tortilla de patatas, 45 min, Patata, huevo y cebolla, Sin valoraciones',
      }),
    ).toBeOnTheScreen();
    expect(screen.getByText('Patata, huevo y cebolla')).toBeOnTheScreen();
    expect(screen.getByText('45 min · Sin valoraciones')).toBeOnTheScreen();
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
      .map((button) => (button.props.accessibilityLabel as string).split(',')[0]);
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
});
