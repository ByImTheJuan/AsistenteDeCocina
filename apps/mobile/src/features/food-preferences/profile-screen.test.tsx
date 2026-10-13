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

describe('ProfileScreen', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    mockPush.mockClear();
  });

  it('says the preferences are not configured for a new user', async () => {
    await renderSignedIn(<ProfileScreen />, {
      'GET /food-preferences': () => ({ diet: null, liked: [], avoided: [] }),
    });

    expect(
      await screen.findByRole('button', {
        name: 'Preferencias alimentarias: Sin configurar',
      }),
    ).toBeOnTheScreen();
  });

  it('summarizes the saved preferences', async () => {
    await renderSignedIn(<ProfileScreen />, {
      'GET /food-preferences': () => ({
        diet: 'VEGAN',
        liked: [tomate, ajo],
        avoided: [pollo],
      }),
    });

    expect(
      await screen.findByRole('button', {
        name: 'Preferencias alimentarias: Vegana · 2 me gustan · 1 a evitar',
      }),
    ).toBeOnTheScreen();
  });

  it('leaves out of the summary what is not set', async () => {
    await renderSignedIn(<ProfileScreen />, {
      'GET /food-preferences': () => ({
        diet: null,
        liked: [],
        avoided: [pollo],
      }),
    });

    expect(
      await screen.findByRole('button', {
        name: 'Preferencias alimentarias: 1 a evitar',
      }),
    ).toBeOnTheScreen();
  });

  it('opens the food preferences', async () => {
    await renderSignedIn(<ProfileScreen />, {
      'GET /food-preferences': () => ({ diet: null, liked: [], avoided: [] }),
    });

    await user.press(await screen.findByRole('button', { name: /Sin configurar/ }));

    expect(mockPush).toHaveBeenCalledWith('/profile/food-preferences');
  });

  it('shows progress while the preferences load', async () => {
    await renderSignedIn(<ProfileScreen />, {
      'GET /food-preferences': () => new Promise(() => {}),
    });

    expect(
      await screen.findByRole('button', {
        name: 'Preferencias alimentarias: Cargando…',
      }),
    ).toBeOnTheScreen();
  });

  it('still opens the preferences when they could not be loaded', async () => {
    await renderSignedIn(<ProfileScreen />, {
      'GET /food-preferences': () => {
        throw new NetworkError();
      },
    });

    await user.press(
      await screen.findByRole('button', {
        name: 'Preferencias alimentarias: No se han podido cargar',
      }),
    );

    expect(mockPush).toHaveBeenCalledWith('/profile/food-preferences');
  });
});
