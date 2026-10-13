import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as accountApi from './account-api';
import type { Account, SignInMethod } from './account-api';

import { useSession } from '@/features/auth/session-provider';

const accountQueryKey = ['account'] as const;

export function useAccount() {
  const { request } = useSession();
  return useQuery({ queryKey: accountQueryKey, queryFn: () => accountApi.getAccount(request) });
}

// Every change returns the updated account, which replaces the cached one so
// the account screen is current without asking again.
function useAccountMutation<Input>(mutationFn: (input: Input) => Promise<Account>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (account) => queryClient.setQueryData(accountQueryKey, account),
  });
}

export function useSetPassword() {
  const { request } = useSession();
  return useAccountMutation((input: { newPassword: string; currentPassword?: string }) =>
    accountApi.setPassword(request, input),
  );
}

export function useLinkGoogle() {
  const { request } = useSession();
  return useAccountMutation((idToken: string) => accountApi.linkGoogle(request, idToken));
}

export function useRemoveSignInMethod() {
  const { request } = useSession();
  return useAccountMutation((input: { method: SignInMethod; currentPassword: string }) =>
    accountApi.removeSignInMethod(request, input.method, input.currentPassword),
  );
}

export function useDeleteAccount() {
  const { request } = useSession();
  return useMutation({
    mutationFn: (currentPassword?: string) => accountApi.deleteAccount(request, currentPassword),
  });
}
