import { screen, userEvent, waitFor } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';

import { useSaveNutritionGoals } from './use-nutrition-goals';

import { renderSignedIn } from '@/features/account/account-test-utils';

// The shared session manager created on import is not used here.
jest.mock('@react-native-google-signin/google-signin', () => ({}));
jest.mock('expo-secure-store', () => ({}));

const goals = {
  dailyCalories: { value: 2000, enabled: true },
  mealCalories: null,
  dailyProtein: null,
};

function SaveGoals() {
  const save = useSaveNutritionGoals();
  return (
    <Pressable accessibilityRole="button" onPress={() => save.mutate(goals)}>
      <Text>Guardar</Text>
    </Pressable>
  );
}

describe('useSaveNutritionGoals', () => {
  it('asks again for the recipes, whose details are compared with the goals', async () => {
    const user = userEvent.setup();
    const { queryClient } = await renderSignedIn(<SaveGoals />, {
      'PUT /nutrition-goals': () => goals,
    });
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');

    await user.press(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['recipes'] }));
  });
});
