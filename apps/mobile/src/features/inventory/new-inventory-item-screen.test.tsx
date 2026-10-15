import { screen, userEvent, waitFor } from '@testing-library/react-native';
import { act } from 'react';

import type { Inventory } from './inventory-api';
import { NewInventoryItemScreen } from './new-inventory-item-screen';

import { renderSignedIn } from '@/features/account/account-test-utils';
import { ApiError, NetworkError } from '@/lib/api-client';

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
// Leaving with unsaved changes is covered in the hook's own test; here only
// when the screen asks for the warning.
const mockUnsavedChangesWarning = jest.fn();
jest.mock('@/hooks/use-unsaved-changes-warning', () => ({
  useUnsavedChangesWarning: (hasUnsavedChanges: boolean) =>
    mockUnsavedChangesWarning(hasUnsavedChanges),
}));

const arroz = { id: 'ing_arroz', name: 'Arroz', category: 'GRAIN', defaultUnit: 'GRAM' as const };
const tomate = {
  id: 'ing_tomate',
  name: 'Tomate',
  category: 'VEGETABLE',
  defaultUnit: 'PIECE' as const,
};
const inventory: Inventory = {
  items: [{ id: 'item-1', ingredient: tomate, quantity: 3, unit: 'PIECE' }],
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

  const addButton = () => screen.getByRole('button', { name: 'Añadir al inventario' });
  const unit = (name: string) => screen.getByRole('radio', { name });

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
    expect(addButton()).toBeDisabled();
    expect(mockUnsavedChangesWarning).toHaveBeenLastCalledWith(false);
  });

  it('adds the chosen food with its quantity and unit', async () => {
    const test = await renderScreen();

    await chooseArroz();
    expect(screen.getByText('Arroz')).toBeOnTheScreen();
    // The usual unit of the food is offered first.
    expect(unit('Gramos')).toBeChecked();
    await user.type(screen.getByLabelText('Cantidad'), '1,5');
    await user.press(unit('Kilos'));
    await user.press(addButton());

    await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));
    expect(test.sentTo('POST /inventory')).toEqual([
      { ingredientId: 'ing_arroz', quantity: 1.5, unit: 'KILOGRAM' },
    ]);
    // The inventory is updated with what the API stored, in its order.
    expect(test.queryClient.getQueryData(['inventory'])).toEqual({
      items: [
        { id: 'item-2', ingredient: arroz, quantity: 1.5, unit: 'KILOGRAM' },
        inventory.items[0],
      ],
    });
  });

  it('adds a food without saying how much there is', async () => {
    const test = await renderScreen();

    await chooseArroz();
    await user.press(addButton());

    await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));
    expect(test.sentTo('POST /inventory')).toEqual([
      { ingredientId: 'ing_arroz', quantity: null, unit: null },
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
        'Tu inventario ha llegado al máximo de 500 alimentos. Elimina alguno para añadir más. ' +
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
    expect(unit('Unidades')).toBeChecked();
  });
});
