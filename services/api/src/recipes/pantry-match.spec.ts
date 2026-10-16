import type { ExpiryKind, Unit } from '../generated/prisma/client.js';
import {
  pantryMatch,
  type PantryItem,
  type PantryRecipeLine,
} from './pantry-match.js';

const n = (value: number) => ({ toNumber: () => value });

const TODAY = '2026-10-16';

function line(
  id: string,
  quantity: number | null,
  unit: Unit | null,
): PantryRecipeLine {
  return {
    quantity: quantity === null ? null : n(quantity),
    unit,
    ingredient: { id, name: id },
  };
}

function item(
  ingredientId: string,
  quantity: number | null,
  unit: Unit | null,
  date?: { on: string; kind: ExpiryKind },
): PantryItem {
  return {
    ingredientId,
    quantity: quantity === null ? null : n(quantity),
    unit,
    expiresOn: date ? new Date(`${date.on}T00:00:00Z`) : null,
    dateKind: date?.kind ?? null,
  };
}

const names = (list: { id: string }[]) => list.map(({ id }) => id);

describe('pantryMatch', () => {
  it('can prepare a recipe when there is enough of everything', () => {
    const match = pantryMatch(
      [line('arroz', 300, 'GRAM'), line('huevo', 4, 'PIECE')],
      [item('arroz', 1, 'KILOGRAM'), item('huevo', 6, 'PIECE')],
      TODAY,
    );

    expect(match.canPrepare).toBe(true);
    expect(match.missing).toEqual([]);
    expect(match.using.map(({ ingredient }) => ingredient.id)).toEqual([
      'arroz',
      'huevo',
    ]);
  });

  it('lists what is missing with what the recipe asks for', () => {
    const match = pantryMatch(
      [line('arroz', 300, 'GRAM'), line('chorizo', 100, 'GRAM')],
      [item('arroz', 500, 'GRAM')],
      TODAY,
    );

    expect(match.canPrepare).toBe(false);
    expect(match.missing).toEqual([
      {
        ingredient: { id: 'chorizo', name: 'chorizo' },
        needed: { quantity: 100, unit: 'GRAM' },
        have: null,
        expired: false,
      },
    ]);
  });

  it('adds up the items of a food and says how much there is when it is not enough', () => {
    const match = pantryMatch(
      [line('patata', 1, 'KILOGRAM')],
      [item('patata', 300, 'GRAM'), item('patata', 0.2, 'KILOGRAM')],
      TODAY,
    );

    expect(match.missing).toEqual([
      {
        ingredient: { id: 'patata', name: 'patata' },
        needed: { quantity: 1, unit: 'KILOGRAM' },
        have: { quantity: 500, unit: 'GRAM' },
        expired: false,
      },
    ]);
  });

  it('adds up the items that together are enough', () => {
    const match = pantryMatch(
      [line('patata', 600, 'GRAM')],
      [item('patata', 400, 'GRAM'), item('patata', 0.2, 'KILOGRAM')],
      TODAY,
    );

    expect(match.canPrepare).toBe(true);
  });

  it('compares spoons with millilitres', () => {
    const recipe = [line('aceite', 2, 'TABLESPOON')];

    expect(
      pantryMatch(recipe, [item('aceite', 1, 'LITER')], TODAY).canPrepare,
    ).toBe(true);
    expect(
      pantryMatch(recipe, [item('aceite', 20, 'MILLILITER')], TODAY).missing[0]
        .have,
    ).toEqual({ quantity: 20, unit: 'MILLILITER' });
  });

  it('adds up the lines of a recipe that uses a food twice', () => {
    const match = pantryMatch(
      [line('aceite', 2, 'TABLESPOON'), line('aceite', 50, 'MILLILITER')],
      [item('aceite', 60, 'MILLILITER')],
      TODAY,
    );

    expect(match.missing[0].needed).toEqual({
      quantity: 80,
      unit: 'MILLILITER',
    });
  });

  it('counts as there, to be checked, a food in units that cannot be compared', () => {
    const match = pantryMatch(
      [line('patata', 600, 'GRAM')],
      [item('patata', 3, 'PIECE')],
      TODAY,
    );

    expect(match.canPrepare).toBe(true);
    expect(names(match.checkQuantity)).toEqual(['patata']);
    expect(match.using.map(({ ingredient }) => ingredient.id)).toEqual([
      'patata',
    ]);
  });

  it('takes a food without a quantity as always available', () => {
    const match = pantryMatch(
      [line('aceite', 200, 'MILLILITER')],
      [item('aceite', null, null)],
      TODAY,
    );

    expect(match.canPrepare).toBe(true);
    expect(match.checkQuantity).toEqual([]);
  });

  it('does not count a food whose use-by date is today or has passed', () => {
    const recipe = [line('pollo', 500, 'GRAM')];
    const useBy = (on: string) =>
      item('pollo', 1, 'KILOGRAM', { on, kind: 'USE_BY' });

    for (const on of ['2026-10-16', '2026-10-14']) {
      const match = pantryMatch(recipe, [useBy(on)], TODAY);
      expect(match.canPrepare).toBe(false);
      expect(match.missing[0]).toMatchObject({ have: null, expired: true });
    }
    expect(pantryMatch(recipe, [useBy('2026-10-17')], TODAY).canPrepare).toBe(
      true,
    );
  });

  it('counts the good items of a food when another one has expired', () => {
    const match = pantryMatch(
      [line('pollo', 500, 'GRAM')],
      [
        item('pollo', 1, 'KILOGRAM', { on: '2026-10-10', kind: 'USE_BY' }),
        item('pollo', 600, 'GRAM', { on: '2026-10-20', kind: 'USE_BY' }),
      ],
      TODAY,
    );

    expect(match.canPrepare).toBe(true);
    expect(match.using[0].expiresOn).toBe('2026-10-20');
  });

  it('still counts a food past its best-before date', () => {
    const match = pantryMatch(
      [line('arroz', 300, 'GRAM')],
      [item('arroz', 1, 'KILOGRAM', { on: '2026-10-01', kind: 'BEST_BEFORE' })],
      TODAY,
    );

    expect(match.canPrepare).toBe(true);
    expect(match.using[0]).toMatchObject({
      expiresOn: '2026-10-01',
      dateKind: 'BEST_BEFORE',
    });
  });

  it('gives the nearest date of the items it uses', () => {
    const match = pantryMatch(
      [line('leche', 500, 'MILLILITER')],
      [
        item('leche', 1, 'LITER', { on: '2026-10-25', kind: 'USE_BY' }),
        item('leche', 1, 'LITER', { on: '2026-10-18', kind: 'USE_BY' }),
        item('leche', 1, 'LITER'),
      ],
      TODAY,
    );

    expect(match.using[0]).toMatchObject({
      expiresOn: '2026-10-18',
      dateKind: 'USE_BY',
    });
  });

  it('does not stop a recipe for what goes to taste or by the pinch', () => {
    const match = pantryMatch(
      [
        line('huevo', 2, 'PIECE'),
        line('sal', null, null),
        line('pimienta', 1, 'PINCH'),
        line('perejil', null, null),
      ],
      [item('huevo', 6, 'PIECE'), item('perejil', null, null)],
      TODAY,
    );

    expect(match.canPrepare).toBe(true);
    expect(names(match.checkToTaste)).toEqual(['sal', 'pimienta']);
    expect(match.using.map(({ ingredient }) => ingredient.id)).toEqual([
      'huevo',
      'perejil',
    ]);
  });

  it('can prepare nothing measured from an empty pantry', () => {
    const match = pantryMatch(
      [line('arroz', 300, 'GRAM'), line('sal', null, null)],
      [],
      TODAY,
    );

    expect(match.canPrepare).toBe(false);
    expect(names(match.missing.map(({ ingredient }) => ingredient))).toEqual([
      'arroz',
    ]);
    expect(match.using).toEqual([]);
  });
});
