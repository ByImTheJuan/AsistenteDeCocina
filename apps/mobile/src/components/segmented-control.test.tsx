import { render, screen, userEvent } from '@testing-library/react-native';

import { SegmentedControl } from './segmented-control';

describe('SegmentedControl', () => {
  const user = userEvent.setup();
  const options = [
    { value: 'location', label: 'Ubicación' },
    { value: 'date', label: 'Fecha' },
  ] as const;

  it('marks the chosen option and offers the others', async () => {
    const onChange = jest.fn();
    await render(
      <SegmentedControl
        label="Ver por"
        options={[...options]}
        value="location"
        onChange={onChange}
      />,
    );

    expect(screen.getByRole('radio', { name: 'Ubicación' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Fecha' })).not.toBeChecked();
    expect(screen.getByText('✓ Ubicación')).toBeOnTheScreen();

    await user.press(screen.getByRole('radio', { name: 'Fecha' }));

    expect(onChange).toHaveBeenCalledWith('date');
  });
});
