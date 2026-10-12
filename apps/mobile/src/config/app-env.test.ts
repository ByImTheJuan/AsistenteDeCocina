type AppEnvModule = typeof import('./app-env');

const variables = [
  'EXPO_PUBLIC_API_URL',
  'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID',
  'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID',
] as const;

function loadWith(overrides: Partial<Record<(typeof variables)[number], string>>): AppEnvModule {
  const saved = variables.map((name) => process.env[name]);
  variables.forEach((name) => {
    if (name in overrides) {
      process.env[name] = overrides[name];
    } else {
      delete process.env[name];
    }
  });
  try {
    let loaded!: AppEnvModule;
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      loaded = require('./app-env');
    });
    return loaded;
  } finally {
    variables.forEach((name, index) => {
      if (saved[index] === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = saved[index];
      }
    });
  }
}

describe('app environment', () => {
  it('exposes the configuration when it is valid', () => {
    const { envError, getEnv } = loadWith({
      EXPO_PUBLIC_API_URL: 'http://192.168.1.10:3000',
      EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: 'web.apps.googleusercontent.com',
    });

    expect(envError).toBeNull();
    expect(getEnv()).toEqual({
      apiUrl: 'http://192.168.1.10:3000',
      googleWebClientId: 'web.apps.googleusercontent.com',
      googleIosClientId: undefined,
    });
  });

  it('can be imported without the variables and reports what is missing', () => {
    const { envError, getEnv } = loadWith({});

    expect(envError).toContain('EXPO_PUBLIC_API_URL is required');
    expect(envError).toContain('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is required');
    expect(() => getEnv()).toThrow('EXPO_PUBLIC_API_URL is required');
  });
});
