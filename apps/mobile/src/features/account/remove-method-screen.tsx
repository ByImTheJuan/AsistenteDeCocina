import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import type { SignInMethod } from './account-api';
import { accountErrorMessage, isWrongCurrentPassword } from './account-errors';
import { useRemoveSignInMethod } from './use-account';

import { FormScreen } from '@/components/form-screen';
import { PrimaryButton } from '@/components/primary-button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';

const copy: Record<SignInMethod, { title: string; explanation: string }> = {
  password: {
    title: 'Quitar contraseña',
    explanation:
      'Dejarás de poder entrar con tu email y contraseña. Seguirás pudiendo entrar con Google.',
  },
  google: {
    title: 'Desvincular Google',
    explanation:
      'Dejarás de poder entrar con Google. Seguirás pudiendo entrar con tu email y contraseña.',
  },
};

/**
 * Removes one sign-in method after confirming with the current password.
 * Only reachable for accounts that have both methods, so one always remains.
 */
export function RemoveMethodScreen({ method }: { method: SignInMethod }) {
  const router = useRouter();
  const removeMethod = useRemoveSignInMethod();
  const [currentPassword, setCurrentPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [failure, setFailure] = useState<string | null>(null);
  const { title, explanation } = copy[method];

  async function handleRemove() {
    setFailure(null);
    if (!currentPassword) {
      setPasswordError('Escribe tu contraseña actual.');
      return;
    }
    setPasswordError(undefined);
    try {
      await removeMethod.mutateAsync({ method, currentPassword });
      router.back();
    } catch (error) {
      if (isWrongCurrentPassword(error)) {
        setPasswordError(accountErrorMessage(error));
      } else {
        setFailure(accountErrorMessage(error));
      }
    }
  }

  return (
    <FormScreen>
      <ThemedText type="title" style={styles.text}>
        {title}
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.text}>
        {explanation} Se cerrará la sesión en tus otros dispositivos.
      </ThemedText>

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
        onSubmitEditing={() => void handleRemove()}
      />
      <PrimaryButton
        label={title}
        variant="danger"
        loading={removeMethod.isPending}
        onPress={() => void handleRemove()}
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
});
