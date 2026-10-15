import { render, screen } from '@testing-library/react-native';

import { Badge } from './badge';

import { Colors } from '@/constants/theme';

describe('Badge', () => {
  it('shows its text over the mustard of a warning', async () => {
    await render(<Badge tone="warning">Caduca mañana</Badge>);

    expect(screen.getByText('Caduca mañana')).toHaveStyle({ color: Colors.light.onPrimary });
  });

  it('shows its text in red for a danger', async () => {
    await render(<Badge tone="danger">Caducó el 12 oct</Badge>);

    expect(screen.getByText('Caducó el 12 oct')).toHaveStyle({ color: Colors.light.error });
  });
});
