import { act, screen, userEvent } from '@testing-library/react-native';

import { ForYouScreen } from './for-you-screen';
import type { Recommendations, RecommendedRecipe } from './recipes-api';

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
const mockNavigate = jest.fn();
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useRouter: () => ({ push: mockPush, navigate: mockNavigate }),
}));

const RECOMMENDATIONS = 'GET /recipes/recommendations?today=2026-10-16';

function recipe(id: string, name: string, overrides: Partial<RecommendedRecipe> = {}) {
  return {
    id,
    name,
    imageUrl: null,
    totalMinutes: 45,
    mainIngredients: [],
    allergensUncertain: false,
    rating: null,
    caloriesPerServing: 520,
    description: `Descripción de ${name}.`,
    servings: 4,
    likedIngredients: [],
    pantry: { canPrepare: false, missing: [], checkQuantity: [], checkToTaste: [], using: [] },
    perServing: { calories: 520, protein: 14 },
    goals: [],
    ...overrides,
  } satisfies RecommendedRecipe;
}

const tortilla = recipe('rec_tortilla_patatas', 'Tortilla de patatas', {
  likedIngredients: [{ id: 'ing_huevo', name: 'Huevo' }],
});
const gazpacho = recipe('rec_gazpacho', 'Gazpacho andaluz', { allergensUncertain: true });
const pisto = recipe('rec_pisto', 'Pisto de verduras');

const recommendations: Recommendations = {
  recipes: [tortilla, gazpacho, pisto],
  hiddenCount: 0,
  excludedCount: 0,
};

// The card on top: the only one screen readers reach.
const topCard = () =>
  screen.getByLabelText(/^(Tortilla de patatas|Gazpacho andaluz|Pisto de verduras),/);

describe('ForYouScreen', () => {
  // The date decides the day sent to the API; the timers, the animations.
  beforeEach(() => {
    jest.useFakeTimers({ now: new Date(2026, 9, 16, 10) });
    mockPush.mockClear();
    mockNavigate.mockClear();
  });
  afterEach(() => jest.useRealTimers());

  const setup = () => userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  // The card leaves the screen with a short animation before the decision.
  const decide = async (user: ReturnType<typeof setup>, button: 'No me interesa' | 'Ver receta') => {
    await user.press(screen.getByRole('button', { name: button }));
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
  };

  it('shows the recommendations one at a time, the most suitable first', async () => {
    await renderSignedIn(<ForYouScreen />, { [RECOMMENDATIONS]: () => recommendations });

    expect(await screen.findByText('Tortilla de patatas')).toBeOnTheScreen();
    expect(topCard().props.accessibilityLabel).toBe(
      'Tortilla de patatas, 45 min · 4 raciones, Lleva huevo, que te gusta, 520 kcal por ración',
    );
    expect(screen.getByText('Quedan 3 recetas')).toBeOnTheScreen();
  });

  it('shows the next one when a recommendation is not of interest', async () => {
    const user = setup();
    await renderSignedIn(<ForYouScreen />, { [RECOMMENDATIONS]: () => recommendations });
    await screen.findByText('Tortilla de patatas');

    await decide(user, 'No me interesa');

    expect(topCard().props.accessibilityLabel).toMatch(/^Gazpacho andaluz,/);
    expect(screen.getByText('Quedan 2 recetas')).toBeOnTheScreen();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('opens the recipe when it is accepted, and moves on', async () => {
    const user = setup();
    await renderSignedIn(<ForYouScreen />, { [RECOMMENDATIONS]: () => recommendations });
    await screen.findByText('Tortilla de patatas');

    await decide(user, 'Ver receta');

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/recipe/[id]',
      params: { id: 'rec_tortilla_patatas' },
    });
    expect(topCard().props.accessibilityLabel).toMatch(/^Gazpacho andaluz,/);
  });

  it('does not present as safe a recipe whose allergens cannot be verified', async () => {
    const user = setup();
    await renderSignedIn(<ForYouScreen />, { [RECOMMENDATIONS]: () => recommendations });
    await screen.findByText('Tortilla de patatas');

    await decide(user, 'No me interesa');

    expect(topCard().props.accessibilityLabel).toContain('Revisa los alérgenos');
    expect(screen.getAllByText('Revisa los alérgenos').length).toBeGreaterThan(0);
  });

  it('offers the catalogue when there are no more recommendations', async () => {
    const user = setup();
    await renderSignedIn(<ForYouScreen />, { [RECOMMENDATIONS]: () => recommendations });
    await screen.findByText('Tortilla de patatas');

    await decide(user, 'No me interesa');
    await decide(user, 'No me interesa');
    await decide(user, 'No me interesa');

    expect(screen.getByText('No hay más recomendaciones')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Ver el catálogo' }));
    expect(mockNavigate).toHaveBeenCalledWith('/recipes');
  });

  it('does not offer again what was seen when the recommendations are asked again', async () => {
    const user = setup();
    const { queryClient } = await renderSignedIn(<ForYouScreen />, {
      [RECOMMENDATIONS]: () => recommendations,
    });
    await screen.findByText('Tortilla de patatas');

    await decide(user, 'No me interesa');
    await act(async () => {
      await queryClient.invalidateQueries();
    });

    expect(topCard().props.accessibilityLabel).toMatch(/^Gazpacho andaluz,/);
  });

  it('explains why there are no recommendations instead of offering unsuitable ones', async () => {
    const user = setup();
    await renderSignedIn(<ForYouScreen />, {
      [RECOMMENDATIONS]: () => ({ recipes: [], hiddenCount: 3, excludedCount: 21 }),
    });

    expect(await screen.findByText('No hay recetas que encajen con tu perfil')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'No te proponemos 3 recetas por tus alergias e intolerancias ni 21 recetas por tu dieta o los alimentos que no te gustan. Puedes revisar tu perfil o explorar el catálogo.',
      ),
    ).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Ver el catálogo' }));
    expect(mockNavigate).toHaveBeenCalledWith('/recipes');
  });

  it('warns when only a few recipes fit the profile', async () => {
    await renderSignedIn(<ForYouScreen />, {
      [RECOMMENDATIONS]: () => ({ recipes: [pisto], hiddenCount: 0, excludedCount: 23 }),
    });

    expect(
      await screen.findByText(
        'Solo hemos encontrado 1 receta que encaje con tu perfil. No te proponemos 23 recetas por tu dieta o los alimentos que no te gustan.',
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText('Queda 1 receta')).toBeOnTheScreen();
  });

  it('explains a failed load and retries', async () => {
    const user = setup();
    let attempts = 0;
    await renderSignedIn(<ForYouScreen />, {
      [RECOMMENDATIONS]: () => {
        attempts += 1;
        if (attempts === 1) {
          throw new NetworkError();
        }
        return recommendations;
      },
    });

    expect(
      await screen.findByText('No se han podido cargar las recomendaciones'),
    ).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('Tortilla de patatas')).toBeOnTheScreen();
  });
});
