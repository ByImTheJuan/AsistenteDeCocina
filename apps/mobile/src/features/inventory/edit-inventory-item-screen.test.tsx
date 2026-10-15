import { screen, userEvent, waitFor } from '@testing-library/react-native';
import { act } from 'react';
import { Alert, type AlertButton } from 'react-native';

import { EditInventoryItemScreen } from './edit-inventory-item-screen';
import type { Inventory } from './inventory-api';

import { renderSignedIn } from '@/features/account/account-test-utils';
import { ApiError, NetworkError } from '@/lib/api-client';
import type { Unit } from '@/features/units/units';

// The shared session manager created on import is not used here.
jest.mock('@react-native-google-signin/google-signin', () => ({}));
jest.mock('expo-secure-store', () => ({}));
// Stable, like the router expo-router returns.
const mockRouter = { back: jest.fn() };
const mockBack = mockRouter.back;
let mockItemId = 'item-1';
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useRouter: () => mockRouter,
  useLocalSearchParams: () => ({ id: mockItemId }),
}));
// Leaving with unsaved changes is covered in the hook's own test; here only
// when the screen asks for the warning.
const mockUnsavedChangesWarning = jest.fn();
jest.mock('@/hooks/use-unsaved-changes-warning', () => ({
  useUnsavedChangesWarning: (hasUnsavedChanges: boolean) =>
    mockUnsavedChangesWarning(hasUnsavedChanges),
}));

const leche = {
  id: 'ing_leche',
  name: 'Leche',
  category: 'DAIRY_EGG',
  defaultUnit: 'LITER' as const,
  units: ['MILLILITER', 'LITER'] as Unit[],
};
const arroz = {
  id: 'ing_arroz',
  name: 'Arroz',
  category: 'GRAIN',
  defaultUnit: 'GRAM' as const,
  units: ['GRAM', 'KILOGRAM'] as Unit[],
};
const huevo = {
  id: 'ing_huevo',
  name: 'Huevo',
  category: 'DAIRY_EGG',
  defaultUnit: 'PIECE' as const,
  units: ['PIECE'] as Unit[],
};
const inventory: Inventory = {
  items: [
    { id: 'item-1', ingredient: leche, quantity: 0.5, unit: 'LITER' },
    { id: 'item-2', ingredient: arroz, quantity: null, unit: null },
    { id: 'item-3', ingredient: huevo, quantity: 6, unit: 'PIECE' },
  ],
};

type Handler = (body: unknown) => unknown;

describe('EditInventoryItemScreen', () => {
  const user = userEvent.setup();
  let alert: jest.SpyInstance;

  const renderScreen = (routes: Record<string, Handler> = {}) =>
    renderSignedIn(<EditInventoryItemScreen />, {
      'GET /inventory': () => inventory,
      // The API answers with the item it stored.
      'PUT /inventory/item-1': (body) => ({ ...inventory.items[0], ...(body as object) }),
      'DELETE /inventory/item-1': () => undefined,
      ...routes,
    });

  const quantity = () => screen.getByLabelText('Cantidad');
  const saveButton = () => screen.getByRole('button', { name: 'Guardar' });
  const unitButton = (name: string) => screen.getByRole('button', { name: `Unidad: ${name}` });
  const unitOptions = () =>
    screen.getAllByRole('radio').map((option) => option.props.accessibilityLabel);
  async function chooseUnit(from: string, to: string) {
    await user.press(unitButton(from));
    await user.press(screen.getByRole('radio', { name: to }));
  }

  async function answerDialog(text: 'Cancelar' | 'Eliminar') {
    const buttons: AlertButton[] = alert.mock.calls.at(-1)[2];
    await act(async () => {
      await buttons.find((button) => button.text === text)?.onPress?.();
    });
  }

  beforeEach(() => {
    mockItemId = 'item-1';
    mockBack.mockClear();
    mockUnsavedChangesWarning.mockClear();
    alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  });

  afterEach(() => {
    alert.mockRestore();
  });

  it('shows progress while the inventory loads', async () => {
    await renderScreen({ 'GET /inventory': () => new Promise(() => {}) });

    expect(await screen.findByLabelText('Cargando el alimento')).toBeOnTheScreen();
  });

  it('explains a failed load and retries', async () => {
    let attempts = 0;
    await renderScreen({
      'GET /inventory': () => {
        attempts += 1;
        if (attempts === 1) {
          throw new NetworkError();
        }
        return inventory;
      },
    });

    expect(await screen.findByText('No se ha podido cargar tu inventario')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('Leche')).toBeOnTheScreen();
  });

  it('says when the item is no longer in the inventory', async () => {
    mockItemId = 'item-9';
    await renderScreen();

    expect(
      await screen.findByText('Este alimento ya no está en tu inventario'),
    ).toBeOnTheScreen();
  });

  it('shows the saved quantity', async () => {
    await renderScreen();

    expect(await screen.findByText('Leche')).toBeOnTheScreen();
    expect(quantity()).toHaveDisplayValue('0,5');
    expect(unitButton('Litros')).toHaveTextContent('l');
    expect(saveButton()).toBeDisabled();
    expect(mockUnsavedChangesWarning).toHaveBeenLastCalledWith(false);
  });

  it('offers only millilitres and litres for a liquid', async () => {
    await renderScreen();
    await screen.findByText('Leche');

    await user.press(unitButton('Litros'));

    expect(unitOptions()).toEqual(['Mililitros', 'Litros']);
  });

  it('keeps the unit when the list is closed without choosing', async () => {
    await renderScreen();
    await screen.findByText('Leche');

    await user.press(unitButton('Litros'));
    await user.press(screen.getByLabelText('Cerrar sin cambiar la unidad'));

    expect(screen.queryByRole('radio')).not.toBeOnTheScreen();
    expect(unitButton('Litros')).toBeOnTheScreen();
    expect(saveButton()).toBeDisabled();
  });

  it('shows the only unit of a food that is just counted, with nothing to choose', async () => {
    mockItemId = 'item-3';
    await renderScreen();

    expect(await screen.findByText('Huevo')).toBeOnTheScreen();
    expect(screen.getByText('unidades')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /^Unidad:/ })).not.toBeOnTheScreen();
  });

  it('offers the usual unit of a food without a quantity', async () => {
    mockItemId = 'item-2';
    await renderScreen();

    expect(await screen.findByText('Arroz')).toBeOnTheScreen();
    expect(quantity()).toHaveDisplayValue('');
    expect(unitButton('Gramos')).toBeOnTheScreen();
  });

  it('saves a new quantity and goes back to the updated inventory', async () => {
    const test = await renderScreen();
    await screen.findByText('Leche');

    await user.clear(quantity());
    await user.type(quantity(), '750');
    await chooseUnit('Litros', 'Mililitros');
    expect(mockUnsavedChangesWarning).toHaveBeenLastCalledWith(true);
    await user.press(saveButton());

    await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));
    expect(test.sentTo('PUT /inventory/item-1')).toEqual([{ quantity: 750, unit: 'MILLILITER' }]);
    expect(test.queryClient.getQueryData(['inventory'])).toEqual({
      items: [
        { ...inventory.items[0], quantity: 750, unit: 'MILLILITER' },
        ...inventory.items.slice(1),
      ],
    });
    expect(mockUnsavedChangesWarning).toHaveBeenLastCalledWith(false);
  });

  it('can clear the quantity', async () => {
    const test = await renderScreen();
    await screen.findByText('Leche');

    await user.clear(quantity());
    await user.press(saveButton());

    await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));
    expect(test.sentTo('PUT /inventory/item-1')).toEqual([{ quantity: null, unit: null }]);
  });

  it('keeps the draft when saving fails', async () => {
    const test = await renderScreen({
      'PUT /inventory/item-1': () => {
        throw new NetworkError();
      },
    });
    await screen.findByText('Leche');

    await user.clear(quantity());
    await user.type(quantity(), '2');
    await user.press(saveButton());

    expect(await screen.findByText(/Tus cambios siguen aquí, sin guardar\./)).toBeOnTheScreen();
    expect(quantity()).toHaveDisplayValue('2');
    expect(mockBack).not.toHaveBeenCalled();
    expect(test.queryClient.getQueryData(['inventory'])).toEqual(inventory);
  });

  it('removes the item after confirmation', async () => {
    const test = await renderScreen();
    await screen.findByText('Leche');

    await user.press(screen.getByRole('button', { name: 'Eliminar del inventario' }));
    expect(alert.mock.calls.at(-1)[0]).toBe('¿Eliminar Leche del inventario?');
    await answerDialog('Eliminar');

    await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));
    expect(test.sentTo('DELETE /inventory/item-1')).toHaveLength(1);
    expect(test.queryClient.getQueryData(['inventory'])).toEqual({
      items: inventory.items.slice(1),
    });
    // While the screen closes it keeps showing the food, not "not found".
    expect(screen.getByText('Leche')).toBeOnTheScreen();
  });

  it('removes nothing when the user cancels', async () => {
    const test = await renderScreen();
    await screen.findByText('Leche');

    await user.press(screen.getByRole('button', { name: 'Eliminar del inventario' }));
    await answerDialog('Cancelar');

    expect(test.sentTo('DELETE /inventory/item-1')).toEqual([]);
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('explains a failed removal', async () => {
    await renderScreen({
      'DELETE /inventory/item-1': () => {
        throw new ApiError(404, 'inventory_item_not_found');
      },
    });
    await screen.findByText('Leche');

    await user.press(screen.getByRole('button', { name: 'Eliminar del inventario' }));
    await answerDialog('Eliminar');

    expect(
      await screen.findByText('Este alimento ya no está en tu inventario.'),
    ).toBeOnTheScreen();
    expect(mockBack).not.toHaveBeenCalled();
  });
});
