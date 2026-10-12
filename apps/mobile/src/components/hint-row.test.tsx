import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { HintRow } from './hint-row';

describe('HintRow', () => {
  it('renders the title and the hint', async () => {
    await render(<HintRow title="Dev tools" hint={<Text>shake device</Text>} />);

    expect(screen.getByText('Dev tools')).toBeOnTheScreen();
    expect(screen.getByText('shake device')).toBeOnTheScreen();
  });

  it('falls back to the default title and hint', async () => {
    await render(<HintRow />);

    expect(screen.getByText('Try editing')).toBeOnTheScreen();
    expect(screen.getByText('app/index.tsx')).toBeOnTheScreen();
  });
});
