import { render, screen } from '@testing-library/react-native';

import { Notice } from './notice';

describe('Notice', () => {
  it('announces errors and states them in words, not only in red', async () => {
    await render(<Notice tone="error">No se han podido guardar los cambios.</Notice>);

    expect(screen.getByRole('alert')).toHaveTextContent('No se han podido guardar los cambios.');
    expect(screen.getByText('⚠', { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('shows confirmations with a check and without interrupting', async () => {
    await render(<Notice tone="success">Cambios guardados.</Notice>);

    expect(screen.getByText('Cambios guardados.')).toBeOnTheScreen();
    expect(screen.getByText('✓', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.queryByRole('alert')).not.toBeOnTheScreen();
  });

  it('shows the title of a warning above its content', async () => {
    await render(
      <Notice tone="warning" title="Conflicto con tus preferencias">
        Ajo está en «Me gustan».
      </Notice>,
    );

    expect(screen.getByText('Conflicto con tus preferencias')).toBeOnTheScreen();
    expect(screen.getByText('Ajo está en «Me gustan».')).toBeOnTheScreen();
  });
});
