import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet } from 'react-native';
import { z } from 'zod';

import { accountErrorMessage, isWrongCurrentPassword } from './account-errors';
import { useAccount, useSetPassword } from './use-account';

import { FormScreen } from '@/components/form-screen';
import { Notice } from '@/components/notice';
import { ScreenState } from '@/components/screen-state';
import { PrimaryButton } from '@/components/primary-button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { signUpSchema } from '@/features/auth/credentials-schema';

// The new password follows the registration rule. The current one is only
// asked for, and required, when the account already has a password.
function passwordFormSchema(hasPassword: boolean) {
  return z.object({
    currentPassword: hasPassword ? z.string().min(1, 'Escribe tu contraseña actual.') : z.string(),
    newPassword: signUpSchema.shape.password,
  });
}

type PasswordForm = z.infer<ReturnType<typeof passwordFormSchema>>;

/** Adds a password to the account or changes the one it has. */
export function PasswordScreen() {
  const { data: account } = useAccount();

  if (!account) {
    return <ScreenState kind="loading" label="Cargando tu cuenta" />;
  }
  return <PasswordFormView hasPassword={account.signInMethods.password} />;
}

function PasswordFormView({ hasPassword: initialHasPassword }: { hasPassword: boolean }) {
  // Fixed when the form opens: saving a first password updates the account
  // behind it, and the form must not change shape while it closes.
  const [hasPassword] = useState(initialHasPassword);
  const router = useRouter();
  const setPassword = useSetPassword();
  const [failure, setFailure] = useState<string | null>(null);
  const { control, handleSubmit, setError } = useForm<PasswordForm>({
    resolver: zodResolver(passwordFormSchema(hasPassword)),
    defaultValues: { currentPassword: '', newPassword: '' },
  });

  const submit = handleSubmit(async ({ currentPassword, newPassword }) => {
    setFailure(null);
    try {
      await setPassword.mutateAsync({
        newPassword,
        currentPassword: hasPassword ? currentPassword : undefined,
      });
      router.back();
    } catch (error) {
      if (isWrongCurrentPassword(error)) {
        setError('currentPassword', { message: accountErrorMessage(error) });
      } else {
        setFailure(accountErrorMessage(error));
      }
    }
  });

  const action = hasPassword ? 'Cambiar contraseña' : 'Añadir contraseña';

  return (
    <FormScreen>
      <ThemedText type="title" style={styles.text}>
        {action}
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.text}>
        {hasPassword
          ? 'Al cambiarla se cerrará la sesión en tus otros dispositivos.'
          : 'Con una contraseña podrás entrar también con tu email, además de con Google.'}
      </ThemedText>

      {hasPassword && (
        <Controller
          control={control}
          name="currentPassword"
          render={({ field, fieldState }) => (
            <TextField
              label="Contraseña actual"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="next"
            />
          )}
        />
      )}
      <Controller
        control={control}
        name="newPassword"
        render={({ field, fieldState }) => (
          <TextField
            label="Nueva contraseña"
            placeholder="Al menos 8 caracteres"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="done"
            onSubmitEditing={() => void submit()}
          />
        )}
      />
      <PrimaryButton label={action} loading={setPassword.isPending} onPress={() => void submit()} />

      {failure && <Notice tone="error">{failure}</Notice>}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  text: {
    textAlign: 'center',
  },
});
