import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import type { Account } from './account-api';

import { SessionProvider } from '@/features/auth/session-provider';
import { apiSession, createFakeSession } from '@/features/auth/session-test-utils';
import { ApiError } from '@/lib/api-client';

// Helpers to render account screens for a signed-in user against a fake API.

export const passwordAccount: Account = {
  id: 'user-1',
  email: 'ana@example.com',
  name: 'Ana',
  avatarUrl: null,
  createdAt: '2026-10-13T08:30:00.000Z',
  signInMethods: { password: true, google: false },
};

export const googleAccount: Account = {
  ...passwordAccount,
  signInMethods: { password: false, google: true },
};

export const linkedAccount: Account = {
  ...passwordAccount,
  signInMethods: { password: true, google: true },
};

type Handler = (body: unknown) => unknown;

/**
 * Renders `ui` with a session already started. `routes` answers the API calls,
 * keyed by method and path (`'PUT /account/password'`); a handler may return
 * the response body or throw. Unlisted calls fail with a 404.
 */
export async function renderSignedIn(ui: ReactElement, routes: Record<string, Handler>) {
  const fake = createFakeSession('refresh-0');
  fake.api.refreshSession.mockResolvedValue(apiSession());
  fake.api.request.mockImplementation(async (path, options) => {
    const handler = routes[`${options?.method ?? 'GET'} ${path}`];
    if (!handler) {
      throw new ApiError(404);
    }
    return handler(options?.body);
  });

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  await render(
    <QueryClientProvider client={queryClient}>
      <SessionProvider manager={fake.manager}>{ui}</SessionProvider>
    </QueryClientProvider>,
  );

  /** Bodies sent to a route, in order. */
  const sentTo = (route: string) =>
    fake.api.request.mock.calls
      .filter(([path, options]) => `${options?.method ?? 'GET'} ${path}` === route)
      .map(([, options]) => options?.body);

  return { ...fake, queryClient, sentTo };
}
