import { screen, userEvent } from '@testing-library/react-native';
import { useState } from 'react';
import { Text } from 'react-native';

import { describeFilters, type RecipeFilters } from './recipe-filters';
import { RecipeFiltersProvider, useRecipeFilters } from './recipe-filters-context';
import { RecipeFiltersScreen } from './recipe-filters-screen';

import { renderSignedIn } from '@/features/account/account-test-utils';

// The shared session manager created on import is not used here.
jest.mock('@react-native-google-signin/google-signin', () => ({}));
jest.mock('expo-secure-store', () => ({}));
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useRouter: () => ({ back: mockBack }),
}));

const noGoals = { dailyCalories: null, mealCalories: null, dailyProtein: null };

// What the list would use: the filters applied in the shared state.
function Applied() {
  const { filters } = useRecipeFilters();
  return <Text testID="applied">{describeFilters(filters) || 'Sin filtros'}</Text>;
}

// Opens the screen as the list does, after the filters already in use.
function Harness({ initial }: { initial?: RecipeFilters }) {
  const { setFilters } = useRecipeFilters();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Text
        accessibilityRole="button"
        onPress={() => {
          if (initial) setFilters(initial);
          setOpen(true);
        }}>
        Abrir filtros
      </Text>
      <Applied />
      {open && <RecipeFiltersScreen />}
    </>
  );
}

async function renderScreen(goals: object = noGoals, initial?: RecipeFilters) {
  const user = userEvent.setup();
  await renderSignedIn(
    <RecipeFiltersProvider>
      <Harness initial={initial} />
    </RecipeFiltersProvider>,
    { 'GET /nutrition-goals': () => goals },
  );
  await user.press(screen.getByRole('button', { name: 'Abrir filtros' }));
  return user;
}

const choose = (user: ReturnType<typeof userEvent.setup>, option: string) =>
  user.press(screen.getByRole('radio', { name: option }));

describe('RecipeFiltersScreen', () => {
  beforeEach(() => mockBack.mockClear());

  it('applies the chosen filters together and goes back to the list', async () => {
    const user = await renderScreen();

    await choose(user, 'Hasta 30 min');
    await choose(user, 'Hasta 500 kcal');
    await choose(user, 'Vegana');
    await choose(user, 'Menos tiempo');
    expect(screen.getByTestId('applied')).toHaveTextContent('Sin filtros');
    await user.press(screen.getByRole('button', { name: 'Ver resultados' }));

    expect(screen.getByTestId('applied')).toHaveTextContent(
      'Hasta 30 min · Hasta 500 kcal · Vegana · Menos tiempo',
    );
    expect(mockBack).toHaveBeenCalled();
  });

  it('starts from the filters in use and clears them', async () => {
    const user = await renderScreen(noGoals, {
      maxMinutes: 15,
      maxCalories: null,
      diet: 'VEGETARIAN',
      sort: 'NAME',
    });

    expect(screen.getByRole('radio', { name: 'Hasta 15 min', checked: true })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Vegetariana', checked: true })).toBeTruthy();
    await user.press(screen.getByRole('button', { name: 'Quitar filtros' }));

    const checked = screen
      .getAllByRole('radio', { checked: true })
      .map((radio) => radio.props.accessibilityLabel);
    expect(checked).toEqual(['Cualquiera', 'Cualquiera', 'Cualquiera', 'Nombre']);
    await user.press(screen.getByRole('button', { name: 'Ver resultados' }));
    expect(screen.getByTestId('applied')).toHaveTextContent('Sin filtros');
  });

  it('offers the goal per meal as a limit only while it is on', async () => {
    await renderScreen({ ...noGoals, mealCalories: { value: 600, enabled: true } });

    expect(
      await screen.findByRole('radio', { name: 'Mi objetivo por comida (600 kcal)' }),
    ).toBeOnTheScreen();
  });

  it('does not offer a goal per meal that is switched off', async () => {
    await renderScreen({ ...noGoals, mealCalories: { value: 600, enabled: false } });

    await screen.findByRole('radio', { name: 'Hasta 700 kcal' });
    expect(screen.queryByRole('radio', { name: /Mi objetivo/ })).toBeNull();
  });

  it('warns that recipes without calorie data are left out by a limit', async () => {
    await renderScreen();

    expect(
      screen.getByText(/no se muestran las recetas sin datos suficientes para calcularlas/),
    ).toBeOnTheScreen();
  });
});
