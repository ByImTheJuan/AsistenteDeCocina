import { render, screen } from '@testing-library/react-native';

import { ThemedText } from './themed-text';
import { TextField } from './text-field';

describe('TextField', () => {
  it('is labelled by its label', async () => {
    await render(<TextField label="Email" />);

    expect(screen.getByLabelText('Email')).toBeOnTheScreen();
  });

  it('shows the validation error as text and marks the input invalid', async () => {
    await render(<TextField label="Email" error="Escribe un email válido." />);

    expect(screen.getByRole('alert')).toHaveTextContent('Escribe un email válido.');
    expect(screen.getByLabelText('Email')).toHaveProp('aria-invalid', true);
  });

  it('shows no error while the value is valid', async () => {
    await render(<TextField label="Email" />);

    expect(screen.queryByRole('alert')).not.toBeOnTheScreen();
    expect(screen.getByLabelText('Email')).toHaveProp('aria-invalid', false);
  });

  it('shows what follows the text inside the field', async () => {
    await render(<TextField label="Cantidad" value="2" trailing={<ThemedText>kg</ThemedText>} />);

    expect(screen.getByLabelText('Cantidad')).toHaveDisplayValue('2');
    expect(screen.getByText('kg')).toBeOnTheScreen();
  });
});
