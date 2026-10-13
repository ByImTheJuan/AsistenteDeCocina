import { screen, userEvent } from '@testing-library/react-native';

import { ProfileScreen } from './profile-screen';

import { renderSignedIn } from '@/features/account/account-test-utils';
import { NetworkError } from '@/lib/api-client';

// The shared session manager created on import is not used here.
jest.mock('@react-native-google-signin/google-signin', () => ({}));
jest.mock('expo-secure-store', () => ({}));
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useRouter: () => ({ push: mockPush }),
}));

const tomate = { id: 'ing_tomate', name: 'Tomate', category: 'VEGETABLE' };
const ajo = { id: 'ing_ajo', name: 'Ajo', category: 'VEGETABLE' };
const pollo = { id: 'ing_pollo', name: 'Pollo', category: 'MEAT' };

const noPreferences = { diet: null, liked: [], avoided: [] };
const noRestrictions = { allergens: [], ingredients: [], conflictingLikedIngredients: [] };
const noGoals = { dailyCalories: null, mealCalories: null, dailyProtein: null };

type Handler = () => unknown;

describe('ProfileScreen', () => {
  const user = userEvent.setup();

  const renderProfile = (routes: Record<string, Handler> = {}) =>
    renderSignedIn(<ProfileScreen />, {
      'GET /food-preferences': () => noPreferences,
      'GET /dietary-restrictions': () => noRestrictions,
      'GET /nutrition-goals': () => noGoals,
      ...routes,
    });

  beforeEach(() => {
    mockPush.mockClear();
  });

  it('says nothing is configured for a new user', async () => {
    await renderProfile();

    expect(
      await screen.findByRole('button', { name: 'Preferencias alimentarias: Sin configurar' }),
    ).toBeOnTheScreen();
    expect(
      await screen.findByRole('button', { name: 'Alergias e intolerancias: Sin configurar' }),
    ).toBeOnTheScreen();
  });

  describe('food preferences', () => {
    it('summarizes the saved ones', async () => {
      await renderProfile({
        'GET /food-preferences': () => ({ diet: 'VEGAN', liked: [tomate, ajo], avoided: [pollo] }),
      });

      expect(
        await screen.findByRole('button', {
          name: 'Preferencias alimentarias: Vegana · 2 me gustan · 1 a evitar',
        }),
      ).toBeOnTheScreen();
    });

    it('leaves out of the summary what is not set', async () => {
      await renderProfile({
        'GET /food-preferences': () => ({ diet: null, liked: [], avoided: [pollo] }),
      });

      expect(
        await screen.findByRole('button', { name: 'Preferencias alimentarias: 1 a evitar' }),
      ).toBeOnTheScreen();
    });

    it('opens them', async () => {
      await renderProfile();

      await user.press(
        await screen.findByRole('button', { name: 'Preferencias alimentarias: Sin configurar' }),
      );

      expect(mockPush).toHaveBeenCalledWith('/profile/food-preferences');
    });
  });

  describe('allergies and intolerances', () => {
    it('counts allergens and ingredients together', async () => {
      await renderProfile({
        'GET /dietary-restrictions': () => ({
          allergens: ['MILK', 'EGG'],
          ingredients: [tomate],
          conflictingLikedIngredients: [],
        }),
      });

      expect(
        await screen.findByRole('button', { name: 'Alergias e intolerancias: 3 restricciones' }),
      ).toBeOnTheScreen();
    });

    it('says it in the singular for one', async () => {
      await renderProfile({
        'GET /dietary-restrictions': () => ({ ...noRestrictions, allergens: ['GLUTEN'] }),
      });

      expect(
        await screen.findByRole('button', { name: 'Alergias e intolerancias: 1 restricción' }),
      ).toBeOnTheScreen();
    });

    it('opens them', async () => {
      await renderProfile();

      await user.press(
        await screen.findByRole('button', { name: 'Alergias e intolerancias: Sin configurar' }),
      );

      expect(mockPush).toHaveBeenCalledWith('/profile/dietary-restrictions');
    });
  });

  describe('nutrition goals', () => {
    it('says they are not configured for a new user', async () => {
      await renderProfile();

      expect(
        await screen.findByRole('button', { name: 'Objetivos nutricionales: Sin configurar' }),
      ).toBeOnTheScreen();
    });

    it('counts the goals in use', async () => {
      await renderProfile({
        'GET /nutrition-goals': () => ({
          dailyCalories: { value: 2000, enabled: true },
          mealCalories: { value: 600, enabled: false },
          dailyProtein: { value: 90, enabled: true },
        }),
      });

      expect(
        await screen.findByRole('button', { name: 'Objetivos nutricionales: 2 objetivos activos' }),
      ).toBeOnTheScreen();
    });

    it('says so when every goal is switched off', async () => {
      await renderProfile({
        'GET /nutrition-goals': () => ({ ...noGoals, dailyProtein: { value: 90, enabled: false } }),
      });

      expect(
        await screen.findByRole('button', { name: 'Objetivos nutricionales: Ninguno activo' }),
      ).toBeOnTheScreen();
    });

    it('opens them', async () => {
      await renderProfile();

      await user.press(
        await screen.findByRole('button', { name: 'Objetivos nutricionales: Sin configurar' }),
      );

      expect(mockPush).toHaveBeenCalledWith('/profile/nutrition-goals');
    });
  });

  it('shows progress while each section loads', async () => {
    await renderProfile({
      'GET /food-preferences': () => new Promise(() => {}),
      'GET /dietary-restrictions': () => new Promise(() => {}),
    });

    expect(
      await screen.findByRole('button', { name: 'Preferencias alimentarias: Cargando…' }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Alergias e intolerancias: Cargando…' }),
    ).toBeOnTheScreen();
  });

  it('still opens a section that could not be loaded, without affecting the other', async () => {
    await renderProfile({
      'GET /dietary-restrictions': () => {
        throw new NetworkError();
      },
    });

    await user.press(
      await screen.findByRole('button', {
        name: 'Alergias e intolerancias: No se han podido cargar',
      }),
    );

    expect(mockPush).toHaveBeenCalledWith('/profile/dietary-restrictions');
    expect(
      screen.getByRole('button', { name: 'Preferencias alimentarias: Sin configurar' }),
    ).toBeOnTheScreen();
  });
});
