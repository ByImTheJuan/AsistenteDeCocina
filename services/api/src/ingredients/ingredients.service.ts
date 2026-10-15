import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { withAllergens } from './ingredient-with-allergens.js';
import type { IngredientWithAllergens } from './ingredient-with-allergens.js';

export const INGREDIENT_SEARCH_LIMIT = 50;

@Injectable()
export class IngredientsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  // Matches the name or any of its synonyms ("papa" finds "Patata"); each
  // ingredient is returned once, under its catalogue name. The collation
  // ignores case and accents, so "platano" finds "Plátano" without any
  // normalisation here.
  search(search: string | undefined): Promise<IngredientWithAllergens[]> {
    // Prisma passes the text to LIKE as is; its wildcards are escaped so
    // they are searched for literally.
    const text = search?.trim().replace(/[\\%_]/g, '\\$&');
    return this.prisma.ingredient.findMany({
      where: text
        ? {
            OR: [
              { name: { contains: text } },
              { aliases: { some: { alias: { contains: text } } } },
            ],
          }
        : undefined,
      include: withAllergens,
      orderBy: { name: 'asc' },
      take: INGREDIENT_SEARCH_LIMIT,
    });
  }
}
