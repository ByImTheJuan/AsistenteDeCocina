import { screen, userEvent, waitFor } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';

import { useSaveFoodPreferences } from './use-food-preferences';

import { renderSignedIn } from '@/features/account/account-test-utils';

// The shared session manager created on import is not used here.
jest.mock('@react-native-google-signin/google-signin', () => ({}));
jest.mock('expo-secure-store', () => ({}));

const preferences = { diet: 'VEGAN' as const, liked: [], avoided: [] };

function SavePreferences() {
  const save = useSaveFoodPreferences();
  return (
    <Pressable accessibilityRole="button" onPress={() => save.mutate(preferences)}>
      <Text>Guardar</Text>
    </Pressable>
  );
}

describe('saving the food preferences', () => {
  it('asks again for the recommendations, which follow the diet and the tastes', async () => {
    const user = userEvent.setup();
    const { queryClient } = await renderSignedIn(<SavePreferences />, {
      'PUT /food-preferences': () => preferences,
    });
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');

    await user.press(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['recipes', 'recommendations'] }),
    );
  });
});
