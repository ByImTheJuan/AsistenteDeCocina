import { joinNames } from './recipe-format';
import type { PantryRecipe, RecipePantry } from './recipes-api';

import { describeExpiry, isExpiringSoon } from '@/features/inventory/expiry';
import { formatQuantity } from '@/features/units/units';

// The recipes against the pantry are suggested in three sections. A recipe is
// worth suggesting when nothing measured is missing, or when it takes
// something from home and few things are missing. Each recipe goes in one
// section only: using up what expires soon comes first.

/** At most this many missing ingredients for a recipe to be suggested. */
export const MAX_MISSING = 3;

type Used = RecipePantry['using'][number];

export type PantryGroups = {
  /** Recipes that use something expiring soon, the nearest date first. */
  expiring: { recipe: PantryRecipe; soonest: Used }[];
  /** Nothing measured missing, by name. */
  ready: PantryRecipe[];
  /** 1 to MAX_MISSING missing, the fewest first, then those using more from home. */
  almost: PantryRecipe[];
};

function isWorthSuggesting({ pantry }: PantryRecipe): boolean {
  return (
    pantry.canPrepare || (pantry.missing.length <= MAX_MISSING && pantry.using.length > 0)
  );
}

/** What the recipe uses from home that expires soonest, if it expires soon. */
function soonestExpiring({ pantry }: PantryRecipe, on: string): Used | undefined {
  return pantry.using
    .filter((used) => isExpiringSoon(used, on))
    .sort((a, b) => (a.expiresOn ?? '').localeCompare(b.expiresOn ?? ''))[0];
}

/** The recipes of the API (by name) in the sections of the pantry view. */
export function groupPantryRecipes(recipes: PantryRecipe[], on: string): PantryGroups {
  const groups: PantryGroups = { expiring: [], ready: [], almost: [] };
  for (const recipe of recipes.filter(isWorthSuggesting)) {
    const soonest = soonestExpiring(recipe, on);
    if (soonest) groups.expiring.push({ recipe, soonest });
    else if (recipe.pantry.canPrepare) groups.ready.push(recipe);
    else groups.almost.push(recipe);
  }
  groups.expiring.sort((a, b) =>
    (a.soonest.expiresOn ?? '').localeCompare(b.soonest.expiresOn ?? ''),
  );
  groups.almost.sort(
    (a, b) =>
      a.pantry.missing.length - b.pantry.missing.length ||
      b.pantry.using.length - a.pantry.using.length,
  );
  return groups;
}

/** 'Usa Calabacín · Caduca mañana'. */
export function describeSoonest({ ingredient, ...date }: Used, on: string): string {
  return `Usa ${ingredient.name} · ${describeExpiry(date, on)}`;
}

export type PantryLine = { text: string; danger?: boolean };

/**
 * What a recipe needs to know about the pantry, one line each, only those
 * that apply: 'Falta: Chorizo y patata (tienes 200 g de 600 g)', 'Caducado,
 * no se cuenta: pollo' (a danger), 'Comprueba la cantidad de: patata',
 * 'Comprueba que tienes: sal'.
 */
export function describePantry(pantry: RecipePantry): PantryLine[] {
  const missing = pantry.missing
    .filter(({ expired }) => !expired)
    .map(({ ingredient, needed, have }) =>
      have
        ? `${ingredient.name} (tienes ${formatQuantity(have.quantity, have.unit)} de ${formatQuantity(needed.quantity, needed.unit)})`
        : ingredient.name,
    );
  const expired = pantry.missing
    .filter(({ expired }) => expired)
    .map(({ ingredient }) => ingredient.name);
  const names = (list: { name: string }[]) => joinNames(list.map(({ name }) => name));
  const lines: PantryLine[] = [];
  if (missing.length > 0) lines.push({ text: `Falta: ${joinNames(missing)}` });
  if (expired.length > 0) {
    lines.push({ text: `Caducado, no se cuenta: ${joinNames(expired)}`, danger: true });
  }
  if (pantry.checkQuantity.length > 0) {
    lines.push({ text: `Comprueba la cantidad de: ${names(pantry.checkQuantity)}` });
  }
  if (pantry.checkToTaste.length > 0) {
    lines.push({ text: `Comprueba que tienes: ${names(pantry.checkToTaste)}` });
  }
  return lines;
}
