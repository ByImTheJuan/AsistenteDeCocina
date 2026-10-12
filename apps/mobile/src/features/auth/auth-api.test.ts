import { refreshSession, signInWithGoogle, signOut } from './auth-api';

import { apiRequest } from '@/lib/api-client';

jest.mock('@/lib/api-client', () => ({
  ...jest.requireActual('@/lib/api-client'),
  apiRequest: jest.fn(),
}));

const mockedRequest = jest.mocked(apiRequest);

const session = {
  accessToken: 'access-1',
  refreshToken: 'refresh-1',
  user: { id: 'user-1', email: 'ana@example.com', name: 'Ana', avatarUrl: null },
};

describe('auth API', () => {
  beforeEach(() => {
    mockedRequest.mockReset();
  });

  it('exchanges a Google ID token for a session', async () => {
    mockedRequest.mockResolvedValue(session);

    await expect(signInWithGoogle('google-id-token')).resolves.toEqual(session);

    expect(mockedRequest).toHaveBeenCalledWith('/auth/google', {
      method: 'POST',
      body: { idToken: 'google-id-token' },
    });
  });

  it('exchanges a refresh token for a new session', async () => {
    mockedRequest.mockResolvedValue(session);

    await expect(refreshSession('refresh-0')).resolves.toEqual(session);

    expect(mockedRequest).toHaveBeenCalledWith('/auth/refresh', {
      method: 'POST',
      body: { refreshToken: 'refresh-0' },
    });
  });

  it('revokes a refresh token', async () => {
    mockedRequest.mockResolvedValue(undefined);

    await signOut('refresh-1');

    expect(mockedRequest).toHaveBeenCalledWith('/auth/logout', {
      method: 'POST',
      body: { refreshToken: 'refresh-1' },
    });
  });

  it.each([
    ['no tokens', { user: session.user }],
    ['an empty access token', { ...session, accessToken: '' }],
    ['no user', { accessToken: 'a', refreshToken: 'r' }],
    ['a user without email', { ...session, user: { id: 'user-1', name: null, avatarUrl: null } }],
    ['no body', undefined],
  ])('rejects a response with %s', async (_case, body) => {
    mockedRequest.mockResolvedValue(body);

    await expect(signInWithGoogle('google-id-token')).rejects.toThrow();
  });
});
