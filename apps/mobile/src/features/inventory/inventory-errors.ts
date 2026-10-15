import { apiErrorMessage } from '@/lib/api-error-message';

const messagesByCode: Record<string, string> = {
  unknown_ingredient: 'Ese alimento ya no está en el catálogo. Elige otro.',
  incomplete_quantity: 'Indica la cantidad y la unidad, o deja la cantidad vacía.',
  unit_not_allowed: 'Este alimento no se mide en esa unidad. Elige otra.',
  inventory_item_not_found: 'Este alimento ya no está en tu despensa.',
  inventory_full:
    'Tu despensa ha llegado al máximo de 500 alimentos. Elimina alguno para añadir más.',
};

/** Message to show when an inventory request fails. */
export function inventoryErrorMessage(error: unknown): string {
  return apiErrorMessage(error, messagesByCode);
}
