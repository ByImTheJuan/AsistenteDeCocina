import { screen, userEvent, within } from '@testing-library/react-native';

import { MealPlanScreen } from './meal-plan-screen';
import {
  NEXT_WEEK,
  THIS_WEEK,
  fakeToday,
  pisto,
  tuesdayLunch,
  wednesdayDinner,
} from './meal-plan-test-utils';

import { renderSignedIn } from '@/features/account/account-test-utils';
import { NetworkError } from '@/lib/api-client';

// The shared session manager created on import is not used here.
jest.mock('@react-native-google-signin/google-signin', () => ({}));
jest.mock('expo-secure-store', () => ({}));
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useRouter: () => ({ push: mockPush }),
}));

type Handler = () => unknown;

describe('MealPlanScreen', () => {
  const user = userEvent.setup();

  const renderPlan = (routes: Record<string, Handler> = {}) =>
    renderSignedIn(<MealPlanScreen />, {
      [THIS_WEEK]: () => ({ entries: [tuesdayLunch, wednesdayDinner] }),
      [NEXT_WEEK]: () => ({ entries: [] }),
      ...routes,
    });

  beforeEach(() => {
    fakeToday();
    mockPush.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows progress while the plan loads', async () => {
    await renderPlan({ [THIS_WEEK]: () => new Promise(() => {}) });

    expect(screen.getByLabelText('Cargando tu plan')).toBeOnTheScreen();
  });

  it('shows the week of today, from Monday to Sunday, with its three meals', async () => {
    await renderPlan();

    expect(await screen.findByRole('header', { name: 'Semana del 19–25 oct' })).toBeOnTheScreen();
    const days = screen
      .getAllByRole('header')
      .map((header) => header.props.children)
      .filter((text) => /^(Lunes|Martes|Miércoles|Jueves|Viernes|Sábado|Domingo) /.test(text));
    expect(days).toEqual([
      'Lunes 19 oct',
      'Martes 20 oct',
      'Miércoles 21 oct · Hoy',
      'Jueves 22 oct',
      'Viernes 23 oct',
      'Sábado 24 oct',
      'Domingo 25 oct',
    ]);
    // 7 days with 3 meals: 2 planned and 19 to fill.
    expect(screen.getAllByRole('button', { name: /: añadir receta$/ })).toHaveLength(19);
  });

  it('shows each planned recipe in its day and meal', async () => {
    await renderPlan();

    const lunch = await screen.findByRole('button', {
      name: 'Comida del martes 20 oct: Tortilla de patatas, 45 min · 320 kcal por ración',
    });
    expect(within(lunch).getByText('Tortilla de patatas')).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Desayuno del martes 20 oct: añadir receta' }),
    ).toBeOnTheScreen();
  });

  it('warns about a recipe whose allergens have to be checked', async () => {
    await renderPlan();

    const dinner = await screen.findByRole('button', {
      name: 'Cena del miércoles 21 oct: Gazpacho andaluz, 20 min, Revisa los alérgenos',
    });
    expect(within(dinner).getByText('Revisa los alérgenos')).toBeOnTheScreen();
  });

  it('warns about a recipe that now clashes with the restrictions', async () => {
    await renderPlan({
      [THIS_WEEK]: () => ({ entries: [{ ...tuesdayLunch, recipeConflicts: true }] }),
    });

    const lunch = await screen.findByRole('button', {
      name: /^Comida del martes 20 oct: Tortilla de patatas, .*, No es apta para tus alergias$/,
    });
    expect(within(lunch).getByText('No es apta para tus alergias')).toBeOnTheScreen();
  });

  it('opens a planned recipe with the week it is in', async () => {
    await renderPlan();

    await user.press(
      await screen.findByRole('button', { name: /^Comida del martes 20 oct: Tortilla/ }),
    );

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/plan/[id]',
      params: { id: 'entry-1', week: '2026-10-19' },
    });
  });

  it('opens the recipes to fill an empty meal', async () => {
    await renderPlan();

    await user.press(
      await screen.findByRole('button', { name: 'Cena del jueves 22 oct: añadir receta' }),
    );

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/plan/assign',
      params: { date: '2026-10-22', meal: 'DINNER' },
    });
  });

  it('says so when nothing is planned yet', async () => {
    await renderPlan({ [THIS_WEEK]: () => ({ entries: [] }) });

    expect(
      await screen.findByText(/Todavía no has planificado nada esta semana/),
    ).toBeOnTheScreen();
    expect(screen.getAllByRole('button', { name: /: añadir receta$/ })).toHaveLength(21);
  });

  it('moves to other weeks and back to this one', async () => {
    const test = await renderPlan({
      [NEXT_WEEK]: () => ({ entries: [{ ...tuesdayLunch, id: 'entry-3', date: '2026-10-27', recipe: pisto }] }),
    });
    await screen.findByRole('header', { name: 'Semana del 19–25 oct' });
    expect(screen.queryByRole('button', { name: 'Volver a esta semana' })).toBeNull();

    await user.press(screen.getByRole('button', { name: 'Semana siguiente' }));

    expect(
      await screen.findByRole('header', { name: 'Semana del 26 oct – 1 nov' }),
    ).toBeOnTheScreen();
    expect(
      await screen.findByRole('button', { name: /^Comida del martes 27 oct: Pisto de verduras/ }),
    ).toBeOnTheScreen();
    expect(test.sentTo(NEXT_WEEK)).toHaveLength(1);

    await user.press(screen.getByRole('button', { name: 'Volver a esta semana' }));

    expect(
      await screen.findByRole('header', { name: 'Semana del 19–25 oct' }),
    ).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Volver a esta semana' })).toBeNull();
  });

  it('goes back to the previous week', async () => {
    const lastWeek = 'GET /meal-plan?from=2026-10-12&to=2026-10-18';
    const test = await renderPlan({ [lastWeek]: () => ({ entries: [] }) });
    await screen.findByRole('header', { name: 'Semana del 19–25 oct' });

    await user.press(screen.getByRole('button', { name: 'Semana anterior' }));

    expect(
      await screen.findByRole('header', { name: 'Semana del 12–18 oct' }),
    ).toBeOnTheScreen();
    expect(test.sentTo(lastWeek)).toHaveLength(1);
  });

  it('reports a failed load and retries it', async () => {
    let fail = true;
    await renderPlan({
      [THIS_WEEK]: () => {
        if (fail) {
          throw new NetworkError();
        }
        return { entries: [tuesdayLunch] };
      },
    });

    expect(await screen.findByText('No se ha podido cargar tu plan')).toBeOnTheScreen();
    expect(screen.getByText(/Comprueba tu conexión/)).toBeOnTheScreen();

    fail = false;
    await user.press(screen.getByRole('button', { name: 'Reintentar' }));

    expect(
      await screen.findByRole('button', { name: /^Comida del martes 20 oct: Tortilla/ }),
    ).toBeOnTheScreen();
  });
});
