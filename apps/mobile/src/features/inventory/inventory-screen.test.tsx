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

    expect(
      await screen.findByRole('button', { name: 'Arroz: 1,5 kg, Sin fecha' }),
    ).toBeOnTheScreen();
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

  describe('locations and dates', () => {
    // Only the date is faked: the day the screen takes as today.
    beforeEach(() => {
      jest.useFakeTimers({
        now: new Date(2026, 9, 15, 10),
        doNotFake: [
          'hrtime',
          'nextTick',
          'performance',
          'queueMicrotask',
          'requestAnimationFrame',
          'cancelAnimationFrame',
          'requestIdleCallback',
          'cancelIdleCallback',
          'setImmediate',
          'clearImmediate',
          'setInterval',
          'clearInterval',
          'setTimeout',
          'clearTimeout',
        ],
      });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    const leche = { ...arroz, id: 'ing_leche', name: 'Leche' };
    const pollo = { ...arroz, id: 'ing_pollo', name: 'Pollo' };
    const sal = { ...arroz, id: 'ing_sal', name: 'Sal' };
    const yogur = { ...arroz, id: 'ing_yogur', name: 'Yogur' };
    const kept: Inventory = {
      items: [
        {
          ...inventory.items[0],
          expiresOn: '2027-03-01',
          dateKind: 'BEST_BEFORE',
          location: 'PANTRY',
        },
        {
          id: 'item-4',
          ingredient: leche,
          quantity: 1,
          unit: 'KILOGRAM',
          expiresOn: '2026-10-16',
          dateKind: 'USE_BY',
          location: 'FRIDGE',
        },
        {
          id: 'item-5',
          ingredient: pollo,
          quantity: 1,
          unit: 'KILOGRAM',
          expiresOn: '2026-10-12',
          dateKind: 'USE_BY',
          location: 'FREEZER',
        },
        { id: 'item-6', ingredient: sal, quantity: null, unit: null, ...noStorage },
        {
          id: 'item-7',
          ingredient: yogur,
          quantity: 2,
          unit: 'PIECE',
          expiresOn: '2026-10-19',
          dateKind: 'USE_BY',
          location: 'FRIDGE',
        },
      ],
    };
    const headers = () => screen.getAllByRole('header').map((header) => header.props.children);

    it('groups the foods by location and lists first those that expire soon', async () => {
      await renderScreen(() => kept);

      await screen.findByText('Caducan pronto');
      expect(headers()).toEqual([
        'Mi despensa',
        'Caducan pronto',
        'Nevera',
        'Congelador',
        'Despensa',
        'Sin ubicación',
      ]);
      expect(
        screen.getAllByRole('button').map((button) => button.props.accessibilityLabel),
      ).toEqual([
        'Añadir alimento',
        // Expiring soon, the most urgent first; yogurt (in 4 days) is not.
        'Pollo: 1 kg, Caducó el 12 oct',
        'Leche: 1 kg, Caduca mañana',
        // Fridge
        'Leche: 1 kg, Caduca mañana',
        'Yogur: 2 unidades, Caduca el 19 oct',
        // Freezer
        'Pollo: 1 kg, Caducó el 12 oct',
        // Pantry
        'Arroz: 1,5 kg, Consumo preferente: 1 mar 2027',
        // No location
        'Sal: Siempre disponible, Sin fecha',
      ]);
    });

    it('warns to check the food before eating it', async () => {
      await renderScreen(() => kept);

      expect(
        await screen.findByText(/Revisa siempre el estado del alimento antes de consumirlo\./),
      ).toBeOnTheScreen();
    });

    it('hides the groups and the section that would be empty', async () => {
      await renderScreen(() => ({ items: [kept.items[0], kept.items[3]] }));

      await screen.findByText('Despensa');
      expect(headers()).toEqual(['Mi despensa', 'Despensa', 'Sin ubicación']);
    });
  });
});
