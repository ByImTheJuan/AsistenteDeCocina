import { render } from '@testing-library/react-native';
import { Alert, type AlertButton } from 'react-native';

import { useUnsavedChangesWarning } from './use-unsaved-changes-warning';

type Prevented = { data: { action: { type: string } } };

const mockDispatch = jest.fn();
const mockUsePreventRemove = jest.fn<void, [boolean, (prevented: Prevented) => void]>();
jest.mock('expo-router', () => ({ useNavigation: () => ({ dispatch: mockDispatch }) }));
jest.mock('expo-router/react-navigation', () => ({
  usePreventRemove: (...args: [boolean, (prevented: Prevented) => void]) =>
    mockUsePreventRemove(...args),
}));

function Form({ dirty }: { dirty: boolean }) {
  useUnsavedChangesWarning(dirty);
  return null;
}

describe('useUnsavedChangesWarning', () => {
  const goBack = { type: 'GO_BACK' };
  let alert: jest.SpyInstance;

  beforeEach(() => {
    mockDispatch.mockClear();
    mockUsePreventRemove.mockClear();
    alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  });

  afterEach(() => {
    alert.mockRestore();
  });

  /** Simulates the navigator stopping an attempt to leave the screen. */
  const tryToLeave = () =>
    mockUsePreventRemove.mock.calls.at(-1)?.[1]({ data: { action: goBack } });
  const dialogButton = (text: string): AlertButton =>
    alert.mock.calls.at(-1)[2].find((button: AlertButton) => button.text === text);

  it('lets the screen go while there is nothing to lose', async () => {
    await render(<Form dirty={false} />);

    expect(mockUsePreventRemove).toHaveBeenLastCalledWith(false, expect.any(Function));
  });

  it('holds the screen while there are unsaved changes', async () => {
    await render(<Form dirty />);

    expect(mockUsePreventRemove).toHaveBeenLastCalledWith(true, expect.any(Function));
  });

  it('asks before leaving, without leaving yet', async () => {
    await render(<Form dirty />);

    tryToLeave();

    expect(alert).toHaveBeenCalledWith(
      '¿Salir sin guardar?',
      'Tienes cambios sin guardar. Si sales ahora, se perderán.',
      expect.any(Array),
    );
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('stays when the user chooses to keep editing', async () => {
    await render(<Form dirty />);
    tryToLeave();

    const keepEditing = dialogButton('Seguir editando');
    keepEditing.onPress?.();

    expect(keepEditing.style).toBe('cancel');
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('leaves the way it was going when the user discards the changes', async () => {
    await render(<Form dirty />);
    tryToLeave();

    dialogButton('Salir sin guardar').onPress?.();

    expect(mockDispatch).toHaveBeenCalledWith(goBack);
  });
});
