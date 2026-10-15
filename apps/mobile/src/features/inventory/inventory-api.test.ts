import {
  addInventoryItem,
  getInventory,
  removeInventoryItem,
  updateInventoryItem,
} from './inventory-api';

const arroz = {
  id: 'ing_arroz',
  name: 'Arroz',
  category: 'GRAIN',
  defaultUnit: 'GRAM',
  units: ['GRAM', 'KILOGRAM'],
};
const noStorage = { expiresOn: null, dateKind: null, location: null };
const item = {
  id: 'item-1',
  ingredient: arroz,
  quantity: 1.5,
  unit: 'KILOGRAM',
  expiresOn: '2026-10-20',
  dateKind: 'BEST_BEFORE',
  location: 'PANTRY',
};

describe('inventory API', () => {
  const request = jest.fn();

  beforeEach(() => {
    request.mockReset();
  });

  it('reads the inventory', async () => {
    const unknown = { ...item, id: 'item-2', quantity: null, unit: null, ...noStorage };
    request.mockResolvedValue({ items: [item, unknown] });

    await expect(getInventory(request)).resolves.toEqual({ items: [item, unknown] });
    expect(request).toHaveBeenCalledWith('/inventory');
  });

  it('adds a food', async () => {
    request.mockResolvedValue(item);
    const body = {
      ingredientId: 'ing_arroz',
      quantity: 1.5,
      unit: 'KILOGRAM' as const,
      expiresOn: '2026-10-20',
      dateKind: 'BEST_BEFORE' as const,
      location: 'PANTRY' as const,
    };

    await expect(addInventoryItem(request, body)).resolves.toEqual(item);
    expect(request).toHaveBeenCalledWith('/inventory', { method: 'POST', body });
  });

  it('replaces the quantity of an item', async () => {
    request.mockResolvedValue({ ...item, quantity: null, unit: null });

    await updateInventoryItem(request, 'item/1', { quantity: null, unit: null, ...noStorage });

    expect(request).toHaveBeenCalledWith('/inventory/item%2F1', {
      method: 'PUT',
      body: { quantity: null, unit: null, ...noStorage },
    });
  });

  it('removes an item', async () => {
    request.mockResolvedValue(undefined);

    await expect(removeInventoryItem(request, 'item-1')).resolves.toBeUndefined();
    expect(request).toHaveBeenCalledWith('/inventory/item-1', { method: 'DELETE' });
  });

  it('rejects an item whose date is not a calendar day', async () => {
    request.mockResolvedValue({ items: [{ ...item, expiresOn: '2026-10-20T00:00:00Z' }] });

    await expect(getInventory(request)).rejects.toThrow();
  });

  it('rejects an item with a unit it does not know', async () => {
    request.mockResolvedValue({ items: [{ ...item, unit: 'CUP' }] });

    await expect(getInventory(request)).rejects.toThrow();
  });
});
