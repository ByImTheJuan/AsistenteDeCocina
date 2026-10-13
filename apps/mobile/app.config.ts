import type { ConfigContext, ExpoConfig } from 'expo/config';

// Extends app.json with the values that depend on the environment.
export default ({ config }: ConfigContext): ExpoConfig => {
  const plugins = [...(config.plugins ?? [])];

  // Google Sign-In returns to the app on iOS through a URL scheme: the iOS
  // client ID reversed. Android needs no native configuration. The plugin is
  // used without Firebase, so it only applies once the iOS client ID exists.
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  if (iosClientId) {
    const iosUrlScheme = iosClientId.split('.').reverse().join('.');
    plugins.push(['@react-native-google-signin/google-signin', { iosUrlScheme }]);
  }

  return { ...config, name: config.name ?? '', slug: config.slug ?? '', plugins };
};
