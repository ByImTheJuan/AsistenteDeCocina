import { screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { Text } from 'react-native';

import RootLayout from '@/app/_layout';

// The app started without its .env file, as on a fresh clone.
jest.mock('@/config/app-env', () => ({
  envError: 'Invalid environment configuration: EXPO_PUBLIC_API_URL is required',
  getEnv: () => {
    throw new Error('Invalid environment configuration: EXPO_PUBLIC_API_URL is required');
  },
}));
jest.mock('@/components/animated-icon', () => ({ AnimatedSplashOverlay: () => null }));
jest.mock('expo-splash-screen', () => ({ preventAutoHideAsync: jest.fn() }));
jest.mock('expo-secure-store', () => ({ getItemAsync: jest.fn() }));
jest.mock('@react-native-google-signin/google-signin', () => ({}));

describe('root layout with an invalid configuration', () => {
  it('explains what is missing instead of loading the app', async () => {
    await renderRouter(
      {
        _layout: RootLayout,
        'sign-in': () => <Text>Sign-in screen</Text>,
        '(app)/index': () => <Text>Private home</Text>,
      },
      { initialUrl: '/' },
    );

    expect(await screen.findByText('Falta configuración')).toBeOnTheScreen();
    expect(
      screen.getByText('Invalid environment configuration: EXPO_PUBLIC_API_URL is required'),
    ).toBeOnTheScreen();
    expect(screen.queryByText('Sign-in screen')).not.toBeOnTheScreen();
    expect(screen.queryByText('Private home')).not.toBeOnTheScreen();
  });
});
