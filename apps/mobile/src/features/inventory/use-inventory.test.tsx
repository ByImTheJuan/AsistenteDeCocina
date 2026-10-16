import { screen, userEvent, waitFor } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';

import { useRemoveInventoryItem } from './use-inventory';

import { renderSignedIn } from '@/features/account/account-test-utils';

// The shared session manager created on import is not used here.
jest.mock('@react-native-google-signin/google-signin', () => ({}));
jest.mock('expo-secure-store', () => ({}));

function RemoveItem() {
  const remove = useRemoveInventoryItem('item-1');
  return (
    <Pressable accessibilityRole="button" onPress={() => remove.mutate()}>
      <Text>Eliminar</Text>
    </Pressable>
  );
}

describe('inventory changes', () => {
  it('ask again for the recipes against the pantry', async () => {
    const user = userEvent.setup();
    const { queryClient } = await renderSignedIn(<RemoveItem />, {
      'DELETE /inventory/item-1': () => undefined,
    });
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');

    await user.press(screen.getByRole('button', { name: 'Eliminar' }));

    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['recipes', 'pantry'] }),
    );
  });
});
