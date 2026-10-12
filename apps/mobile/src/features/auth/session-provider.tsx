import {
  createContext,
  use,
  useEffect,
  useSyncExternalStore,
  type PropsWithChildren,
} from 'react';

import { sessionManager as defaultManager } from './session-manager';
import type { SessionManager, SessionState, SignInResult } from './session-manager';

type SessionContextValue = {
  session: SessionState;
  signIn(): Promise<SignInResult>;
  signOut(): Promise<void>;
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
        signOut: manager.signOut,
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
