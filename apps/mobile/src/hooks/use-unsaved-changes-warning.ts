import { useNavigation } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { Alert } from 'react-native';

/**
 * While `hasUnsavedChanges` is true, leaving the screen (back button, header
 * arrow or swipe) asks first, so a form is not lost by accident. Changing tabs
 * keeps the screen and its draft, so it does not ask.
 */
export function useUnsavedChangesWarning(hasUnsavedChanges: boolean) {
  const navigation = useNavigation();

  usePreventRemove(hasUnsavedChanges, ({ data }) => {
    Alert.alert('¿Salir sin guardar?', 'Tienes cambios sin guardar. Si sales ahora, se perderán.', [
      { text: 'Seguir editando', style: 'cancel' },
      {
        text: 'Salir sin guardar',
        style: 'destructive',
        // Repeats the navigation that was stopped.
        onPress: () => navigation.dispatch(data.action),
      },
    ]);
  });
}
