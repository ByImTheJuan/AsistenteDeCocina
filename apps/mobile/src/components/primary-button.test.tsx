import { render, screen, userEvent } from '@testing-library/react-native';

import { PrimaryButton } from './primary-button';

describe('PrimaryButton', () => {
  const user = userEvent.setup();

  it('runs its action when pressed', async () => {
    const onPress = jest.fn();
    await render(<PrimaryButton label="Guardar" onPress={onPress} />);

    await user.press(screen.getByRole('button', { name: 'Guardar' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is announced as disabled and ignores presses', async () => {
    const onPress = jest.fn();
    await render(<PrimaryButton label="Guardar" onPress={onPress} disabled />);

    const button = screen.getByRole('button', { name: 'Guardar' });
    expect(button).toBeDisabled();
    await user.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('is announced as busy while loading and ignores presses', async () => {
    const onPress = jest.fn();
    await render(<PrimaryButton label="Guardar" onPress={onPress} loading />);

    const button = screen.getByRole('button', { name: 'Guardar' });
    expect(button).toBeBusy();
    expect(button).toBeDisabled();
    await user.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });
});
