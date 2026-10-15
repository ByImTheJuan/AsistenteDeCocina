import { screen, userEvent } from '@testing-library/react-native';

import type { Inventory } from './inventory-api';
import { InventoryScreen } from './inventory-screen';

import { renderSignedIn } from '@/features/account/account-test-utils';
import { NetworkError } from '@/lib/api-client';
import type { Unit } from '@/features/units/units';

// The shared session manager created on import is not used here.
jest.mock('@react-native-google-signin/google-signin', () => ({}));
jest.mock('expo-secure-store', () => ({}));
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useRouter: () => ({ push: mockPush }),
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
  items: [
    { id: 'item-1', ingredient: arroz, quantity: 1.5, unit: 'KILOGRAM', ...noStorage },
    { id: 'item-2', ingredient: tomate, quantity: 3, unit: 'PIECE', ...noStorage },
    { id: 'item-3', ingredient: tomate, quantity: null, unit: null, ...noStorage },
  ],
};

describe('InventoryScreen', () => {
  const user = userEvent.setup();

  const renderScreen = (getInventory: () => unknown) =>
    renderSignedIn(<InventoryScreen />, { 'GET /inventory': getInventory });

  beforeEach(() => {
    mockPush.mockClear();
  });

  it('shows progress while the inventory loads', async () => {
    await renderScreen(() => new Promise(() => {}));

    expect(await screen.findByLabelText('Cargando tu despensa')).toBeOnTheScreen();
  });

  it('explains a failed load and retries', async () => {
    let attempts = 0;
    await renderScreen(() => {
      attempts += 1;
      if (attempts === 1) {
        throw new NetworkError();
      }
      return inventory;
    });

    expect(await screen.findByText('No se ha podido cargar tu despensa')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByRole('button', { name: 'Arroz: 1,5 kg, Sin fecha' })).toBeOnTheScreen();
  });

  it('invites to add the first food when it is empty', async () => {
    await renderScreen(() => ({ items: [] }));

    expect(await screen.findByText('Tu despensa está vacía')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Añadir alimento' }));

    expect(mockPush).toHaveBeenCalledWith('/inventory/new');
  });

  it('lists each food with its quantity, in the order of the API', async () => {
    await renderScreen(() => inventory);

    await screen.findByText('Mi despensa');
    expect(
      screen.getAllByRole('button').map((button) => button.props.accessibilityLabel),
    ).toEqual([
      'Añadir alimento',
      'Arroz: 1,5 kg, Sin fecha',
      'Tomate: 3 unidades, Sin fecha',
      'Tomate: Siempre disponible, Sin fecha',
    ]);
  });

  it('opens a food to change it', async () => {
    await renderScreen(() => inventory);

    await user.press(await screen.findByRole('button', { name: 'Tomate: 3 unidades, Sin fecha' }));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/inventory/[id]',
      params: { id: 'item-2' },
    });
  });

  it('adds another food', async () => {
    await renderScreen(() => inventory);

    await user.press(await screen.findByRole('button', { name: 'Añadir alimento' }));

    expect(mockPush).toHaveBeenCalledWith('/inventory/new');
  });
});
