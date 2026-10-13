import {
  createContext,
  use,
  useEffect,
  useSyncExternalStore,
  type PropsWithChildren,
} from 'react';

import { sessionManager as defaultManager } from './session-manager';
import type { Registration } from './auth-api';
import type {
  PasswordSignInResult,
  RegisterResult,
  SessionManager,
  SessionState,
  SignInResult,
} from './session-manager';

type SessionContextValue = {
  session: SessionState;
  /** Signs in with Google. */
  signIn(): Promise<SignInResult>;
  signInWithPassword(email: string, password: string): Promise<PasswordSignInResult>;
  register(registration: Registration): Promise<RegisterResult>;
  signOut(): Promise<void>;
  /** Calls the API as the signed-in user; see `authorizedRequest`. */
  request: SessionManager['authorizedRequest'];
  /** Tries again to recover the saved session after a connection failure. */
  retry(): Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

type SessionProviderProps = PropsWithChildren<{
  /** Replaceable in tests; the app uses the shared instance. */
  manager?: SessionManager;
}>;

export function SessionProvider({ manager = defaultManager, children }: SessionProviderProps) {
  const session = useSyncExternalStore(manager.subscribe, manager.getState);

  useEffect(() => {
    void manager.restore();
  }, [manager]);

  return (
    <SessionContext
      value={{
        session,
        signIn: manager.signIn,
        signInWithPassword: manager.signInWithPassword,
        register: manager.register,
        signOut: manager.signOut,
        request: manager.authorizedRequest,
        retry: manager.restore,
      }}>
      {children}
    </SessionContext>
  );
}

export function useSession(): SessionContextValue {
  const value = use(SessionContext);
  if (!value) {
    throw new Error('useSession must be used inside a SessionProvider');
  }
  return value;
}
