import { Unit } from '../generated/prisma/enums.js';

// Rules for comparing and adding quantities. Only units of the same kind
// convert into each other: weight, volume and pieces are never mixed, because
// the equivalences between them depend on the food and are not reliable. A
// pinch or a package has no known content, so it converts to nothing.
// Criteria in docs/decisions/0005-unidades-y-equivalencias.md.

export type UnitKind = 'MASS' | 'VOLUME' | 'COUNT' | 'PINCH' | 'PACKAGE';

type UnitDefinition = {
  kind: UnitKind;
  /** How many base units (g, ml, pieces...) one of this unit holds. */
  factor: number;
};

export const UNITS: Record<Unit, UnitDefinition> = {
  GRAM: { kind: 'MASS', factor: 1 },
  KILOGRAM: { kind: 'MASS', factor: 1000 },
  MILLILITER: { kind: 'VOLUME', factor: 1 },
  LITER: { kind: 'VOLUME', factor: 1000 },
  TABLESPOON: { kind: 'VOLUME', factor: 15 },
  TEASPOON: { kind: 'VOLUME', factor: 5 },
  PIECE: { kind: 'COUNT', factor: 1 },
  PINCH: { kind: 'PINCH', factor: 1 },
  PACKAGE: { kind: 'PACKAGE', factor: 1 },
};

const BASE_UNIT: Record<UnitKind, Unit> = {
  MASS: Unit.GRAM,
  VOLUME: Unit.MILLILITER,
  COUNT: Unit.PIECE,
  PINCH: Unit.PINCH,
  PACKAGE: Unit.PACKAGE,
};

// From this amount of the base unit on, totals are shown in the larger one.
const LARGER_UNIT: Partial<Record<UnitKind, Unit>> = {
  MASS: Unit.KILOGRAM,
  VOLUME: Unit.LITER,
};

const DECIMALS = 3;

/** Rounds to the precision quantities are stored with. */
export function roundQuantity(quantity: number): number {
  const scale = 10 ** DECIMALS;
  return Math.round(quantity * scale) / scale;
}

export function canConvert(from: Unit, to: Unit): boolean {
  return UNITS[from].kind === UNITS[to].kind;
}

/**
 * The quantity expressed in another unit, or null when there is no valid
 * conversion between the two.
 */
export function convert(quantity: number, from: Unit, to: Unit): number | null {
  if (!canConvert(from, to)) return null;
  return roundQuantity((quantity * UNITS[from].factor) / UNITS[to].factor);
}

export type QuantityLine = {
  ingredientId: string;
  quantity: number;
  unit: Unit;
};

/**
 * Adds up the quantities of each ingredient. Lines of the same ingredient are
 * added when their units are of the same kind; the rest stay as separate
 * lines, so incompatible quantities are never combined. Totals of weight and
 * volume are given in g or ml, or in kg or l from 1000 on. Lines keep the
 * order in which each ingredient and kind first appears.
 */
export function combineQuantities(lines: QuantityLine[]): QuantityLine[] {
  const totals = new Map<
    string,
    { ingredientId: string; kind: UnitKind; base: number }
  >();
  for (const line of lines) {
    const { kind, factor } = UNITS[line.unit];
    const key = `${line.ingredientId}\u0000${kind}`;
    const total = totals.get(key) ?? {
      ingredientId: line.ingredientId,
      kind,
      base: 0,
    };
    total.base += line.quantity * factor;
    totals.set(key, total);
  }

  return [...totals.values()].map(({ ingredientId, kind, base }) => {
    const larger = LARGER_UNIT[kind];
    const unit =
      larger && base >= UNITS[larger].factor ? larger : BASE_UNIT[kind];
    return {
      ingredientId,
      quantity: roundQuantity(base / UNITS[unit].factor),
      unit,
    };
  });
}
