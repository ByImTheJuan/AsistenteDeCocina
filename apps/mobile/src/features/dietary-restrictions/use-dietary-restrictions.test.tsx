import { screen, userEvent, waitFor } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';

import { useSaveDietaryRestrictions } from './use-dietary-restrictions';

import { renderSignedIn } from '@/features/account/account-test-utils';

// The shared session manager created on import is not used here.
jest.mock('@react-native-google-signin/google-signin', () => ({}));
jest.mock('expo-secure-store', () => ({}));

function SaveEgg() {
  const save = useSaveDietaryRestrictions();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => save.mutate({ allergens: ['EGG'], ingredients: [] })}>
      <Text>Guardar</Text>
    </Pressable>
  );
}

describe('useSaveDietaryRestrictions', () => {
  it('asks again for the recipes, which depend on the restrictions', async () => {
    const user = userEvent.setup();
    const { queryClient } = await renderSignedIn(<SaveEgg />, {
      'PUT /dietary-restrictions': () => ({
        allergens: ['EGG'],
        ingredients: [],
        conflictingLikedIngredients: [],
      }),
    });
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');

    await user.press(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['recipes'] }));
  });
});
