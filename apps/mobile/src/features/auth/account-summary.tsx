import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { PrimaryButton } from './primary-button';
import { useSession } from './session-provider';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

/** Shows who is signed in and lets them sign out. */
export function AccountSummary() {
  const { session, signOut } = useSession();
  const [signingOut, setSigningOut] = useState(false);

  if (session.status !== 'signedIn') {
    return null;
  }

  async function handleSignOut() {
    setSigningOut(true);
    // On success this component unmounts with the rest of the private area.
    await signOut();
  }

  return (
    <ThemedView type="backgroundElement" style={styles.container}>
      <ThemedText type="small" themeColor="textSecondary">
        Sesión iniciada como
      </ThemedText>
      <ThemedText>{session.user.name ?? session.user.email}</ThemedText>
      {session.user.name && (
        <ThemedText type="small" themeColor="textSecondary">
          {session.user.email}
        </ThemedText>
      )}
      <PrimaryButton
        label="Cerrar sesión"
        loading={signingOut}
        onPress={() => void handleSignOut()}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.four,
    borderRadius: Spacing.four,
  },
});
