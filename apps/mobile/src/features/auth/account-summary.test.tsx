import { render, screen, userEvent } from '@testing-library/react-native';

import { AccountSummary } from './account-summary';
import { SessionProvider } from './session-provider';
import { ana, apiSession, createFakeSession } from './session-test-utils';

// The shared instance created by the module is not used here.
jest.mock('@react-native-google-signin/google-signin', () => ({}));
jest.mock('expo-secure-store', () => ({}));

async function renderSignedIn(user = ana) {
  const fake = createFakeSession('refresh-0');
  fake.api.refreshSession.mockResolvedValue({ ...apiSession(), user });
  await render(
    <SessionProvider manager={fake.manager}>
      <AccountSummary />
    </SessionProvider>,
  );
  await screen.findByText('Sesión iniciada como');
  return fake;
}

describe('AccountSummary', () => {
  it('shows the name and email of the signed-in user', async () => {
    await renderSignedIn();

    expect(screen.getByText('Ana')).toBeOnTheScreen();
    expect(screen.getByText('ana@example.com')).toBeOnTheScreen();
  });

  it('falls back to the email when the account has no name', async () => {
    await renderSignedIn({ ...ana, name: null });

    expect(screen.getAllByText('ana@example.com')).toHaveLength(1);
  });

  it('signs the user out', async () => {
    const fake = await renderSignedIn();

    await userEvent.setup().press(screen.getByRole('button', { name: 'Cerrar sesión' }));

    expect(fake.manager.getState()).toEqual({ status: 'signedOut' });
    expect(fake.api.signOut).toHaveBeenCalledWith('refresh-1');
    expect(fake.storedRefreshToken()).toBeNull();
    expect(screen.queryByText('Sesión iniciada como')).not.toBeOnTheScreen();
  });

  it('renders nothing without a session', async () => {
    const fake = createFakeSession();
    await render(
      <SessionProvider manager={fake.manager}>
        <AccountSummary />
      </SessionProvider>,
    );

    expect(screen.queryByText('Sesión iniciada como')).not.toBeOnTheScreen();
  });
});
