import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, Matches } from 'class-validator';
import {
  Allergen,
  ExpiryKind,
  NutritionGoalKind,
  Unit,
} from '../generated/prisma/enums.js';
import { IngredientResponse } from '../ingredients/ingredients.dto.js';
import type { GoalFit } from './nutrition-goals-fit.js';
import type { PantryMatch } from './pantry-match.js';
import type { RecipeNutrition } from './recipe-nutrition.js';
import type { RecipeSafety } from './recipe-safety.js';
import type {
  PantryRecipes,
  RecipeCatalogue,
  RecipeDetail,
  RecipeWithIngredients,
  Recommendations,
} from './recipes.service.js';

const imageUrlProperty = {
  type: 'string' as const,
  nullable: true,
  description: 'Picture of the dish. Null while the recipe has none.',
};

const totalMinutesProperty = {
  example: 45,
  description:
    'Estimated time from starting to serving, resting included. An estimate with no validated source.',
};

// Not filled yet: reviews arrive with EP-08. Defined so the contract already
// says what a rated recipe will look like.
export class RecipeRatingResponse {
  @ApiProperty({ minimum: 1, maximum: 5, example: 4.5 })
  average: number;

  @ApiProperty({ minimum: 1, description: 'Number of ratings' })
  count: number;
}

const ratingProperty = {
  type: () => RecipeRatingResponse,
  nullable: true,
  description:
    'Null while the recipe has no reviews; never a made-up score. There are no reviews yet.',
};

export class RecipeIngredientNameResponse {
  @ApiProperty()
  id: string;

  @ApiProperty({ example: 'Patata' })
  name: string;
}

export class RecipeSummaryResponse {
  @ApiProperty({ example: 'rec_tortilla_patatas' })
  id: string;

  @ApiProperty({ example: 'Tortilla de patatas' })
  name: string;

  @ApiProperty(imageUrlProperty)
  imageUrl: string | null;

  @ApiProperty(totalMinutesProperty)
  totalMinutes: number;

  @ApiProperty({
    type: [RecipeIngredientNameResponse],
    description: 'The few ingredients that define the dish, in recipe order.',
  })
  mainIngredients: RecipeIngredientNameResponse[];

  @ApiProperty({
    description:
      'True when some ingredient is a processed food whose allergens depend on the brand: the user has to check it before taking the recipe as safe.',
  })
  allergensUncertain: boolean;

  @ApiProperty(ratingProperty)
  rating: RecipeRatingResponse | null;

  static from(recipe: RecipeWithIngredients): RecipeSummaryResponse {
    return {
      id: recipe.id,
      name: recipe.name,
      imageUrl: recipe.imageUrl,
      totalMinutes: recipe.totalMinutes,
      mainIngredients: recipe.ingredients
        .filter(({ main }) => main)
        .map(({ ingredient }) => ({
          id: ingredient.id,
          name: ingredient.name,
        })),
      allergensUncertain: recipe.safety.allergensUncertain,
      rating: null,
    };
  }
}

export class RecipeCatalogueResponse {
  @ApiProperty({
    type: [RecipeSummaryResponse],
    description:
      'Recipes with nothing the restrictions of the user forbid, by name.',
  })
  recipes: RecipeSummaryResponse[];

  @ApiProperty({
    minimum: 0,
    description:
      'Recipes left out because they contain a restricted allergen or ingredient.',
  })
  hiddenCount: number;

  static from(catalogue: RecipeCatalogue): RecipeCatalogueResponse {
    return {
      recipes: catalogue.recipes.map((recipe) =>
        RecipeSummaryResponse.from(recipe),
      ),
      hiddenCount: catalogue.hiddenCount,
    };
  }
}

export class RecipeIngredientResponse {
  @ApiProperty({ type: IngredientResponse })
  ingredient: IngredientResponse;

  @ApiProperty({
    type: 'number',
    nullable: true,
    description:
      'For the servings of the recipe. Null when it goes to taste; then the unit is null too.',
  })
  quantity: number | null;

  @ApiProperty({
    enum: Unit,
    enumName: 'Unit',
    nullable: true,
    description:
      'One of the units of the ingredient, or a spoon or a pinch, which are only for recipes. Null exactly when the quantity is.',
  })
  unit: Unit | null;

  @ApiProperty({
    type: 'string',
    nullable: true,
    example: 'picada',
    description: 'How the ingredient is used.',
  })
  note: string | null;

  @ApiProperty({ description: 'One of the ingredients that define the dish.' })
  main: boolean;
}

export class RecipeSafetyResponse {
  @ApiProperty({
    enum: Allergen,
    enumName: 'Allergen',
    isArray: true,
    description: 'Restricted allergens some ingredient contains.',
  })
  conflictingAllergens: Allergen[];

  @ApiProperty({
    type: [RecipeIngredientNameResponse],
    description: 'Ingredients of the recipe the user has restricted.',
  })
  conflictingIngredients: RecipeIngredientNameResponse[];

  @ApiProperty({
    description:
      'Some ingredient may contain allergens that are not listed. Even with no conflicts, the recipe is then not known to be safe.',
  })
  allergensUncertain: boolean;

  static from(safety: RecipeSafety): RecipeSafetyResponse {
    return {
      conflictingAllergens: safety.conflictingAllergens,
      conflictingIngredients: safety.conflictingIngredients.map(
        ({ id, name }) => ({ id, name }),
      ),
      allergensUncertain: safety.allergensUncertain,
    };
  }
}

export class NutrientsResponse {
  @ApiProperty({
    type: 'number',
    nullable: true,
    example: 320,
    description:
      'Kilocalories. Null when some ingredient lacks the data to work them out.',
  })
  calories: number | null;

  @ApiProperty({
    type: 'number',
    nullable: true,
    example: 14.5,
    description:
      'Grams of protein. Null when some ingredient lacks the data to work them out.',
  })
  protein: number | null;
}

export class RecipeNutritionResponse {
  @ApiProperty({ type: NutrientsResponse, description: 'For one serving.' })
  perServing: NutrientsResponse;

  @ApiProperty({
    description:
      'Always true: the values are estimated from average values of the ingredients, with no validated source.',
  })
  estimated: boolean;

  @ApiProperty({
    type: [RecipeIngredientNameResponse],
    description:
      'Ingredients that lack the data to estimate some value; that value is then null.',
  })
  missingIngredients: RecipeIngredientNameResponse[];

  @ApiProperty({
    description:
      'Some ingredient goes to taste and is not counted. Pinches are not counted either.',
  })
  excludesToTaste: boolean;

  static from(nutrition: RecipeNutrition): RecipeNutritionResponse {
    return { ...nutrition, estimated: true };
  }
}

export class RecipeGoalFitResponse {
  @ApiProperty({ enum: NutritionGoalKind, enumName: 'NutritionGoalKind' })
  kind: NutritionGoalKind;

  @ApiProperty({
    description: 'The goal the user set: kcal, or grams of protein.',
  })
  target: number;

  @ApiProperty({
    description:
      'False when the recipe lacks the data to compare with the goal.',
  })
  comparable: boolean;

  @ApiProperty({
    type: 'number',
    nullable: true,
    example: 32,
    description:
      'For the daily goals: share of the goal one serving takes, in whole percent.',
  })
  percent: number | null;

  @ApiProperty({
    type: 'boolean',
    nullable: true,
    description: 'For the goal per meal: whether one serving stays within it.',
  })
  withinGoal: boolean | null;

  static from(fit: GoalFit): RecipeGoalFitResponse {
    return { ...fit };
  }
}

export class RecipeDetailResponse {
  @ApiProperty({ example: 'rec_tortilla_patatas' })
  id: string;

  @ApiProperty({ example: 'Tortilla de patatas' })
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty(imageUrlProperty)
  imageUrl: string | null;

  @ApiProperty(totalMinutesProperty)
  totalMinutes: number;

  @ApiProperty({ minimum: 1, description: 'Servings the quantities are for.' })
  servings: number;

  @ApiProperty({ type: [RecipeIngredientResponse] })
  ingredients: RecipeIngredientResponse[];

  @ApiProperty({ type: [String], description: 'Preparation steps, in order.' })
  steps: string[];

  @ApiProperty(ratingProperty)
  rating: RecipeRatingResponse | null;

  @ApiProperty({
    type: RecipeSafetyResponse,
    description:
      'How the recipe stands against the restrictions of the user. A recipe hidden from the catalogue can still be opened, and comes with its conflicts.',
  })
  safety: RecipeSafetyResponse;

  @ApiProperty({ type: RecipeNutritionResponse })
  nutrition: RecipeNutritionResponse;

  @ApiProperty({
    type: [RecipeGoalFitResponse],
    description:
      'One serving against each nutrition goal the user has switched on, in the order daily calories, calories per meal, daily protein. Empty without goals in use.',
  })
  goals: RecipeGoalFitResponse[];

  static from(recipe: RecipeDetail): RecipeDetailResponse {
    return {
      id: recipe.id,
      name: recipe.name,
      description: recipe.description,
      imageUrl: recipe.imageUrl,
      totalMinutes: recipe.totalMinutes,
      servings: recipe.servings,
      ingredients: recipe.ingredients.map((line) => ({
        ingredient: IngredientResponse.from(line.ingredient),
        quantity: line.quantity === null ? null : line.quantity.toNumber(),
        unit: line.unit,
        note: line.note,
        main: line.main,
      })),
      steps: recipe.steps.map(({ text }) => text),
      rating: null,
      safety: RecipeSafetyResponse.from(recipe.safety),
      nutrition: RecipeNutritionResponse.from(recipe.nutrition),
      goals: recipe.goals.map((fit) => RecipeGoalFitResponse.from(fit)),
    };
  }
}

export class PantryRecipesQuery {
  @ApiProperty({
    example: '2026-10-16',
    description:
      'The day it is for the user (YYYY-MM-DD). From it on, a food whose use-by date is that day or earlier does not count as available.',
  })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'today must be YYYY-MM-DD' })
  @IsDateString({ strict: true, strictSeparator: true })
  today: string;
}

export class QuantityResponse {
  @ApiProperty({ example: 200 })
  quantity: number;

  @ApiProperty({ enum: Unit, enumName: 'Unit' })
  unit: Unit;
}

export class PantryMissingResponse {
  @ApiProperty({ type: RecipeIngredientNameResponse })
  ingredient: RecipeIngredientNameResponse;

  @ApiProperty({
    type: QuantityResponse,
    description: 'What the recipe asks for.',
  })
  needed: QuantityResponse;

  @ApiProperty({
    type: QuantityResponse,
    nullable: true,
    description:
      'What there is at home when it is not enough. Null when there is none.',
  })
  have: QuantityResponse | null;

  @ApiProperty({
    description:
      'There is some, but its use-by date is today or has passed, so it does not count.',
  })
  expired: boolean;
}

export class PantryUsedResponse {
  @ApiProperty({ type: RecipeIngredientNameResponse })
  ingredient: RecipeIngredientNameResponse;

  @ApiProperty({
    type: 'string',
    nullable: true,
    example: '2026-10-18',
    description: 'Nearest date (YYYY-MM-DD) of the items that count.',
  })
  expiresOn: string | null;

  @ApiProperty({
    enum: ExpiryKind,
    enumName: 'ExpiryKind',
    nullable: true,
  })
  dateKind: ExpiryKind | null;
}

export class RecipePantryResponse {
  @ApiProperty({
    description:
      'Nothing the recipe needs in a measured quantity is missing. Ingredients to taste do not count.',
  })
  canPrepare: boolean;

  @ApiProperty({
    type: [PantryMissingResponse],
    description: 'Missing or not enough, in recipe order.',
  })
  missing: PantryMissingResponse[];

  @ApiProperty({
    type: [RecipeIngredientNameResponse],
    description:
      'At home, but in units that cannot be compared with the recipe (pieces against grams): the user has to check the quantity.',
  })
  checkQuantity: RecipeIngredientNameResponse[];

  @ApiProperty({
    type: [RecipeIngredientNameResponse],
    description:
      'Go to taste or by the pinch and are not at home. They do not stop the recipe.',
  })
  checkToTaste: RecipeIngredientNameResponse[];

  @ApiProperty({
    type: [PantryUsedResponse],
    description: 'Ingredients the recipe takes from home, in recipe order.',
  })
  using: PantryUsedResponse[];

  static from(match: PantryMatch): RecipePantryResponse {
    const name = ({ id, name }: { id: string; name: string }) => ({ id, name });
    return {
      canPrepare: match.canPrepare,
      missing: match.missing.map((line) => ({
        ...line,
        ingredient: name(line.ingredient),
      })),
      checkQuantity: match.checkQuantity.map(name),
      checkToTaste: match.checkToTaste.map(name),
      using: match.using.map((line) => ({
        ...line,
        ingredient: name(line.ingredient),
      })),
    };
  }
}

export class PantryRecipeResponse extends RecipeSummaryResponse {
  @ApiProperty({ type: RecipePantryResponse })
  pantry: RecipePantryResponse;
}

export class PantryRecipesResponse {
  @ApiProperty({
    type: [PantryRecipeResponse],
    description:
      'Recipes with nothing the restrictions of the user forbid, by name, against what there is at home.',
  })
  recipes: PantryRecipeResponse[];

  @ApiProperty({
    minimum: 0,
    description:
      'Recipes left out because they contain a restricted allergen or ingredient.',
  })
  hiddenCount: number;

  @ApiProperty({ description: 'The user has nothing at home yet.' })
  inventoryEmpty: boolean;

  static from(result: PantryRecipes): PantryRecipesResponse {
    return {
      recipes: result.recipes.map((recipe) => ({
        ...RecipeSummaryResponse.from(recipe),
        pantry: RecipePantryResponse.from(recipe.pantry),
      })),
      hiddenCount: result.hiddenCount,
      inventoryEmpty: result.inventoryEmpty,
    };
  }
}

export class RecommendedRecipeResponse extends RecipeSummaryResponse {
  @ApiProperty()
  description: string;

  @ApiProperty({ minimum: 1, description: 'Servings the quantities are for.' })
  servings: number;

  @ApiProperty({
    type: [RecipeIngredientNameResponse],
    description: 'Ingredients of the recipe the user likes, in recipe order.',
  })
  likedIngredients: RecipeIngredientNameResponse[];

  @ApiProperty({ type: RecipePantryResponse })
  pantry: RecipePantryResponse;

  @ApiProperty({
    type: NutrientsResponse,
    description:
      'Estimated for one serving, with no validated source. A value is null when some ingredient lacks the data.',
  })
  perServing: NutrientsResponse;

  @ApiProperty({
    type: [RecipeGoalFitResponse],
    description:
      'One serving against each nutrition goal the user has switched on. Empty without goals in use.',
  })
  goals: RecipeGoalFitResponse[];
}

export class RecommendationsResponse {
  @ApiProperty({
    type: [RecommendedRecipeResponse],
    description:
      'Recipes with nothing the restrictions forbid that fit the diet and the tastes of the user, the most suitable first.',
  })
  recipes: RecommendedRecipeResponse[];

  @ApiProperty({
    minimum: 0,
    description:
      'Recipes left out because they contain a restricted allergen or ingredient.',
  })
  hiddenCount: number;

  @ApiProperty({
    minimum: 0,
    description:
      'Recipes left out because the diet does not allow them or they have a food the user does not like. They stay in the catalogue.',
  })
  excludedCount: number;

  static from(result: Recommendations): RecommendationsResponse {
    return {
      recipes: result.recipes.map((recipe) => ({
        ...RecipeSummaryResponse.from(recipe),
        description: recipe.description,
        servings: recipe.servings,
        likedIngredients: recipe.likedIngredients,
        pantry: RecipePantryResponse.from(recipe.pantry),
        perServing: recipe.nutrition.perServing,
        goals: recipe.goals.map((fit) => RecipeGoalFitResponse.from(fit)),
      })),
      hiddenCount: result.hiddenCount,
      excludedCount: result.excludedCount,
    };
  }
}
