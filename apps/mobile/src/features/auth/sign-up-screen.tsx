import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet } from 'react-native';

import { FormScreen } from '@/components/form-screen';
import { signUpSchema, type SignUpForm } from './credentials-schema';
import { PrimaryButton } from '@/components/primary-button';
import type { RegisterFailure } from './session-manager';
import { useSession } from './session-provider';
import { TextField } from '@/components/text-field';

import { ThemedText } from '@/components/themed-text';

const failureMessages: Record<RegisterFailure, string> = {
  'email-taken': 'Ya existe una cuenta con ese email. Inicia sesión con tu contraseña o con Google.',
  'invalid-data': 'El servidor no ha aceptado los datos. Revísalos e inténtalo de nuevo.',
  'rate-limited': 'Has hecho demasiados intentos. Espera un minuto y vuelve a intentarlo.',
  network: 'No hemos podido conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.',
  unknown: 'Ha ocurrido un error inesperado al crear la cuenta. Inténtalo de nuevo.',
};

/** Creates an account with name, email and password, and signs it in. */
export function SignUpScreen() {
  const { register } = useSession();
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<RegisterFailure | null>(null);
  const { control, handleSubmit } = useForm<SignUpForm>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  const submit = handleSubmit(async (form) => {
    setFailure(null);
    setSubmitting(true);
    const result = await register(form);
    setSubmitting(false);
    if (!result.ok) {
      setFailure(result.reason);
    }
  });

  return (
    <FormScreen>
      <ThemedText type="subtitle" style={styles.text}>
        Crear cuenta
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.text}>
        Solo necesitas un nombre, tu email y una contraseña.
      </ThemedText>

      <Controller
        control={control}
        name="name"
        render={({ field, fieldState }) => (
          <TextField
            label="Nombre"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            returnKeyType="next"
          />
        )}
      />
      <Controller
        control={control}
        name="email"
        render={({ field, fieldState }) => (
          <TextField
            label="Email"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            inputMode="email"
            textContentType="emailAddress"
            returnKeyType="next"
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field, fieldState }) => (
          <TextField
            label="Contraseña"
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
      <PrimaryButton label="Crear cuenta" loading={submitting} onPress={() => void submit()} />

      {failure && (
        <ThemedText type="small" themeColor="danger" accessibilityRole="alert" style={styles.text}>
          {failureMessages[failure]}
        </ThemedText>
      )}

      <Link href="/sign-in" accessibilityRole="link">
        <ThemedText type="small" themeColor="textSecondary">
          ¿Ya tienes cuenta? <ThemedText type="smallBold">Inicia sesión</ThemedText>
        </ThemedText>
      </Link>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  text: {
    textAlign: 'center',
  },
});
