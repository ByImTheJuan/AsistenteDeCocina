import {
  deleteAccount,
  getAccount,
  linkGoogle,
  removeSignInMethod,
  setPassword,
} from './account-api';

const account = {
  id: 'user-1',
  email: 'ana@example.com',
  name: 'Ana',
  avatarUrl: null,
  createdAt: '2026-10-13T08:30:00.000Z',
  signInMethods: { password: true, google: false },
};

describe('account API', () => {
  const request = jest.fn();

  beforeEach(() => {
    request.mockReset().mockResolvedValue(account);
  });

  it('reads the account', async () => {
    await expect(getAccount(request)).resolves.toEqual(account);

    expect(request).toHaveBeenCalledWith('/account');
  });

  it('adds a password', async () => {
    await expect(setPassword(request, { newPassword: 'new password' })).resolves.toEqual(account);

    expect(request).toHaveBeenCalledWith('/account/password', {
      method: 'PUT',
      body: { newPassword: 'new password' },
    });
  });

  it('changes the password with the current one', async () => {
    await setPassword(request, { newPassword: 'new password', currentPassword: 'old password' });

    expect(request).toHaveBeenCalledWith('/account/password', {
      method: 'PUT',
      body: { newPassword: 'new password', currentPassword: 'old password' },
    });
  });

  it('links a Google account', async () => {
    await expect(linkGoogle(request, 'google-id-token')).resolves.toEqual(account);

    expect(request).toHaveBeenCalledWith('/account/google', {
      method: 'PUT',
      body: { idToken: 'google-id-token' },
    });
  });

  it.each(['password', 'google'] as const)('removes the %s method', async (method) => {
    await expect(removeSignInMethod(request, method, 'current password')).resolves.toEqual(
      account,
    );

    expect(request).toHaveBeenCalledWith(`/account/${method}`, {
      method: 'DELETE',
      body: { currentPassword: 'current password' },
    });
  });

  it('deletes the account', async () => {
    request.mockResolvedValue(undefined);

    await expect(deleteAccount(request, 'current password')).resolves.toBeUndefined();

    expect(request).toHaveBeenCalledWith('/account/delete', {
      method: 'POST',
      body: { currentPassword: 'current password' },
    });
  });

  it.each([
    ['no body', undefined],
    ['no sign-in methods', { ...account, signInMethods: undefined }],
    ['a non-boolean method', { ...account, signInMethods: { password: 'yes', google: false } }],
    ['no email', { ...account, email: undefined }],
  ])('rejects an account response with %s', async (_case, body) => {
    request.mockResolvedValue(body);

    await expect(getAccount(request)).rejects.toThrow();
  });
});
