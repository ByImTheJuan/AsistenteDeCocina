import { z } from 'zod';

// Units a quantity can be written in, as the API defines them. Which ones
// convert into each other, and which ones each food takes, is decided by the
// API (docs/decisions/0005-unidades-y-equivalencias.md); the app only shows
// them. Spoons and pinches are for recipes: no food offers them for the
// inventory.
export const units = [
  'PIECE',
  'GRAM',
  'KILOGRAM',
  'MILLILITER',
  'LITER',
  'TABLESPOON',
  'TEASPOON',
  'PINCH',
] as const;

export const unitSchema = z.enum(units);

export type Unit = z.infer<typeof unitSchema>;

type UnitLabel = {
  /** Written after a quantity: '500 g', '1 unidad', '2 unidades'. */
  one: string;
  many: string;
  /** Full name, for the unit picker and screen readers. */
  name: string;
};

const unitLabels: Record<Unit, UnitLabel> = {
  PIECE: { one: 'unidad', many: 'unidades', name: 'Unidades' },
  GRAM: { one: 'g', many: 'g', name: 'Gramos' },
  KILOGRAM: { one: 'kg', many: 'kg', name: 'Kilos' },
  MILLILITER: { one: 'ml', many: 'ml', name: 'Mililitros' },
  LITER: { one: 'l', many: 'l', name: 'Litros' },
  TABLESPOON: { one: 'cucharada', many: 'cucharadas', name: 'Cucharadas' },
  TEASPOON: { one: 'cucharadita', many: 'cucharaditas', name: 'Cucharaditas' },
  PINCH: { one: 'pizca', many: 'pizcas', name: 'Pizcas' },
};

/** Name of a unit, as offered in the unit picker. */
export function unitName(unit: Unit): string {
  return unitLabels[unit].name;
}

/** The unit as written after a quantity: "kg", "unidad", "unidades". */
export function unitSymbol(unit: Unit, quantity: number | null): string {
  const { one, many } = unitLabels[unit];
  return quantity === 1 ? one : many;
}

// The limits the API accepts: three decimals, as it stores them.
export const QUANTITY_MIN = 0.001;
export const QUANTITY_MAX = 100_000;

// Thousands with a dot and decimals with a comma, as in Spanish. Written by
// hand: not every JavaScript engine the app runs on formats numbers for 'es'.
function formatNumber(value: number): string {
  const [whole, decimals] = String(Math.round(value * 1000) / 1000).split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+$)/g, '.');
  return decimals ? `${grouped},${decimals}` : grouped;
}

/** '500 g', '1 unidad', '1,5 kg', '2 cucharadas'. */
export function formatQuantity(quantity: number, unit: Unit): string {
  return `${formatNumber(quantity)} ${unitSymbol(unit, quantity)}`;
}

/** What the quantity field holds when editing: '1,5' rather than '1.5'. */
export function quantityToText(quantity: number): string {
  return String(quantity).replace('.', ',');
}

/**
 * The number written in a quantity field, or null if it is not one. Accepts a
 * decimal comma or point (the keyboard shows either), but no thousands
 * separators: '1.500' would be ambiguous.
 */
export function parseQuantity(text: string): number | null {
  const match = /^(\d+)(?:[.,](\d{1,3}))?$/.exec(text.trim());
  if (!match) return null;
  return Number(`${match[1]}.${match[2] ?? '0'}`);
}
