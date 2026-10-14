import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import { accountErrorMessage, isWrongCurrentPassword } from './account-errors';
import { useAccount, useDeleteAccount } from './use-account';

import { FormScreen } from '@/components/form-screen';
import { PrimaryButton } from '@/components/primary-button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/features/auth/session-provider';

// What docs/data-retention-policy.md sets, in the user's terms.
const consequences = [
  'Se borrarán tu cuenta y tus datos personales: preferencias, despensa, planes, listas de compra y favoritos.',
  'Se cerrará la sesión en todos tus dispositivos.',
  'Las recetas y reseñas que hayas publicado seguirán visibles, sin tu nombre.',
  'No se puede deshacer: no podremos recuperar tu cuenta.',
];

/** Explains what deleting the account means and asks to confirm it twice. */
export function DeleteAccountScreen() {
  const { data: account } = useAccount();
  const { signOut } = useSession();
  const deleteAccount = useDeleteAccount();
  const [currentPassword, setCurrentPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [failure, setFailure] = useState<string | null>(null);

  if (!account) {
    return (
      <FormScreen>
        <ActivityIndicator accessibilityLabel="Cargando tu cuenta" />
      </FormScreen>
    );
  }
  const hasPassword = account.signInMethods.password;

  async function handleDelete() {
    try {
      await deleteAccount.mutateAsync(hasPassword ? currentPassword : undefined);
    } catch (error) {
      if (isWrongCurrentPassword(error)) {
        setPasswordError(accountErrorMessage(error));
      } else {
        setFailure(accountErrorMessage(error));
      }
      return;
    }
    // The account no longer exists: forget the session on this device. The
    // route guard then leaves the private area.
    await signOut();
  }

  function askForConfirmation() {
    setFailure(null);
    if (hasPassword && !currentPassword) {
      setPasswordError('Escribe tu contraseña actual.');
      return;
    }
    setPasswordError(undefined);
    Alert.alert(
      '¿Eliminar tu cuenta?',
      'Tu cuenta y tus datos se borrarán ahora y no se podrán recuperar.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => void handleDelete() },
      ],
    );
  }

  return (
    <FormScreen>
      <ThemedText type="title" style={styles.text}>
        Eliminar cuenta
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.text}>
        Antes de continuar, esto es lo que ocurrirá:
      </ThemedText>

      <View style={styles.list}>
        {consequences.map((consequence) => (
          <ThemedText key={consequence} type="small">
            • {consequence}
          </ThemedText>
        ))}
      </View>

      {hasPassword && (
        <TextField
          label="Contraseña actual"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          error={passwordError}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="done"
        />
      )}
      <PrimaryButton
        label="Eliminar mi cuenta definitivamente"
        variant="danger"
        loading={deleteAccount.isPending}
        onPress={askForConfirmation}
      />

      {failure && (
        <ThemedText type="small" themeColor="error" accessibilityRole="alert" style={styles.text}>
          {failure}
        </ThemedText>
      )}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  text: {
    textAlign: 'center',
  },
  list: {
    alignSelf: 'stretch',
    gap: Spacing.sm,
  },
});
