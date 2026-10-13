import { Inject, Injectable } from '@nestjs/common';
import type { Ingredient } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

export const INGREDIENT_SEARCH_LIMIT = 50;

@Injectable()
export class IngredientsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  // The column collation ignores case and accents, so "platano" finds
  // "Plátano" without any normalisation here.
  search(search: string | undefined): Promise<Ingredient[]> {
    // Prisma passes the text to LIKE as is; its wildcards are escaped so
    // they are searched for literally.
    const text = search?.trim().replace(/[\\%_]/g, '\\$&');
    return this.prisma.ingredient.findMany({
      where: text ? { name: { contains: text } } : undefined,
      orderBy: { name: 'asc' },
      take: INGREDIENT_SEARCH_LIMIT,
    });
  }
}
