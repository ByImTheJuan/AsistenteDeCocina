import { screen, userEvent } from '@testing-library/react-native';
import { act } from 'react';
import { Alert, type AlertButton } from 'react-native';

import { MealPlanEntryScreen } from './meal-plan-entry-screen';
import { THIS_WEEK, fakeToday, tuesdayLunch, wednesdayDinner } from './meal-plan-test-utils';

import { renderSignedIn } from '@/features/account/account-test-utils';
import { ApiError } from '@/lib/api-client';

// The shared session manager created on import is not used here.
jest.mock('@react-native-google-signin/google-signin', () => ({}));
jest.mock('expo-secure-store', () => ({}));
// Stable, like the router expo-router returns.
const mockRouter = { back: jest.fn(), push: jest.fn() };
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockParams,
}));
// The platform's calendar is native; this stand-in picks a fixed day.
jest.mock('@react-native-community/datetimepicker', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { Pressable, Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    __esModule: true,
    default: ({ onChange }: { onChange(event: unknown, date?: Date): void }) =>
      React.createElement(
        Pressable,
        {
          accessibilityRole: 'button',
          accessibilityLabel: 'Elegir el 23 de octubre de 2026',
          onPress: () => onChange({ type: 'set' }, new Date(2026, 9, 23, 12)),
        },
        React.createElement(Text, null, 'Calendario'),
      ),
    DateTimePickerAndroid: { open: jest.fn() },
  };
});
// Leaving with unsaved changes is covered in the hook's own test; here only
// when the screen asks for the warning.
const mockUnsavedChangesWarning = jest.fn();
jest.mock('@/hooks/use-unsaved-changes-warning', () => ({
  useUnsavedChangesWarning: (hasUnsavedChanges: boolean) =>
    mockUnsavedChangesWarning(hasUnsavedChanges),
}));

type Handler = (body: unknown) => unknown;

describe('MealPlanEntryScreen', () => {
  const user = userEvent.setup();
  let alert: jest.SpyInstance;

  const renderScreen = (routes: Record<string, Handler> = {}) =>
    renderSignedIn(<MealPlanEntryScreen />, {
      [THIS_WEEK]: () => ({ entries: [tuesdayLunch, wednesdayDinner] }),
      'PUT /meal-plan/entry-1': (body) => ({ ...tuesdayLunch, ...(body as object) }),
      'DELETE /meal-plan/entry-1': () => undefined,
      ...routes,
    });
  const saveButton = () => screen.getByRole('button', { name: 'Guardar' });

  async function pickDay() {
    await user.press(screen.getByRole('button', { name: 'Cambiar fecha' }));
    await user.press(screen.getByRole('button', { name: 'Elegir el 23 de octubre de 2026' }));
    await user.press(screen.getByRole('button', { name: 'Hecho' }));
  }

  async function answerDialog(text: 'Cancelar' | 'Quitar') {
    const buttons: AlertButton[] = alert.mock.calls.at(-1)[2];
    await act(async () => {
      await buttons.find((button) => button.text === text)?.onPress?.();
    });
  }

  beforeEach(() => {
    fakeToday();
    mockParams = { id: 'entry-1', week: '2026-10-19' };
    mockRouter.back.mockClear();
    mockRouter.push.mockClear();
    mockUnsavedChangesWarning.mockClear();
    alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  });

  afterEach(() => {
    alert.mockRestore();
    jest.useRealTimers();
  });

  it('shows progress while the plan loads', async () => {
    await renderScreen({ [THIS_WEEK]: () => new Promise(() => {}) });

    expect(screen.getByLabelText('Cargando tu plan')).toBeOnTheScreen();
  });

  it('shows the recipe, its day and its meal', async () => {
    await renderScreen();

    expect(
      await screen.findByRole('header', { name: 'Tortilla de patatas' }),
    ).toBeOnTheScreen();
    expect(screen.getByText('Comida del martes 20 oct')).toBeOnTheScreen();
    expect(screen.getByText('45 min · 320 kcal por ración')).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'Comida' })).toBeChecked();
    expect(saveButton()).toBeDisabled();
  });

  it('opens the recipe', async () => {
    await renderScreen();

    await user.press(await screen.findByRole('button', { name: 'Ver receta' }));

    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/plan/recipe/[id]',
      params: { id: 'rec_tortilla_patatas' },
    });
  });

  it('opens the recipes to put another one in its place', async () => {
    await renderScreen();

    await user.press(await screen.findByRole('button', { name: 'Cambiar receta' }));

    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/plan/assign',
      params: { date: '2026-10-20', meal: 'LUNCH', entryId: 'entry-1' },
    });
  });

  it('moves the recipe to another day and meal', async () => {
    const test = await renderScreen();
    await screen.findByRole('header', { name: 'Tortilla de patatas' });

    await pickDay();
    await user.press(screen.getByRole('radio', { name: 'Cena' }));
    expect(screen.getByText('Viernes 23 oct')).toBeOnTheScreen();
    expect(mockUnsavedChangesWarning).toHaveBeenLastCalledWith(true);
    await user.press(saveButton());

    expect(test.sentTo('PUT /meal-plan/entry-1')).toEqual([
      { date: '2026-10-23', meal: 'DINNER', recipeId: 'rec_tortilla_patatas' },
    ]);
    expect(mockRouter.back).toHaveBeenCalled();
    expect(mockUnsavedChangesWarning).toHaveBeenLastCalledWith(false);
  });

  it('keeps the draft when the meal already has a recipe', async () => {
    await renderScreen({
      'PUT /meal-plan/entry-1': () => {
        throw new ApiError(409, 'meal_slot_taken');
      },
    });
    await screen.findByRole('header', { name: 'Tortilla de patatas' });

    await user.press(screen.getByRole('radio', { name: 'Cena' }));
    await user.press(saveButton());

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /Ya tienes una receta en esa comida.*Tus cambios siguen aquí, sin guardar\./,
    );
    expect(screen.getByRole('radio', { name: 'Cena' })).toBeChecked();
    expect(mockRouter.back).not.toHaveBeenCalled();
    expect(mockUnsavedChangesWarning).toHaveBeenLastCalledWith(true);
  });

  it('asks before removing the recipe from the plan, and can be cancelled', async () => {
    const test = await renderScreen();

    await user.press(await screen.findByRole('button', { name: 'Quitar del plan' }));
    expect(alert.mock.calls.at(-1)[0]).toBe('¿Quitar Tortilla de patatas del plan?');
    await answerDialog('Cancelar');

    expect(test.sentTo('DELETE /meal-plan/entry-1')).toEqual([]);
    expect(mockRouter.back).not.toHaveBeenCalled();
  });

  it('removes the recipe from the plan once confirmed', async () => {
    const test = await renderScreen();

    await user.press(await screen.findByRole('button', { name: 'Quitar del plan' }));
    await answerDialog('Quitar');

    expect(test.sentTo('DELETE /meal-plan/entry-1')).toHaveLength(1);
    expect(mockRouter.back).toHaveBeenCalled();
  });

  it('warns about a recipe that now clashes with the restrictions', async () => {
    await renderScreen({
      [THIS_WEEK]: () => ({ entries: [{ ...tuesdayLunch, recipeConflicts: true }] }),
    });

    expect(await screen.findByText('No es apta para tus alergias')).toBeOnTheScreen();
    expect(screen.getByText(/Cámbiala por otra receta o quítala del plan/)).toBeOnTheScreen();
  });

  it('says so when the entry is no longer in the plan', async () => {
    mockParams = { id: 'entry-9', week: '2026-10-19' };
    await renderScreen();

    expect(await screen.findByText('Esta receta ya no está en tu plan')).toBeOnTheScreen();
  });
});
