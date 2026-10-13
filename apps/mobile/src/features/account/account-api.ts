import { z } from 'zod';

import type { ApiRequestOptions } from '@/lib/api-client';

const accountSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  createdAt: z.string(),
  signInMethods: z.object({
    password: z.boolean(),
    google: z.boolean(),
  }),
});

export type Account = z.infer<typeof accountSchema>;
export type SignInMethod = keyof Account['signInMethods'];

/** Authenticated request, as provided by the session (`useSession().request`). */
export type AuthorizedRequest = (
  path: string,
  options?: Omit<ApiRequestOptions, 'accessToken'>,
) => Promise<unknown>;

export async function getAccount(request: AuthorizedRequest): Promise<Account> {
  return accountSchema.parse(await request('/account'));
}

/** Adds a password or, giving the current one, replaces it. */
export async function setPassword(
  request: AuthorizedRequest,
  input: { newPassword: string; currentPassword?: string },
): Promise<Account> {
  return accountSchema.parse(await request('/account/password', { method: 'PUT', body: input }));
}

export async function linkGoogle(request: AuthorizedRequest, idToken: string): Promise<Account> {
  return accountSchema.parse(
    await request('/account/google', { method: 'PUT', body: { idToken } }),
  );
}

export async function removeSignInMethod(
  request: AuthorizedRequest,
  method: SignInMethod,
  currentPassword: string,
): Promise<Account> {
  return accountSchema.parse(
    await request(`/account/${method}`, { method: 'DELETE', body: { currentPassword } }),
  );
}

export async function deleteAccount(
  request: AuthorizedRequest,
  currentPassword?: string,
): Promise<void> {
  await request('/account/delete', { method: 'POST', body: { currentPassword } });
}
