import type { Allergen, DietaryRestrictionsDraft } from './dietary-restrictions-api';

export const allergenLabels: Record<Allergen, { name: string; examples: string }> = {
  GLUTEN: { name: 'Gluten', examples: 'Trigo, cebada, centeno, avena y sus derivados.' },
  CRUSTACEANS: { name: 'Crustáceos', examples: 'Gambas, langostinos, cangrejo, bogavante.' },
  EGG: { name: 'Huevo', examples: 'Huevos y productos que los llevan, como la mayonesa.' },
  FISH: { name: 'Pescado', examples: 'Cualquier pescado y sus derivados.' },
  PEANUTS: { name: 'Cacahuetes', examples: 'Cacahuetes y productos que los contienen.' },
  SOY: { name: 'Soja', examples: 'Soja, tofu, tempeh, salsa de soja.' },
  MILK: { name: 'Leche', examples: 'Proteínas de la leche: leche, queso, yogur, mantequilla.' },
  TREE_NUTS: {
    name: 'Frutos de cáscara',
    examples: 'Almendras, nueces, avellanas, anacardos, pistachos.',
  },
  CELERY: { name: 'Apio', examples: 'Apio y los caldos o condimentos que lo llevan.' },
  MUSTARD: { name: 'Mostaza', examples: 'Mostaza en grano, en salsa o en mezclas de especias.' },
  SESAME: { name: 'Sésamo', examples: 'Semillas de sésamo, tahini.' },
  SULPHITES: { name: 'Sulfitos', examples: 'Vino, vinagre, frutas desecadas, algunos mariscos.' },
  LUPIN: { name: 'Altramuces', examples: 'Altramuces y su harina.' },
  MOLLUSCS: { name: 'Moluscos', examples: 'Mejillones, almejas, calamares, pulpo.' },
  LACTOSE: { name: 'Lactosa', examples: 'El azúcar de la leche y de muchos lácteos.' },
  FRUCTOSE: { name: 'Fructosa', examples: 'Frutas, miel y azúcares añadidos.' },
  HISTAMINE: {
    name: 'Histamina',
    examples: 'Quesos curados, embutidos, conservas de pescado, vino.',
  },
  SORBITOL: { name: 'Sorbitol', examples: 'Manzana, pera, ciruela, melocotón, albaricoque.' },
};

/** How many things the user must avoid, in words; nothing counts as not configured. */
export function summarizeRestrictions({ allergens, ingredients }: DietaryRestrictionsDraft) {
  const count = allergens.length + ingredients.length;
  if (count === 0) {
    return 'Sin configurar';
  }
  return count === 1 ? '1 restricción' : `${count} restricciones`;
}
