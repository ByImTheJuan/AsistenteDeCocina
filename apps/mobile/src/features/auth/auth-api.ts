import { z } from 'zod';

import { apiRequest } from '@/lib/api-client';

const userSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  avatarUrl: z.string().nullable(),
});

const sessionSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  user: userSchema,
});

export type User = z.infer<typeof userSchema>;
export type ApiSession = z.infer<typeof sessionSchema>;

export async function signInWithGoogle(idToken: string): Promise<ApiSession> {
  const body = await apiRequest('/auth/google', { method: 'POST', body: { idToken } });
  return sessionSchema.parse(body);
}

export async function refreshSession(refreshToken: string): Promise<ApiSession> {
  const body = await apiRequest('/auth/refresh', { method: 'POST', body: { refreshToken } });
  return sessionSchema.parse(body);
}

export async function signOut(refreshToken: string): Promise<void> {
  await apiRequest('/auth/logout', { method: 'POST', body: { refreshToken } });
}
