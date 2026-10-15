import { screen, userEvent, waitFor } from '@testing-library/react-native';
import { act } from 'react';

import type { Inventory } from './inventory-api';
import { NewInventoryItemScreen } from './new-inventory-item-screen';

import { renderSignedIn } from '@/features/account/account-test-utils';
import { ApiError, NetworkError } from '@/lib/api-client';
import type { Unit } from '@/features/units/units';

// The shared session manager created on import is not used here.
jest.mock('@react-native-google-signin/google-signin', () => ({}));
jest.mock('expo-secure-store', () => ({}));
// Stable, like the router expo-router returns.
const mockRouter = { back: jest.fn() };
const mockBack = mockRouter.back;
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useRouter: () => mockRouter,
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
          accessibilityLabel: 'Elegir el 20 de octubre de 2026',
          onPress: () => onChange({ type: 'set' }, new Date(2026, 9, 20, 12)),
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

const arroz = {
  id: 'ing_arroz',
  name: 'Arroz',
  category: 'GRAIN',
  defaultUnit: 'GRAM' as const,
  units: ['GRAM', 'KILOGRAM'] as Unit[],
};
const tomate = {
  id: 'ing_tomate',
  name: 'Tomate',
  category: 'VEGETABLE',
  defaultUnit: 'PIECE' as const,
  units: ['PIECE', 'GRAM', 'KILOGRAM'] as Unit[],
};
const noStorage = { expiresOn: null, dateKind: null, location: null };
const inventory: Inventory = {
  items: [{ id: 'item-1', ingredient: tomate, quantity: 3, unit: 'PIECE', ...noStorage }],
};

type Handler = (body: unknown) => unknown;

describe('NewInventoryItemScreen', () => {
  const user = userEvent.setup();

  async function renderScreen(routes: Record<string, Handler> = {}) {
    const test = await renderSignedIn(<NewInventoryItemScreen />, {
      'GET /ingredients': () => [arroz, tomate],
      'GET /ingredients?search=arroz': () => [arroz],
      // The API answers with the item it stored.
      'POST /inventory': (body) => ({ id: 'item-2', ingredient: arroz, ...(body as object) }),
      ...routes,
    });
    // The inventory list was loaded before opening this screen.
    act(() => test.queryClient.setQueryData(['inventory'], inventory));
    return test;
  }

  const addButton = () => screen.getByRole('button', { name: 'Añadir a la despensa' });
  const unitButton = (name: string) => screen.getByRole('button', { name: `Unidad: ${name}` });
  // The unit list opens over the form, which has its own options too.
  const unitNames = ['Unidades', 'Gramos', 'Kilos', 'Mililitros', 'Litros'];
  const unitOptions = () =>
    screen
      .getAllByRole('radio')
      .map((option) => option.props.accessibilityLabel)
      .filter((label) => unitNames.includes(label));
  async function chooseUnit(from: string, to: string) {
    await user.press(unitButton(from));
    await user.press(screen.getByRole('radio', { name: to }));
  }

  async function chooseArroz() {
    await user.press(screen.getByRole('button', { name: 'Elegir alimento' }));
    await user.type(screen.getByLabelText('Buscar alimento'), 'arroz');
    // The whole catalogue stays listed until the search answers.
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Tomate' })).not.toBeOnTheScreen(),
    );
    await user.press(screen.getByRole('button', { name: 'Arroz' }));
  }

  beforeEach(() => {
    mockBack.mockClear();
    mockUnsavedChangesWarning.mockClear();
  });

  it('cannot add anything until a food is chosen', async () => {
    await renderScreen();

    expect(screen.getByText('Todavía no has elegido ninguno.')).toBeOnTheScreen();
    // The units depend on the food, so there is no quantity to fill in yet.
    expect(screen.queryByLabelText('Cantidad')).not.toBeOnTheScreen();
    expect(addButton()).toBeDisabled();
    expect(mockUnsavedChangesWarning).toHaveBeenLastCalledWith(false);
  });

  it('adds the chosen food with its quantity and unit', async () => {
    const test = await renderScreen();

    await chooseArroz();
    expect(screen.getByText('Arroz')).toBeOnTheScreen();
    // The usual unit of the food is offered first.
    expect(unitButton('Gramos')).toBeOnTheScreen();
    await user.type(screen.getByLabelText('Cantidad'), '1,5');
    await chooseUnit('Gramos', 'Kilos');
    // Number and unit read together in the field.
    expect(screen.getByLabelText('Cantidad')).toHaveDisplayValue('1,5');
    expect(unitButton('Kilos')).toHaveTextContent('kg');
    await user.press(addButton());

    await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));
    expect(test.sentTo('POST /inventory')).toEqual([
      { ingredientId: 'ing_arroz', quantity: 1.5, unit: 'KILOGRAM', ...noStorage },
    ]);
    // The inventory is updated with what the API stored, in its order.
    expect(test.queryClient.getQueryData(['inventory'])).toEqual({
      items: [
        { id: 'item-2', ingredient: arroz, quantity: 1.5, unit: 'KILOGRAM', ...noStorage },
        inventory.items[0],
      ],
    });
  });

  it('offers only the units the food is measured in', async () => {
    await renderScreen();

    await chooseArroz();
    await user.press(unitButton('Gramos'));

    expect(unitOptions()).toEqual(['Gramos', 'Kilos']);
    expect(screen.getByRole('radio', { name: 'Gramos' })).toBeChecked();
  });

  it('explains what an empty quantity means', async () => {
    await renderScreen();

    await chooseArroz();

    expect(
      screen.getByText(
        'Déjala vacía para indicar que este alimento siempre estará disponible en tu cocina.',
      ),
    ).toBeOnTheScreen();
  });

  it('adds a food that is always available, without a quantity', async () => {
    const test = await renderScreen();

    await chooseArroz();
    await user.press(addButton());

    await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));
    expect(test.sentTo('POST /inventory')).toEqual([
      { ingredientId: 'ing_arroz', quantity: null, unit: null, ...noStorage },
    ]);
  });

  it('checks the quantity before sending it', async () => {
    const test = await renderScreen();

    await chooseArroz();
    await user.type(screen.getByLabelText('Cantidad'), '1,2345');
    await user.press(addButton());

    expect(
      await screen.findByText('Escribe un número, con hasta tres decimales.'),
    ).toBeOnTheScreen();
    expect(test.sentTo('POST /inventory')).toEqual([]);
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('keeps the draft and explains why the food could not be added', async () => {
    const test = await renderScreen({
      'POST /inventory': () => {
        throw new ApiError(409, 'inventory_full');
      },
    });

    await chooseArroz();
    await user.press(addButton());

    expect(
      await screen.findByText(
        'Tu despensa ha llegado al máximo de 500 alimentos. Elimina alguno para añadir más. ' +
          'Tus cambios siguen aquí, sin guardar.',
      ),
    ).toBeOnTheScreen();
    expect(mockBack).not.toHaveBeenCalled();
    expect(test.queryClient.getQueryData(['inventory'])).toEqual(inventory);
  });

  it('can try again after a network error', async () => {
    let attempts = 0;
    const test = await renderScreen({
      'POST /inventory': (body) => {
        attempts += 1;
        if (attempts === 1) {
          throw new NetworkError();
        }
        return { id: 'item-2', ingredient: arroz, ...(body as object) };
      },
    });

    await chooseArroz();
    await user.press(addButton());
    await screen.findByText(/Tus cambios siguen aquí/);
    await user.press(addButton());

    await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));
    expect(test.sentTo('POST /inventory')).toHaveLength(2);
  });

  it('warns before leaving once a food is chosen', async () => {
    await renderScreen();

    await chooseArroz();

    expect(mockUnsavedChangesWarning).toHaveBeenLastCalledWith(true);
  });

  it('closes the search without choosing', async () => {
    await renderScreen();

    await user.press(screen.getByRole('button', { name: 'Elegir alimento' }));
    await user.press(await screen.findByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByLabelText('Buscar alimento')).not.toBeOnTheScreen();
    expect(addButton()).toBeDisabled();
  });

  it('lets the user change the chosen food', async () => {
    await renderScreen();

    await chooseArroz();
    await user.press(screen.getByRole('button', { name: 'Cambiar alimento' }));
    await user.press(await screen.findByRole('button', { name: 'Tomate' }));

    expect(screen.getByText('Tomate')).toBeOnTheScreen();
    expect(unitButton('Unidades')).toBeOnTheScreen();
  });

  describe('where it is kept and its date', () => {
    const radio = (name: string) => screen.getByRole('radio', { name });

    async function chooseDate() {
      await user.press(screen.getByRole('button', { name: 'Añadir fecha' }));
      await user.press(screen.getByRole('button', { name: 'Elegir el 20 de octubre de 2026' }));
      await user.press(screen.getByRole('button', { name: 'Hecho' }));
    }

    it('starts without location or date', async () => {
      await renderScreen();

      await chooseArroz();

      expect(radio('Sin indicar')).toBeChecked();
      expect(screen.getByText('Sin fecha')).toBeOnTheScreen();
      expect(screen.queryByRole('radio', { name: 'Caducidad' })).not.toBeOnTheScreen();
    });

    it('adds the food with its location, date and kind of date', async () => {
      const test = await renderScreen();

      await chooseArroz();
      await user.press(radio('Nevera'));
      await chooseDate();
      expect(screen.getByText('20 oct 2026')).toBeOnTheScreen();
      // A date is use-by unless the user says otherwise.
      expect(radio('Caducidad')).toBeChecked();
      await user.press(radio('Consumo preferente'));
      await user.press(addButton());

      await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));
      expect(test.sentTo('POST /inventory')).toEqual([
        {
          ingredientId: 'ing_arroz',
          quantity: null,
          unit: null,
          expiresOn: '2026-10-20',
          dateKind: 'BEST_BEFORE',
          location: 'FRIDGE',
        },
      ]);
    });

    it('removes the date, and its kind with it', async () => {
      const test = await renderScreen();

      await chooseArroz();
      await chooseDate();
      await user.press(screen.getByRole('button', { name: 'Quitar fecha' }));

      expect(screen.getByText('Sin fecha')).toBeOnTheScreen();
      expect(screen.queryByRole('radio', { name: 'Caducidad' })).not.toBeOnTheScreen();
      await user.press(addButton());
      await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));
      expect(test.sentTo('POST /inventory')[0]).toMatchObject({ expiresOn: null, dateKind: null });
    });

    it('keeps no date when the calendar is closed without choosing', async () => {
      await renderScreen();

      await chooseArroz();
      await user.press(screen.getByRole('button', { name: 'Añadir fecha' }));
      await user.press(screen.getByRole('button', { name: 'Cancelar' }));

      expect(screen.getByText('Sin fecha')).toBeOnTheScreen();
    });
  });
});
