import { screen, userEvent } from '@testing-library/react-native';

import { RecipeDetailScreen } from './recipe-detail-screen';
import type { RecipeDetail } from './recipes-api';

import { renderSignedIn } from '@/features/account/account-test-utils';
import { ApiError, NetworkError } from '@/lib/api-client';

// The shared session manager created on import is not used here.
jest.mock('@react-native-google-signin/google-signin', () => ({}));
jest.mock('expo-secure-store', () => ({}));
jest.mock('react-native-safe-area-context', () =>
  jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useLocalSearchParams: () => ({ id: 'rec_tortilla_patatas' }),
}));

const ingredient = (id: string, name: string) => ({
  id,
  name,
  category: 'OTHER',
  units: ['GRAM' as const],
  defaultUnit: 'GRAM' as const,
});

const tortilla: RecipeDetail = {
  id: 'rec_tortilla_patatas',
  name: 'Tortilla de patatas',
  description: 'La tortilla de siempre.',
  imageUrl: null,
  totalMinutes: 45,
  servings: 4,
  ingredients: [
    {
      ingredient: ingredient('ing_patata', 'Patata'),
      quantity: 4,
      unit: 'PIECE',
      note: 'medianas',
      main: true,
    },
    { ingredient: ingredient('ing_huevo', 'Huevo'), quantity: 6, unit: 'PIECE', note: null, main: true },
    {
      ingredient: ingredient('ing_aceite_de_oliva', 'Aceite de oliva'),
      quantity: 2,
      unit: 'TABLESPOON',
      note: null,
      main: false,
    },
    { ingredient: ingredient('ing_sal', 'Sal'), quantity: null, unit: null, note: null, main: false },
  ],
  steps: ['Pela las patatas.', 'Pocha la patata.', 'Cuaja la tortilla.'],
  rating: null,
  safety: { conflictingAllergens: [], conflictingIngredients: [], allergensUncertain: false },
};

describe('RecipeDetailScreen', () => {
  const user = userEvent.setup();
  const renderScreen = (getRecipe: () => unknown) =>
    renderSignedIn(<RecipeDetailScreen />, { 'GET /recipes/rec_tortilla_patatas': getRecipe });

  it('shows progress while the recipe loads', async () => {
    await renderScreen(() => new Promise(() => {}));

    expect(await screen.findByLabelText('Cargando la receta')).toBeOnTheScreen();
  });

  it('explains a failed load and retries', async () => {
    let attempts = 0;
    await renderScreen(() => {
      attempts += 1;
      if (attempts === 1) {
        throw new NetworkError();
      }
      return tortilla;
    });

    expect(await screen.findByText('No se ha podido cargar la receta')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('Tortilla de patatas')).toBeOnTheScreen();
  });

  it('says when the recipe is no longer in the catalogue', async () => {
    await renderScreen(() => {
      throw new ApiError(404, 'recipe_not_found');
    });

    expect(await screen.findByText('Esta receta ya no está disponible')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeOnTheScreen();
  });

  it('shows the time, the servings and that there are no ratings', async () => {
    await renderScreen(() => tortilla);

    expect(await screen.findByText('Tortilla de patatas')).toBeOnTheScreen();
    expect(screen.getByText('La tortilla de siempre.')).toBeOnTheScreen();
    expect(screen.getByText('45 min')).toBeOnTheScreen();
    expect(screen.getByText('4 raciones')).toBeOnTheScreen();
    expect(screen.getByText('Sin valoraciones')).toBeOnTheScreen();
  });

  it('lists the ingredients with their quantities, in order', async () => {
    await renderScreen(() => tortilla);

    await screen.findByText('Tortilla de patatas');
    expect(screen.getByText('Para 4 raciones.')).toBeOnTheScreen();
    expect(screen.getAllByLabelText(/^(Patata|Huevo|Aceite de oliva|Sal): /).map(label)).toEqual([
      'Patata: 4 unidades, medianas',
      'Huevo: 6 unidades',
      'Aceite de oliva: 2 cucharadas',
      'Sal: al gusto',
    ]);
  });

  it('numbers the steps in order', async () => {
    await renderScreen(() => tortilla);

    await screen.findByText('Tortilla de patatas');
    expect(screen.getAllByLabelText(/^Paso \d/).map(label)).toEqual([
      'Paso 1: Pela las patatas.',
      'Paso 2: Pocha la patata.',
      'Paso 3: Cuaja la tortilla.',
    ]);
  });

  it('does not warn about a recipe without conflicts or uncertain ingredients', async () => {
    await renderScreen(() => tortilla);

    await screen.findByText('Tortilla de patatas');
    expect(screen.queryByText('No es apta para ti')).not.toBeOnTheScreen();
    expect(screen.queryByText('Revisa los alérgenos')).not.toBeOnTheScreen();
    // The allergen data is never presented as a guarantee.
    expect(screen.getByText(/La información de alérgenos es orientativa/)).toBeOnTheScreen();
  });

  it('warns that a recipe hidden from the catalogue clashes with the restrictions', async () => {
    await renderScreen(() => ({
      ...tortilla,
      safety: {
        conflictingAllergens: ['EGG'],
        conflictingIngredients: [{ id: 'ing_patata', name: 'Patata' }],
        allergensUncertain: false,
      },
    }));

    expect(await screen.findByText('No es apta para ti')).toBeOnTheScreen();
    expect(
      screen.getByText('Contiene huevo y patata, que están en tus alergias e intolerancias.'),
    ).toBeOnTheScreen();
  });

  it('asks to check the allergens of uncertain ingredients', async () => {
    await renderScreen(() => ({
      ...tortilla,
      safety: { ...tortilla.safety, allergensUncertain: true },
    }));

    expect(await screen.findByText('Revisa los alérgenos')).toBeOnTheScreen();
  });

  it('shows the picture when there is one', async () => {
    await renderScreen(() => ({ ...tortilla, imageUrl: 'https://example.com/tortilla.jpg' }));

    await screen.findByText('Tortilla de patatas');
    expect(screen.getByTestId('recipe-image', { includeHiddenElements: true })).toBeOnTheScreen();
  });
});

function label(element: { props: { accessibilityLabel?: string } }): string | undefined {
  return element.props.accessibilityLabel;
}
