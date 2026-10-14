import { fireEvent, screen, userEvent } from '@testing-library/react-native';

import type { NutritionGoals } from './nutrition-goals-api';
import { NutritionGoalsScreen } from './nutrition-goals-screen';

import { renderSignedIn } from '@/features/account/account-test-utils';
import { ApiError, NetworkError } from '@/lib/api-client';

// The shared session manager created on import is not used here.
jest.mock('@react-native-google-signin/google-signin', () => ({}));
jest.mock('expo-secure-store', () => ({}));
// Leaving with unsaved changes is covered in the hook's own test; here only
// when the screen asks for the warning.
const mockUnsavedChangesWarning = jest.fn();
jest.mock('@/hooks/use-unsaved-changes-warning', () => ({
  useUnsavedChangesWarning: (hasUnsavedChanges: boolean) =>
    mockUnsavedChangesWarning(hasUnsavedChanges),
}));

const none: NutritionGoals = { dailyCalories: null, mealCalories: null, dailyProtein: null };
const on = (value: number) => ({ value, enabled: true });
const off = (value: number) => ({ value, enabled: false });
const configured: NutritionGoals = {
  dailyCalories: on(2000),
  mealCalories: null,
  dailyProtein: off(90),
};

type Handler = (body: unknown) => unknown;

describe('NutritionGoalsScreen', () => {
  const user = userEvent.setup();

  const renderScreen = (saved: NutritionGoals, routes: Record<string, Handler> = {}) =>
    renderSignedIn(<NutritionGoalsScreen />, {
      'GET /nutrition-goals': () => saved,
      // The API answers with what it stored.
      'PUT /nutrition-goals': (body) => body,
      ...routes,
    });

  const dailyCalories = () => screen.getByLabelText('Calorías al día (kcal)');
  const mealCalories = () => screen.getByLabelText('Calorías por comida (kcal)');
  const dailyProtein = () => screen.getByLabelText('Proteínas al día (g)');
  const switchOf = (goal: string) =>
    screen.getByRole('switch', { name: `Aplicar el objetivo de ${goal}` });
  const flip = (goal: string, value: boolean) => fireEvent(switchOf(goal), 'valueChange', value);
  const saveButton = () => screen.getByRole('button', { name: 'Guardar' });
  const save = async () => {
    await user.press(saveButton());
  };

  beforeEach(() => {
    mockUnsavedChangesWarning.mockClear();
  });

  describe('loading', () => {
    it('shows progress while the goals load', async () => {
      await renderScreen(none, { 'GET /nutrition-goals': () => new Promise(() => {}) });

      expect(await screen.findByLabelText('Cargando tus objetivos')).toBeOnTheScreen();
    });

    it('explains a failed load and retries', async () => {
      let attempts = 0;
      await renderScreen(none, {
        'GET /nutrition-goals': () => {
          attempts += 1;
          if (attempts === 1) {
            throw new NetworkError();
          }
          return configured;
        },
      });

      expect(await screen.findByText(/No hemos podido conectar/)).toBeOnTheScreen();
      await user.press(screen.getByRole('button', { name: 'Reintentar' }));

      expect(await screen.findByDisplayValue('2000')).toBeOnTheScreen();
    });
  });

  describe('a user without goals', () => {
    it('offers the three goals, empty and switched off', async () => {
      await renderScreen(none);

      await screen.findByLabelText('Calorías al día (kcal)');

      for (const field of [dailyCalories(), mealCalories(), dailyProtein()]) {
        expect(field).toHaveDisplayValue('');
      }
      for (const goal of ['calorías al día', 'calorías por comida', 'proteínas al día']) {
        expect(switchOf(goal)).toBeDisabled();
        expect(switchOf(goal)).not.toBeChecked();
      }
    });

    it('has nothing to save until something changes', async () => {
      await renderScreen(none);

      await screen.findByLabelText('Calorías al día (kcal)');

      expect(saveButton()).toBeDisabled();
    });

    it('says the goals are the choice of the user, not advice', async () => {
      await renderScreen(none);

      expect(
        await screen.findByText(/no los calcula ni sustituye el consejo de un profesional/),
      ).toBeOnTheScreen();
    });
  });

  describe('setting goals', () => {
    it('shows the saved goals and whether each one is applied', async () => {
      await renderScreen(configured);

      expect(await screen.findByDisplayValue('2000')).toBe(dailyCalories());
      expect(switchOf('calorías al día')).toBeChecked();
      expect(dailyProtein()).toHaveDisplayValue('90');
      expect(switchOf('proteínas al día')).not.toBeChecked();
      expect(
        screen.getByText('Desactivado: se conserva el valor, pero no se aplica.'),
      ).toBeOnTheScreen();
    });

    it('switches a goal on when it gets a value, and saves it', async () => {
      const test = await renderScreen(none);

      await user.type(await screen.findByLabelText('Calorías al día (kcal)'), '1800');
      expect(switchOf('calorías al día')).toBeChecked();
      expect(switchOf('calorías al día')).toBeEnabled();
      await save();

      expect(await screen.findByText('Objetivos guardados.')).toBeOnTheScreen();
      expect(test.sentTo('PUT /nutrition-goals')).toEqual([{ ...none, dailyCalories: on(1800) }]);
      expect(saveButton()).toBeDisabled();
    });

    it('saves the three goals', async () => {
      const test = await renderScreen(none);

      await user.type(await screen.findByLabelText('Calorías al día (kcal)'), '2200');
      await user.type(mealCalories(), '700');
      await user.type(dailyProtein(), '110');
      await save();

      await screen.findByText('Objetivos guardados.');
      expect(test.sentTo('PUT /nutrition-goals')).toEqual([
        { dailyCalories: on(2200), mealCalories: on(700), dailyProtein: on(110) },
      ]);
    });

    it('changes the value of a goal without touching its switch', async () => {
      const test = await renderScreen(configured);

      await user.clear(await screen.findByLabelText('Proteínas al día (g)'));
      await user.type(dailyProtein(), '120');
      await save();

      await screen.findByText('Objetivos guardados.');
      expect(test.sentTo('PUT /nutrition-goals')).toEqual([
        { ...configured, dailyProtein: off(120) },
      ]);
    });

    it('switches a goal off keeping its value', async () => {
      const test = await renderScreen(configured);

      await screen.findByDisplayValue('2000');
      await flip('calorías al día', false);
      expect(dailyCalories()).toHaveDisplayValue('2000');
      await save();

      await screen.findByText('Objetivos guardados.');
      expect(test.sentTo('PUT /nutrition-goals')).toEqual([
        { ...configured, dailyCalories: off(2000) },
      ]);
    });

    it('switches a goal back on', async () => {
      const test = await renderScreen(configured);

      await screen.findByDisplayValue('90');
      await flip('proteínas al día', true);
      await save();

      await screen.findByText('Objetivos guardados.');
      expect(test.sentTo('PUT /nutrition-goals')).toEqual([
        { ...configured, dailyProtein: on(90) },
      ]);
    });

    it('keeps a goal switched off while its value is typed again', async () => {
      await renderScreen(configured);

      await user.clear(await screen.findByLabelText('Proteínas al día (g)'));
      await user.type(dailyProtein(), '75');

      expect(switchOf('proteínas al día')).not.toBeChecked();
      expect(switchOf('proteínas al día')).toBeEnabled();
    });

    it('has nothing to save after typing a value and deleting it', async () => {
      await renderScreen(none);

      await user.type(await screen.findByLabelText('Calorías por comida (kcal)'), '600');
      expect(saveButton()).toBeEnabled();
      await user.clear(mealCalories());

      expect(saveButton()).toBeDisabled();
    });

    it('removes a goal when its value is deleted', async () => {
      const test = await renderScreen(configured);

      await user.clear(await screen.findByLabelText('Calorías al día (kcal)'));
      expect(switchOf('calorías al día')).not.toBeChecked();
      expect(switchOf('calorías al día')).toBeDisabled();
      await save();

      await screen.findByText('Objetivos guardados.');
      expect(test.sentTo('PUT /nutrition-goals')).toEqual([{ ...configured, dailyCalories: null }]);
    });
  });

  describe('validation', () => {
    it('explains a value out of range and does not save it', async () => {
      const test = await renderScreen(none);

      await user.type(await screen.findByLabelText('Calorías al día (kcal)'), '120');
      await save();

      expect(await screen.findByText('Debe estar entre 500 y 10.000 kcal.')).toBeOnTheScreen();
      expect(test.sentTo('PUT /nutrition-goals')).toEqual([]);
      expect(screen.queryByText('Objetivos guardados.')).not.toBeOnTheScreen();
    });

    it('explains a value that is not a whole number', async () => {
      const test = await renderScreen(none);

      await user.type(await screen.findByLabelText('Proteínas al día (g)'), '90,5');
      await save();

      expect(await screen.findByText('Escribe un número entero, sin decimales.')).toBeOnTheScreen();
      expect(test.sentTo('PUT /nutrition-goals')).toEqual([]);
    });

    it('explains calories per meal above the daily ones, until one is switched off', async () => {
      const test = await renderScreen(configured);

      await user.type(await screen.findByLabelText('Calorías por comida (kcal)'), '2500');
      await save();

      expect(await screen.findByText('No puede superar tus calorías al día.')).toBeOnTheScreen();
      expect(test.sentTo('PUT /nutrition-goals')).toEqual([]);

      await flip('calorías por comida', false);
      await save();

      await screen.findByText('Objetivos guardados.');
      expect(test.sentTo('PUT /nutrition-goals')).toEqual([
        { ...configured, mealCalories: off(2500) },
      ]);
    });
  });

  describe('leaving the screen', () => {
    it('does not warn while nothing has changed', async () => {
      await renderScreen(configured);

      await screen.findByDisplayValue('2000');

      expect(mockUnsavedChangesWarning).toHaveBeenLastCalledWith(false);
    });

    it('warns once there is a change to lose, until it is saved', async () => {
      await renderScreen(configured);

      await screen.findByDisplayValue('2000');
      await flip('calorías al día', false);
      expect(mockUnsavedChangesWarning).toHaveBeenLastCalledWith(true);
      await save();

      await screen.findByText('Objetivos guardados.');
      expect(mockUnsavedChangesWarning).toHaveBeenLastCalledWith(false);
    });
  });

  describe('saving', () => {
    it('keeps the changes and explains it when the connection fails', async () => {
      let attempts = 0;
      const test = await renderScreen(none, {
        'PUT /nutrition-goals': (body) => {
          attempts += 1;
          if (attempts === 1) {
            throw new NetworkError();
          }
          return body;
        },
      });

      await user.type(await screen.findByLabelText('Proteínas al día (g)'), '100');
      await save();

      expect(await screen.findByRole('alert')).toHaveTextContent(
        /No hemos podido conectar.*Tus cambios siguen aquí, sin guardar\./,
      );
      expect(dailyProtein()).toHaveDisplayValue('100');
      expect(saveButton()).toBeEnabled();
      expect(mockUnsavedChangesWarning).toHaveBeenLastCalledWith(true);

      await save();

      expect(await screen.findByText('Objetivos guardados.')).toBeOnTheScreen();
      expect(screen.queryByRole('alert')).not.toBeOnTheScreen();
      expect(test.sentTo('PUT /nutrition-goals')).toHaveLength(2);
    });

    it('explains an error of the API', async () => {
      await renderScreen(none, {
        'PUT /nutrition-goals': () => {
          throw new ApiError(400, 'meal_calories_exceed_daily');
        },
      });

      await user.type(await screen.findByLabelText('Calorías por comida (kcal)'), '600');
      await save();

      expect(await screen.findByRole('alert')).toHaveTextContent(
        /no pueden superar las calorías al día/,
      );
    });

    it('stops saying it is saved once something changes again', async () => {
      await renderScreen(none);

      await user.type(await screen.findByLabelText('Proteínas al día (g)'), '100');
      await save();
      await screen.findByText('Objetivos guardados.');
      await user.type(dailyProtein(), '0');

      expect(screen.queryByText('Objetivos guardados.')).not.toBeOnTheScreen();
      expect(saveButton()).toBeEnabled();
    });
  });
});
