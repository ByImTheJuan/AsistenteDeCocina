import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useTheme } from '@/hooks/use-theme';

export default function AppTabs() {
  const colors = useTheme();

  return (
    <NativeTabs
      backgroundColor={colors.surface}
      indicatorColor={colors.primary}
      iconColor={{ default: colors.textSecondary, selected: colors.textPrimary }}
      labelStyle={{
        default: { color: colors.textSecondary },
        selected: { color: colors.textPrimary },
      }}>
      <NativeTabs.Trigger name="(for-you)">
        <NativeTabs.Trigger.Label>Para ti</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="sparkles" md="auto_awesome" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="recipes">
        <NativeTabs.Trigger.Label>Recetas</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="book" md="menu_book" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="inventory">
        <NativeTabs.Trigger.Label>Mi despensa</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="refrigerator" md="kitchen" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Perfil</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="fork.knife" md="restaurant" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="account">
        <NativeTabs.Trigger.Label>Cuenta</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.crop.circle" md="account_circle" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
