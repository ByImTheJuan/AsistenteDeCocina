import { act, fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { useState } from 'react';
import { Text } from 'react-native';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

import { SwipeDeck } from './swipe-deck';

const labels = { reject: 'No me interesa', accept: 'Ver receta' };

function Deck({ onAccept }: { onAccept(name: string): void }) {
  const [items, setItems] = useState(['Gazpacho', 'Tortilla', 'Pisto']);
  const drop = (name: string) => setItems((current) => current.filter((item) => item !== name));
  return (
    <SwipeDeck
      items={items}
      keyOf={(name) => name}
      labelOf={(name) => `Receta ${name}`}
      renderCard={(name) => <Text>{name}</Text>}
      labels={labels}
      onReject={drop}
      onAccept={(name) => {
        drop(name);
        onAccept(name);
      }}
    />
  );
}

const card = (name: string) => screen.getByLabelText(`Receta ${name}`);

// The card leaves the screen with a short animation before the decision.
async function finishAnimation() {
  await act(async () => {
    jest.advanceTimersByTime(1000);
  });
}

describe('SwipeDeck', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('shows one card at a time, with the next one hidden from screen readers', async () => {
    await render(<Deck onAccept={jest.fn()} />);

    expect(card('Gazpacho')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Receta Tortilla')).toBeNull();
    expect(screen.getByText('Tortilla', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.queryByText('Pisto', { includeHiddenElements: true })).toBeNull();
  });

  it('moves on to the next card when one is rejected', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await render(<Deck onAccept={jest.fn()} />);

    await user.press(screen.getByRole('button', { name: 'No me interesa' }));
    await finishAnimation();

    expect(card('Tortilla')).toBeOnTheScreen();
    expect(screen.queryByText('Gazpacho', { includeHiddenElements: true })).toBeNull();
  });

  it('passes on the accepted card', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const onAccept = jest.fn();
    await render(<Deck onAccept={onAccept} />);

    await user.press(screen.getByRole('button', { name: 'Ver receta' }));
    await finishAnimation();

    expect(onAccept).toHaveBeenCalledWith('Gazpacho');
  });

  it('offers both decisions as accessibility actions', async () => {
    const onAccept = jest.fn();
    await render(<Deck onAccept={onAccept} />);

    expect(card('Gazpacho').props.accessibilityActions).toEqual([
      { name: 'accept', label: 'Ver receta' },
      { name: 'reject', label: 'No me interesa' },
    ]);
    await fireEvent(card('Gazpacho'), 'accessibilityAction', { nativeEvent: { actionName: 'reject' } });
    await finishAnimation();
    await fireEvent(card('Tortilla'), 'accessibilityAction', { nativeEvent: { actionName: 'accept' } });
    await finishAnimation();

    expect(onAccept).toHaveBeenCalledWith('Tortilla');
  });

  it('decides with a long enough swipe and goes back with a short one', async () => {
    const onAccept = jest.fn();
    await render(<Deck onAccept={onAccept} />);
    const swipe = (name: string, translationX: number) =>
      act(() =>
        fireGestureHandler(getByGestureTestId(`swipe:Receta ${name}`), [
          { state: State.BEGAN, translationX: 0 },
          { state: State.ACTIVE, translationX: translationX / 2 },
          { translationX },
          { state: State.END, translationX, velocityX: 0 },
        ]),
      );

    await swipe('Gazpacho', 40);
    await finishAnimation();
    expect(card('Gazpacho')).toBeOnTheScreen();

    await swipe('Gazpacho', -300);
    await finishAnimation();
    expect(card('Tortilla')).toBeOnTheScreen();

    await swipe('Tortilla', 300);
    await finishAnimation();
    expect(onAccept).toHaveBeenCalledWith('Tortilla');
  });
});
