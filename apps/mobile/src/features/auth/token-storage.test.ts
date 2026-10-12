import * as SecureStore from 'expo-secure-store';

import { clearRefreshToken, getRefreshToken, setRefreshToken } from './token-storage';

jest.mock('expo-secure-store', () => {
  const items = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (key: string) => items.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      items.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      items.delete(key);
    }),
  };
});

describe('token storage', () => {
  it('has no refresh token initially', async () => {
    await expect(getRefreshToken()).resolves.toBeNull();
  });

  it('keeps the refresh token in secure storage', async () => {
    await setRefreshToken('refresh-1');

    await expect(getRefreshToken()).resolves.toBe('refresh-1');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('auth.refreshToken', 'refresh-1');
  });

  it('replaces the previous refresh token', async () => {
    await setRefreshToken('refresh-1');
    await setRefreshToken('refresh-2');

    await expect(getRefreshToken()).resolves.toBe('refresh-2');
  });

  it('removes the refresh token', async () => {
    await setRefreshToken('refresh-1');

    await clearRefreshToken();

    await expect(getRefreshToken()).resolves.toBeNull();
  });
});
