import { render, screen, userEvent } from '@testing-library/react-native';

import { ScreenState } from './screen-state';

describe('ScreenState', () => {
  const user = userEvent.setup();

  it('labels the loading indicator for screen readers', async () => {
    await render(<ScreenState kind="loading" label="Cargando tus preferencias" />);

    expect(screen.getByLabelText('Cargando tus preferencias')).toBeOnTheScreen();
  });

  it('explains an error and retries on request', async () => {
    const onRetry = jest.fn();
    await render(
      <ScreenState
        kind="error"
        title="No se han podido cargar tus preferencias"
        message="Comprueba tu conexión."
        onRetry={onRetry}
      />,
    );

    expect(screen.getByText('No se han podido cargar tus preferencias')).toBeOnTheScreen();
    expect(screen.getByText('Comprueba tu conexión.')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('keeps the retry button busy while retrying', async () => {
    await render(
      <ScreenState kind="error" title="Error" message="" onRetry={jest.fn()} retrying />,
    );

    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeBusy();
  });

  it('shows an empty state without actions', async () => {
    await render(<ScreenState kind="empty" title="Todavía no hay nada aquí" />);

    expect(screen.getByText('Todavía no hay nada aquí')).toBeOnTheScreen();
    expect(screen.queryByRole('button')).not.toBeOnTheScreen();
  });

  it('offers the way out of an empty state', async () => {
    const onPress = jest.fn();
    await render(
      <ScreenState
        kind="empty"
        title="Tu despensa está vacía"
        action={{ label: 'Añadir alimento', onPress }}
      />,
    );

    await user.press(screen.getByRole('button', { name: 'Añadir alimento' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
