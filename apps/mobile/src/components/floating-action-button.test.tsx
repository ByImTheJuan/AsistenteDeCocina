import { render, screen, userEvent } from '@testing-library/react-native';

import { FloatingActionButton, FloatingActionButtonSize } from './floating-action-button';

// In the app the tabs provide the safe area; here, the library's stand-in.
jest.mock('react-native-safe-area-context', () =>
  jest.requireActual('react-native-safe-area-context/jest/mock').default,
);

describe('FloatingActionButton', () => {
  const user = userEvent.setup();

  it('is a round button named by its label, at least 44 pt wide', async () => {
    const onPress = jest.fn();
    await render(
      <FloatingActionButton
        label="Añadir alimento"
        icon={{ ios: 'plus', android: 'add', web: 'add' }}
        onPress={onPress}
      />,
    );

    const button = screen.getByRole('button', { name: 'Añadir alimento' });
    expect(FloatingActionButtonSize).toBeGreaterThanOrEqual(44);
    await user.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
