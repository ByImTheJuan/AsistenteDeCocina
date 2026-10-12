import { parseEnv } from './env';

const valid = {
  EXPO_PUBLIC_API_URL: 'http://192.168.1.10:3000',
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: 'web.apps.googleusercontent.com',
};

describe('parseEnv', () => {
  it('returns the API URL without trailing slashes', () => {
    expect(parseEnv({ ...valid, EXPO_PUBLIC_API_URL: 'http://192.168.1.10:3000/' })).toEqual({
      apiUrl: 'http://192.168.1.10:3000',
      googleWebClientId: 'web.apps.googleusercontent.com',
      googleIosClientId: undefined,
    });
  });

  it('fails when the API URL is missing', () => {
    expect(() => parseEnv({ ...valid, EXPO_PUBLIC_API_URL: undefined })).toThrow(
      'EXPO_PUBLIC_API_URL is required',
    );
  });

  it('fails when the API URL is not a valid URL', () => {
    expect(() => parseEnv({ ...valid, EXPO_PUBLIC_API_URL: 'not-a-url' })).toThrow(
      'EXPO_PUBLIC_API_URL must be a valid URL',
    );
  });

  it.each([undefined, ''])('fails when the Google web client ID is %p', (value) => {
    expect(() => parseEnv({ ...valid, EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: value })).toThrow(
      'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is required',
    );
  });

  it('returns the Google iOS client ID when it is set', () => {
    expect(
      parseEnv({ ...valid, EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: 'ios.apps.googleusercontent.com' })
        .googleIosClientId,
    ).toBe('ios.apps.googleusercontent.com');
  });

  it('treats an empty Google iOS client ID as not set', () => {
    expect(
      parseEnv({ ...valid, EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: '' }).googleIosClientId,
    ).toBeUndefined();
  });
});
