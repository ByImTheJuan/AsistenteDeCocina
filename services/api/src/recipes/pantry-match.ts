import type { ExpiryKind, Unit } from '../generated/prisma/client.js';
import { combineQuantities, convert, UNITS } from '../units/units.js';
import type { QuantityLine } from '../units/units.js';

// Prisma decimals, or anything else that turns into a number.
type Numeric = { toNumber(): number };

type IngredientName = { id: string; name: string };

export type PantryRecipeLine = {
  quantity: Numeric | null;
  unit: Unit | null;
  ingredient: IngredientName;
};

export type PantryItem = {
  ingredientId: string;
  quantity: Numeric | null;
  unit: Unit | null;
  expiresOn: Date | null;
  dateKind: ExpiryKind | null;
};

export type Quantity = { quantity: number; unit: Unit };

export type MissingIngredient = {
  ingredient: IngredientName;
  /** What the recipe asks for, in one of its units. */
  needed: Quantity;
  /** What there is at home when it is not enough; null when there is none. */
  have: Quantity | null;
  /** There is some, but its use-by date is today or has passed. */
  expired: boolean;
};

export type UsedIngredient = {
  ingredient: IngredientName;
  /** The nearest date of the items that count, as YYYY-MM-DD. */
  expiresOn: string | null;
  dateKind: ExpiryKind | null;
};

export type PantryMatch = {
  /** Nothing the recipe needs in a measured quantity is missing. */
  canPrepare: boolean;
  missing: MissingIngredient[];
  /** There is some, but in units that cannot be compared with the recipe. */
  checkQuantity: IngredientName[];
  /** Go to taste or by the pinch and are not at home: they do not stop the recipe. */
  checkToTaste: IngredientName[];
  /** Ingredients the recipe takes from home, enough or to be checked. */
  using: UsedIngredient[];
};

const calendarDay = (date: Date) => date.toISOString().slice(0, 10);

/**
 * A food whose use-by date is today or has passed may not be safe, so it does
 * not count as available. A passed best-before date still counts.
 */
function isUsable(item: PantryItem, today: string): boolean {
  return (
    item.dateKind !== 'USE_BY' ||
    item.expiresOn === null ||
    calendarDay(item.expiresOn) > today
  );
}

function nearestDate(items: PantryItem[]): Omit<UsedIngredient, 'ingredient'> {
  const dated = items
    .filter((item) => item.expiresOn !== null)
    .sort((a, b) => a.expiresOn!.getTime() - b.expiresOn!.getTime());
  const first = dated[0];
  return first
    ? { expiresOn: calendarDay(first.expiresOn!), dateKind: first.dateKind }
    : { expiresOn: null, dateKind: null };
}

const sameKind = (a: Unit, b: Unit) => UNITS[a].kind === UNITS[b].kind;

const isToTaste = (line: PantryRecipeLine) =>
  line.quantity === null || line.unit === null || line.unit === 'PINCH';

/**
 * How a recipe stands against what the user has at home. Quantities of the
 * same food are added up and compared only between units of the same kind
 * (docs/decisions/0005-unidades-y-equivalencias.md): when the kinds differ,
 * the food counts as there, to be checked. An item without a quantity is
 * always available.
 */
export function pantryMatch(
  lines: PantryRecipeLine[],
  items: PantryItem[],
  today: string,
): PantryMatch {
  const byIngredient = new Map<
    string,
    { ingredient: IngredientName; needs: QuantityLine[] }
  >();
  for (const line of lines) {
    const entry = byIngredient.get(line.ingredient.id) ?? {
      ingredient: line.ingredient,
      needs: [],
    };
    if (!isToTaste(line)) {
      entry.needs.push({
        ingredientId: line.ingredient.id,
        quantity: line.quantity!.toNumber(),
        unit: line.unit!,
      });
    }
    byIngredient.set(line.ingredient.id, entry);
  }

  const match: PantryMatch = {
    canPrepare: true,
    missing: [],
    checkQuantity: [],
    checkToTaste: [],
    using: [],
  };

  for (const { ingredient, needs } of byIngredient.values()) {
    const own = items.filter((item) => item.ingredientId === ingredient.id);
    const usable = own.filter((item) => isUsable(item, today));
    const used = () => match.using.push({ ingredient, ...nearestDate(usable) });

    if (needs.length === 0) {
      if (usable.length === 0) match.checkToTaste.push(ingredient);
      else used();
      continue;
    }

    const needed = combined(needs);
    if (usable.length === 0) {
      match.missing.push({
        ingredient,
        needed: toQuantity(needed[0]),
        have: null,
        expired: own.length > 0,
      });
      continue;
    }

    if (usable.some((item) => item.quantity === null)) {
      used();
      continue;
    }

    const have = combined(
      usable.map((item) => ({
        ingredientId: ingredient.id,
        quantity: item.quantity!.toNumber(),
        unit: item.unit!,
      })),
    );
    let comparable = true;
    let shortage: MissingIngredient | null = null;
    for (const need of needed) {
      const stock = have.find(({ unit }) => sameKind(unit, need.unit));
      if (!stock) {
        comparable = false;
        continue;
      }
      const inNeedUnit = convert(stock.quantity, stock.unit, need.unit)!;
      if (inNeedUnit < need.quantity) {
        shortage ??= {
          ingredient,
          needed: toQuantity(need),
          have: toQuantity(stock),
          expired: false,
        };
      }
    }

    if (shortage) {
      match.missing.push(shortage);
      continue;
    }
    if (!comparable) match.checkQuantity.push(ingredient);
    used();
  }

  match.canPrepare = match.missing.length === 0;
  return match;
}

/** Added up, but a single line keeps the unit it was written in. */
const combined = (lines: QuantityLine[]) =>
  lines.length === 1 ? lines : combineQuantities(lines);

const toQuantity = ({ quantity, unit }: QuantityLine): Quantity => ({
  quantity,
  unit,
});
