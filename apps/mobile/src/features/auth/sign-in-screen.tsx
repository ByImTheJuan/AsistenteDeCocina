import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { FormScreen } from '@/components/form-screen';
import { signInSchema, type SignInForm } from './credentials-schema';
import { PrimaryButton } from '@/components/primary-button';
import type { PasswordSignInFailure, SignInFailure } from './session-manager';
import { useSession } from './session-provider';
import { TextField } from '@/components/text-field';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

type Failure = SignInFailure | PasswordSignInFailure;

const failureMessages: Record<Failure, string> = {
  'invalid-credentials': 'El email o la contraseña no son correctos.',
  'rate-limited': 'Has hecho demasiados intentos. Espera un minuto y vuelve a intentarlo.',
  cancelled: 'Has cancelado el inicio de sesión. Puedes intentarlo de nuevo cuando quieras.',
  unavailable:
    'El inicio de sesión con Google no está incluido en esta versión de la app. Si usas Expo Go o una development build antigua, instala una development build actualizada.',
  'play-services':
    'Google Play Services no está disponible o necesita actualizarse en este dispositivo.',
  network: 'No hemos podido conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.',
  rejected: 'No hemos podido verificar tu cuenta de Google. Inténtalo de nuevo.',
  unknown: 'Ha ocurrido un error inesperado al iniciar sesión. Inténtalo de nuevo.',
};

/**
 * Entry screen for anyone without an active session. It also covers the two
 * moments before that is known: recovering a saved session and failing to
 * reach the API while doing so.
 */
export function SignInScreen() {
  const { session, signIn, signInWithPassword, retry } = useSession();
  const [pending, setPending] = useState<'password' | 'google' | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const { control, handleSubmit } = useForm<SignInForm>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  async function run(
    method: 'password' | 'google',
    attempt: () => Promise<{ ok: true } | { ok: false; reason: Failure }>,
  ) {
    setFailure(null);
    setPending(method);
    const result = await attempt();
    setPending(null);
    if (!result.ok) {
      setFailure(result.reason);
    }
  }

  const submitPassword = handleSubmit(({ email, password }) =>
    run('password', () => signInWithPassword(email, password)),
  );

  if (session.status === 'loading') {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator accessibilityLabel="Recuperando tu sesión" />
      </ThemedView>
    );
  }

  if (session.status === 'unavailable') {
    return (
      <FormScreen>
        <ThemedText type="title" style={styles.text}>
          Sin conexión
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.text}>
          No hemos podido conectar con el servidor para recuperar tu sesión.
        </ThemedText>
        <PrimaryButton label="Reintentar" onPress={() => void retry()} />
      </FormScreen>
    );
  }

  return (
    <FormScreen>
      <ThemedText type="title" style={styles.text}>
        Asistente de Cocina
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.text}>
        Inicia sesión para guardar tus preferencias, tu despensa y tus recetas.
      </ThemedText>

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
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="done"
            onSubmitEditing={() => void submitPassword()}
          />
        )}
      />
      <PrimaryButton
        label="Iniciar sesión"
        loading={pending === 'password'}
        disabled={pending !== null}
        onPress={() => void submitPassword()}
      />

      {failure && (
        <ThemedText type="small" themeColor="error" accessibilityRole="alert" style={styles.text}>
          {failureMessages[failure]}
        </ThemedText>
      )}

      <ThemedText type="small" themeColor="textSecondary">
        o
      </ThemedText>
      <PrimaryButton
        label="Continuar con Google"
        variant="secondary"
        loading={pending === 'google'}
        disabled={pending !== null}
        onPress={() => void run('google', signIn)}
      />

      <Link href="/sign-up" accessibilityRole="link">
        <ThemedText type="small" themeColor="textSecondary">
          ¿No tienes cuenta? <ThemedText type="smallBold">Crear cuenta</ThemedText>
        </ThemedText>
      </Link>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    textAlign: 'center',
  },
});
