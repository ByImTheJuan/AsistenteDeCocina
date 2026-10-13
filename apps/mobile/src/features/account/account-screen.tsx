import { Link } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Account } from './account-api';
import { accountErrorMessage } from './account-errors';
import { useAccount, useLinkGoogle } from './use-account';

import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { requestGoogleIdToken } from '@/features/auth/google-sign-in';
import { useSession } from '@/features/auth/session-provider';

const googleFailureMessages = {
  unavailable:
    'Vincular Google no está incluido en esta versión de la app. Si usas Expo Go o una development build antigua, instala una development build actualizada.',
  'play-services':
    'Google Play Services no está disponible o necesita actualizarse en este dispositivo.',
  unknown: 'No hemos podido obtener tu cuenta de Google. Inténtalo de nuevo.',
};

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Account data, sign-in methods and the ways out: signing out and deleting. */
export function AccountScreen() {
  const { data: account, isPending, error, refetch, isRefetching } = useAccount();

  if (isPending) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator accessibilityLabel="Cargando tu cuenta" />
      </ThemedView>
    );
  }

  if (!account) {
    return (
      <ThemedView style={styles.centered}>
        <View style={styles.message}>
          <ThemedText type="subtitle" style={styles.centeredText}>
            No se ha podido cargar tu cuenta
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.centeredText}>
            {accountErrorMessage(error)}
          </ThemedText>
          <PrimaryButton label="Reintentar" loading={isRefetching} onPress={() => void refetch()} />
          <SignOutButton />
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <SafeAreaView style={styles.content}>
          <ThemedText type="subtitle">Cuenta</ThemedText>

          <Section title="Tus datos">
            <Field label="Nombre" value={account.name ?? 'Sin nombre'} />
            <Field label="Email" value={account.email} />
            <Field label="Miembro desde" value={formatDate(account.createdAt)} />
          </Section>

          <SignInMethods account={account} />

          <Section title="Sesión">
            <SignOutButton />
          </Section>

          <Section title="Eliminar cuenta">
            <ThemedText type="small" themeColor="textSecondary">
              Borra tu cuenta y todos tus datos de forma definitiva.
            </ThemedText>
            <Link href="/account/delete" accessibilityRole="link">
              <ThemedText type="smallBold" themeColor="danger">
                Eliminar mi cuenta
              </ThemedText>
            </Link>
          </Section>
        </SafeAreaView>
      </ScrollView>
    </ThemedView>
  );
}

function SignInMethods({ account }: { account: Account }) {
  const { password, google } = account.signInMethods;
  const linkGoogle = useLinkGoogle();
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  async function handleLinkGoogle() {
    setLinkError(null);
    setLinking(true);
    try {
      const result = await requestGoogleIdToken();
      if (result.type === 'success') {
        await linkGoogle.mutateAsync(result.idToken);
      } else if (result.type === 'error' && result.reason !== 'in-progress') {
        setLinkError(googleFailureMessages[result.reason]);
      }
    } catch (error) {
      setLinkError(accountErrorMessage(error));
    } finally {
      setLinking(false);
    }
  }

  return (
    <Section title="Métodos de acceso">
      <Method name="Contraseña" status={password ? 'Configurada' : 'No configurada'}>
        <ActionLink
          href="/account/password"
          label={password ? 'Cambiar contraseña' : 'Añadir contraseña'}
        />
        {password && google && (
          <ActionLink href="/account/remove-method?method=password" label="Quitar contraseña" />
        )}
      </Method>

      <Method name="Google" status={google ? 'Vinculada' : 'No vinculada'}>
        {!google && (
          <PrimaryButton
            label="Vincular Google"
            variant="secondary"
            loading={linking}
            onPress={() => void handleLinkGoogle()}
          />
        )}
        {google && password && (
          <ActionLink href="/account/remove-method?method=google" label="Desvincular Google" />
        )}
        {linkError && (
          <ThemedText type="small" themeColor="danger" accessibilityRole="alert">
            {linkError}
          </ThemedText>
        )}
      </Method>

      {password !== google && (
        <ThemedText type="small" themeColor="textSecondary">
          Tu cuenta necesita al menos un método de acceso. Para quitar este, añade antes el otro.
        </ThemedText>
      )}
    </Section>
  );
}

function SignOutButton() {
  const { signOut } = useSession();
  const [signingOut, setSigningOut] = useState(false);

  return (
    <PrimaryButton
      label="Cerrar sesión"
      variant="secondary"
      loading={signingOut}
      onPress={() => {
        setSigningOut(true);
        // On success this screen unmounts with the rest of the private area.
        void signOut();
      }}
    />
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <ThemedView type="backgroundElement" style={styles.section}>
      <ThemedText type="smallBold" accessibilityRole="header">
        {title}
      </ThemedText>
      {children}
    </ThemedView>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View accessible accessibilityLabel={`${label}: ${value}`}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText>{value}</ThemedText>
    </View>
  );
}

function Method({
  name,
  status,
  children,
}: {
  name: string;
  status: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.method}>
      <View accessible accessibilityLabel={`${name}: ${status}`} style={styles.methodHeader}>
        <ThemedText>{name}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {status}
        </ThemedText>
      </View>
      {children}
    </View>
  );
}

function ActionLink({ href, label }: { href: React.ComponentProps<typeof Link>['href']; label: string }) {
  return (
    <Link href={href} accessibilityRole="link" style={styles.actionLink}>
      <ThemedText type="smallBold">{label}</ThemedText>
    </Link>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  centeredText: {
    textAlign: 'center',
  },
  message: {
    alignSelf: 'stretch',
    gap: Spacing.three,
  },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
  },
  content: {
    alignSelf: 'stretch',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
    maxWidth: MaxContentWidth,
  },
  section: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.four,
  },
  method: {
    gap: Spacing.two,
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionLink: {
    // Comfortable touch target for a text-only action.
    paddingVertical: Spacing.two,
  },
});
