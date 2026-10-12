import { parseEnv } from './env';

describe('parseEnv', () => {
  it('returns the API URL without trailing slashes', () => {
    expect(parseEnv({ EXPO_PUBLIC_API_URL: 'http://192.168.1.10:3000/' })).toEqual({
      apiUrl: 'http://192.168.1.10:3000',
    });
  });

  it('fails when the API URL is missing', () => {
    expect(() => parseEnv({})).toThrow('EXPO_PUBLIC_API_URL is required');
  });

  it('fails when the API URL is not a valid URL', () => {
    expect(() => parseEnv({ EXPO_PUBLIC_API_URL: 'not-a-url' })).toThrow(
      'EXPO_PUBLIC_API_URL must be a valid URL',
    );
  });
});
