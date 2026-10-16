import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import type { Unit } from './../src/generated/prisma/client.js';
import { PrismaService } from './../src/prisma/prisma.service.js';
import { setupApp } from './../src/setup-app.js';
import { MEASURE_UNITS } from './../src/units/units.js';

const ana = {
  name: 'Ana',
  email: 'ana@example.com',
  password: 'correct horse battery',
};

// The catalogue is inserted by the migrations and never reset.
const RECIPE_COUNT = 24;
// Recipes of the catalogue with egg.
const WITH_EGG = ['Ensalada mixta', 'Revuelto de setas', 'Tortilla de patatas'];
// Spoons and pinches are only for recipes.
const RECIPE_ONLY_UNITS: Unit[] = ['TABLESPOON', 'TEASPOON', 'PINCH'];

// The day of the user for the pantry.
const TODAY = '2026-10-16';

type Session = { accessToken: string; refreshToken: string };
type Summary = { id: string; name: string };

describe('Recipes (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const http = () => request(app.getHttpServer());
  const as = (session: Session) => {
    const auth = { Authorization: `Bearer ${session.accessToken}` };
    return {
      catalogue: (filters: Record<string, string | number> = {}) =>
        http().get('/recipes').query(filters).set(auth),
      detail: (id: string) => http().get(`/recipes/${id}`).set(auth),
      pantry: (today = TODAY, filters: Record<string, string | number> = {}) =>
        http()
          .get('/recipes/pantry')
          .query({ today, ...filters })
          .set(auth),
      recommendations: (today = TODAY) =>
        http().get('/recipes/recommendations').query({ today }).set(auth),
      setTastes: (tastes: {
        diet?: string | null;
        likedIngredientIds?: string[];
        avoidedIngredientIds?: string[];
      }) =>
        http()
          .put('/food-preferences')
          .set(auth)
          .send({
            diet: null,
            likedIngredientIds: [],
            avoidedIngredientIds: [],
            ...tastes,
          })
          .expect(200),
      stock: (
        ingredientId: string,
        quantity: number | null,
        unit: Unit | null,
        date: { expiresOn: string; dateKind: string } | null = null,
      ) =>
        http()
          .post('/inventory')
          .set(auth)
          .send({
            ingredientId,
            quantity,
            unit,
            expiresOn: date?.expiresOn ?? null,
            dateKind: date?.dateKind ?? null,
            location: null,
          })
          .expect(201),
      restrict: (allergens: string[], ingredientIds: string[] = []) =>
        http()
          .put('/dietary-restrictions')
          .set(auth)
          .send({ allergens, ingredientIds })
          .expect(200),
      setGoals: (goals: object) =>
        http()
          .put('/nutrition-goals')
          .set(auth)
          .send({
            dailyCalories: null,
            mealCalories: null,
            dailyProtein: null,
            ...goals,
          })
          .expect(200),
    };
  };
  const register = async (user = ana): Promise<Session> =>
    (await http().post('/auth/register').send(user).expect(201)).body;
  const names = (recipes: Summary[]) => recipes.map(({ name }) => name);

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    setupApp(app);
    await app.init();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  it('requires a session', async () => {
    await http().get('/recipes').expect(401);
    await http().get('/recipes/rec_tortilla_patatas').expect(401);
    await http().get('/recipes/pantry').query({ today: TODAY }).expect(401);
    await http()
      .get('/recipes/recommendations')
      .query({ today: TODAY })
      .expect(401);
  });

  describe('GET /recipes', () => {
    it('lists the whole catalogue by name for a user without restrictions', async () => {
      const session = await register();

      const { body } = await as(session).catalogue().expect(200);

      expect(body.hiddenCount).toBe(0);
      expect(body.recipes).toHaveLength(RECIPE_COUNT);
      const listed = names(body.recipes);
      expect(listed).toEqual(
        [...listed].sort((a, b) => a.localeCompare(b, 'es')),
      );
    });

    it('gives what the list shows of each recipe, with no made-up rating', async () => {
      const session = await register();

      const { body } = await as(session).catalogue().expect(200);

      expect(
        body.recipes.find(({ id }: Summary) => id === 'rec_tortilla_patatas'),
      ).toEqual({
        id: 'rec_tortilla_patatas',
        name: 'Tortilla de patatas',
        imageUrl: null,
        totalMinutes: 45,
        mainIngredients: [
          { id: 'ing_patata', name: 'Patata' },
          { id: 'ing_huevo', name: 'Huevo' },
          { id: 'ing_cebolla', name: 'Cebolla' },
        ],
        allergensUncertain: false,
        rating: null,
        // Estimated, as in the detail.
        caloriesPerServing: expect.any(Number),
      });
    });

    it('marks the recipes with a processed food whose allergens are uncertain', async () => {
      const session = await register();

      const { body } = await as(session).catalogue().expect(200);
      const uncertain = (id: string) =>
        body.recipes.find((recipe: Summary) => recipe.id === id)
          .allergensUncertain;

      // Bread varies with the brand.
      expect(uncertain('rec_gazpacho')).toBe(true);
      expect(uncertain('rec_hummus')).toBe(false);
    });

    it('hides the recipes with a restricted allergen and says how many', async () => {
      const session = await register();
      await as(session).restrict(['EGG']);

      const { body } = await as(session).catalogue().expect(200);

      expect(body.hiddenCount).toBe(WITH_EGG.length);
      expect(body.recipes).toHaveLength(RECIPE_COUNT - WITH_EGG.length);
      for (const name of WITH_EGG) {
        expect(names(body.recipes)).not.toContain(name);
      }
    });

    it('hides the recipes with a restricted ingredient', async () => {
      const session = await register();
      await as(session).restrict([], ['ing_garbanzos']);

      const { body } = await as(session).catalogue().expect(200);

      expect(names(body.recipes)).not.toContain('Hummus');
      expect(names(body.recipes)).not.toContain('Garbanzos con espinacas');
      expect(body.hiddenCount).toBe(2);
    });

    it('hides a recipe whose uncertain ingredient lists a restricted allergen', async () => {
      const session = await register();
      await as(session).restrict(['GLUTEN']);

      const { body } = await as(session).catalogue().expect(200);

      expect(names(body.recipes)).not.toContain('Gazpacho andaluz');
    });
  });

  describe('GET /recipes with a search and filters', () => {
    type Listed = Summary & {
      totalMinutes: number;
      caloriesPerServing: number | null;
    };
    const listed = (body: { recipes: Listed[] }) => body.recipes;

    it('finds recipes by name without minding case or accents', async () => {
      const session = await register();

      const { body } = await as(session)
        .catalogue({ search: 'SALMON' })
        .expect(200);

      expect(names(body.recipes)).toEqual([
        'Salmón a la plancha con espárragos',
      ]);
    });

    it('finds recipes by an ingredient or a synonym of it', async () => {
      const session = await register();
      const withPotato = (
        await prisma.recipe.findMany({
          where: { ingredients: { some: { ingredientId: 'ing_patata' } } },
          select: { name: true },
          orderBy: { name: 'asc' },
        })
      ).map(({ name }) => name);

      const byIngredient = await as(session)
        .catalogue({ search: 'patata' })
        .expect(200);
      const bySynonym = await as(session)
        .catalogue({ search: 'papa' })
        .expect(200);

      expect(withPotato).toContain('Tortilla de patatas');
      expect(names(byIngredient.body.recipes)).toEqual(withPotato);
      expect(names(bySynonym.body.recipes)).toEqual(withPotato);
    });

    it('combines the filters', async () => {
      const session = await register();

      const { body } = await as(session)
        .catalogue({ maxMinutes: 20, maxCalories: 400, diet: 'VEGAN' })
        .expect(200);

      expect(listed(body).length).toBeGreaterThan(0);
      for (const recipe of listed(body)) {
        expect(recipe.totalMinutes, recipe.name).toBeLessThanOrEqual(20);
        expect(recipe.caloriesPerServing, recipe.name).not.toBeNull();
        expect(recipe.caloriesPerServing!, recipe.name).toBeLessThanOrEqual(
          400,
        );
      }
      expect(names(body.recipes)).not.toContain('Revuelto de setas');
    });

    it('sorts by time or by calories, the unknown calories last', async () => {
      const session = await register();

      const byTime = listed(
        (await as(session).catalogue({ sort: 'TIME' }).expect(200)).body,
      );
      const byCalories = listed(
        (await as(session).catalogue({ sort: 'CALORIES' }).expect(200)).body,
      );

      const minutes = byTime.map(({ totalMinutes }) => totalMinutes);
      expect(minutes).toEqual([...minutes].sort((a, b) => a - b));
      const known = byCalories
        .map(({ caloriesPerServing }) => caloriesPerServing)
        .filter((calories) => calories !== null);
      expect(known).toEqual([...known].sort((a, b) => a - b));
      expect(
        byCalories
          .slice(known.length)
          .every(({ caloriesPerServing }) => caloriesPerServing === null),
      ).toBe(true);
    });

    it('never finds a recipe hidden by the restrictions', async () => {
      const session = await register();
      await as(session).restrict(['EGG']);

      const { body } = await as(session)
        .catalogue({ search: 'tortilla' })
        .expect(200);

      expect(body.recipes).toEqual([]);
      expect(body.hiddenCount).toBe(WITH_EGG.length);
    });

    it('rejects invalid filters', async () => {
      const session = await register();

      await as(session).catalogue({ maxMinutes: 0 }).expect(400);
      await as(session).catalogue({ maxCalories: 'mucho' }).expect(400);
      await as(session).catalogue({ diet: 'FLEXITARIAN' }).expect(400);
      await as(session).catalogue({ sort: 'RATING' }).expect(400);
      await as(session)
        .catalogue({ search: 'a'.repeat(101) })
        .expect(400);
      await as(session).catalogue({ unknown: 'x' }).expect(400);
    });

    it('filters the recipes against the pantry too', async () => {
      const session = await register();

      const { body } = await as(session)
        .pantry(TODAY, { search: 'tortilla' })
        .expect(200);

      expect(names(body.recipes)).toEqual(['Tortilla de patatas']);
    });
  });

  describe('GET /recipes/:id', () => {
    it('gives the ingredients and steps in order, with quantities for the servings', async () => {
      const session = await register();

      const { body } = await as(session)
        .detail('rec_tortilla_patatas')
        .expect(200);

      expect(body).toMatchObject({
        id: 'rec_tortilla_patatas',
        name: 'Tortilla de patatas',
        imageUrl: null,
        totalMinutes: 45,
        servings: 4,
        rating: null,
        safety: {
          conflictingAllergens: [],
          conflictingIngredients: [],
          allergensUncertain: false,
        },
      });
      expect(body.description).toEqual(expect.any(String));
      expect(
        body.ingredients.map(
          ({ ingredient, quantity, unit, note, main }: never) => [
            (ingredient as Summary).name,
            quantity,
            unit,
            note,
            main,
          ],
        ),
      ).toEqual([
        ['Patata', 4, 'PIECE', 'medianas', true],
        ['Huevo', 6, 'PIECE', null, true],
        ['Cebolla', 1, 'PIECE', null, true],
        ['Aceite de oliva', 200, 'MILLILITER', null, false],
        ['Sal', null, null, 'al gusto', false],
      ]);
      // Ingredients leave the API as everywhere else, with their allergens.
      expect(body.ingredients[1].ingredient).toMatchObject({
        id: 'ing_huevo',
        allergens: ['EGG'],
        units: ['PIECE'],
      });
      expect(body.steps).toHaveLength(4);
      expect(body.steps[0]).toMatch(/^Pela las patatas/);
    });

    it('opens a recipe hidden from the catalogue, with its conflicts', async () => {
      const session = await register();
      await as(session).restrict(['EGG', 'MILK'], ['ing_patata']);

      const { body } = await as(session)
        .detail('rec_tortilla_patatas')
        .expect(200);

      expect(body.safety).toEqual({
        conflictingAllergens: ['EGG'],
        conflictingIngredients: [{ id: 'ing_patata', name: 'Patata' }],
        allergensUncertain: false,
      });
    });

    it('estimates the calories and protein of a serving from its ingredients', async () => {
      const session = await register();

      const { body } = await as(session)
        .detail('rec_tortilla_patatas')
        .expect(200);

      // 720 g of potato, 330 g of egg, 150 g of onion and 184 g of oil, for
      // 4 servings; the salt goes to taste.
      expect(body.nutrition).toEqual({
        perServing: { calories: 678, protein: 14.4 },
        estimated: true,
        missingIngredients: [],
        excludesToTaste: true,
      });
      expect(body.goals).toEqual([]);
    });

    it('compares a serving with the goals in use only', async () => {
      const session = await register();
      await as(session).setGoals({
        dailyCalories: { value: 2000, enabled: true },
        mealCalories: { value: 600, enabled: true },
        dailyProtein: { value: 120, enabled: false },
      });

      const { body } = await as(session)
        .detail('rec_tortilla_patatas')
        .expect(200);

      expect(body.goals).toEqual([
        {
          kind: 'DAILY_CALORIES',
          target: 2000,
          comparable: true,
          percent: 34,
          withinGoal: null,
        },
        {
          kind: 'MEAL_CALORIES',
          target: 600,
          comparable: true,
          percent: null,
          withinGoal: false,
        },
      ]);
    });

    it('answers 404 for a recipe that is not in the catalogue', async () => {
      const session = await register();

      const { body } = await as(session).detail('rec_unknown').expect(404);

      expect(body.code).toBe('recipe_not_found');
    });
  });

  describe('GET /recipes/pantry', () => {
    type PantryRecipe = Summary & {
      pantry: {
        canPrepare: boolean;
        missing: { ingredient: Summary; have: unknown; expired: boolean }[];
        checkQuantity: Summary[];
        checkToTaste: Summary[];
        using: { ingredient: Summary; expiresOn: string | null }[];
      };
    };
    const tortilla = (recipes: PantryRecipe[]) =>
      recipes.find(({ id }) => id === 'rec_tortilla_patatas')!;
    const ids = (list: Summary[]) => list.map(({ id }) => id);

    it('needs a valid day of the user', async () => {
      const session = await register();

      await http()
        .get('/recipes/pantry')
        .set({ Authorization: `Bearer ${session.accessToken}` })
        .expect(400);
      await as(session).pantry('16-10-2026').expect(400);
      await as(session).pantry('2026-02-30').expect(400);
    });

    it('says when the pantry is empty, with every apt recipe missing something', async () => {
      const session = await register();

      const { body } = await as(session).pantry().expect(200);

      expect(body.inventoryEmpty).toBe(true);
      expect(body.recipes).toHaveLength(RECIPE_COUNT);
      expect(
        body.recipes.every(
          ({ pantry }: PantryRecipe) =>
            !pantry.canPrepare && pantry.using.length === 0,
        ),
      ).toBe(true);
    });

    it('can prepare a recipe with what there is at home', async () => {
      const session = await register();
      await as(session).stock('ing_patata', 6, 'PIECE');
      await as(session).stock('ing_huevo', 12, 'PIECE', {
        expiresOn: '2026-10-18',
        dateKind: 'USE_BY',
      });
      await as(session).stock('ing_cebolla', 2, 'PIECE');
      await as(session).stock('ing_aceite_de_oliva', null, null);

      const { body } = await as(session).pantry().expect(200);

      const { pantry } = tortilla(body.recipes);
      expect(body.inventoryEmpty).toBe(false);
      expect(pantry.canPrepare).toBe(true);
      expect(pantry.missing).toEqual([]);
      expect(ids(pantry.checkToTaste)).toEqual(['ing_sal']);
      expect(pantry.using).toContainEqual({
        ingredient: { id: 'ing_huevo', name: 'Huevo' },
        expiresOn: '2026-10-18',
        dateKind: 'USE_BY',
      });
    });

    it('says what is missing, what is not enough and what has expired', async () => {
      const session = await register();
      await as(session).stock('ing_patata', 1, 'KILOGRAM');
      await as(session).stock('ing_huevo', 3, 'PIECE');
      await as(session).stock('ing_cebolla', 1, 'PIECE', {
        expiresOn: TODAY,
        dateKind: 'USE_BY',
      });

      const { body } = await as(session).pantry().expect(200);

      const { pantry } = tortilla(body.recipes);
      expect(pantry.canPrepare).toBe(false);
      expect(pantry.missing).toEqual([
        {
          ingredient: { id: 'ing_huevo', name: 'Huevo' },
          needed: { quantity: 6, unit: 'PIECE' },
          have: { quantity: 3, unit: 'PIECE' },
          expired: false,
        },
        {
          ingredient: { id: 'ing_cebolla', name: 'Cebolla' },
          needed: { quantity: 1, unit: 'PIECE' },
          have: null,
          expired: true,
        },
        {
          ingredient: { id: 'ing_aceite_de_oliva', name: 'Aceite de oliva' },
          needed: { quantity: 200, unit: 'MILLILITER' },
          have: null,
          expired: false,
        },
      ]);
      expect(ids(pantry.checkQuantity)).toEqual(['ing_patata']);
    });

    it('reads only the pantry of the user', async () => {
      const other = await register({ ...ana, email: 'otra@example.com' });
      await as(other).stock('ing_huevo', 12, 'PIECE');
      const session = await register();

      const { body } = await as(session).pantry().expect(200);

      expect(body.inventoryEmpty).toBe(true);
      expect(tortilla(body.recipes).pantry.missing).toHaveLength(4);
    });

    it('hides the recipes that clash with the restrictions', async () => {
      const session = await register();
      await as(session).restrict(['EGG']);

      const { body } = await as(session).pantry().expect(200);

      expect(body.hiddenCount).toBe(WITH_EGG.length);
      expect(ids(body.recipes)).not.toContain('rec_tortilla_patatas');
    });
  });

  describe('GET /recipes/recommendations', () => {
    type Recommended = Summary & {
      allergensUncertain: boolean;
      description: string;
      servings: number;
      likedIngredients: Summary[];
      pantry: { canPrepare: boolean };
      perServing: { calories: number | null; protein: number | null };
      goals: { kind: string; withinGoal: boolean | null }[];
    };
    const ids = (recipes: Summary[]) => recipes.map(({ id }) => id);
    // Recipes of the catalogue with some ingredient of these origins.
    const recipesWith = async (origins: ('MEAT' | 'FISH')[]) =>
      (
        await prisma.recipe.findMany({
          where: {
            ingredients: { some: { ingredient: { origin: { in: origins } } } },
          },
          select: { id: true },
        })
      ).map(({ id }) => id);

    it('needs a valid day of the user', async () => {
      const session = await register();

      await http()
        .get('/recipes/recommendations')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .expect(400);
      await as(session).recommendations('2026-02-30').expect(400);
      // The recommendations take no filters.
      await http()
        .get('/recipes/recommendations')
        .query({ today: TODAY, search: 'tortilla' })
        .set('Authorization', `Bearer ${session.accessToken}`)
        .expect(400);
    });

    it('recommends every recipe to a user with no profile, unverified allergens last', async () => {
      const session = await register();

      const { body } = await as(session).recommendations().expect(200);

      expect(body.recipes).toHaveLength(RECIPE_COUNT);
      expect(body.hiddenCount).toBe(0);
      expect(body.excludedCount).toBe(0);
      const uncertain = (body.recipes as Recommended[]).map(
        ({ allergensUncertain }) => allergensUncertain,
      );
      expect(uncertain).toEqual([...uncertain].sort());
      const tortilla = (body.recipes as Recommended[]).find(
        ({ id }) => id === 'rec_tortilla_patatas',
      );
      expect(tortilla).toMatchObject({
        name: 'Tortilla de patatas',
        servings: expect.any(Number),
        description: expect.any(String),
        likedIngredients: [],
        pantry: { canPrepare: false },
        perServing: { calories: expect.any(Number) },
        goals: [],
      });
    });

    it('hides the recipes that clash with the restrictions', async () => {
      const session = await register();
      await as(session).restrict(['EGG']);

      const { body } = await as(session).recommendations().expect(200);

      expect(body.hiddenCount).toBe(WITH_EGG.length);
      expect(ids(body.recipes)).not.toContain('rec_tortilla_patatas');
    });

    it('leaves out the recipes the diet does not allow and counts them', async () => {
      const session = await register();
      await as(session).setTastes({ diet: 'VEGETARIAN' });
      const withMeatOrFish = await recipesWith(['MEAT', 'FISH']);

      const { body } = await as(session).recommendations().expect(200);

      expect(withMeatOrFish).toContain('rec_pollo_al_horno');
      expect(body.excludedCount).toBe(withMeatOrFish.length);
      expect(body.recipes).toHaveLength(RECIPE_COUNT - withMeatOrFish.length);
      for (const id of withMeatOrFish) {
        expect(ids(body.recipes)).not.toContain(id);
      }
    });

    it('leaves out eggs and dairy on a vegan diet', async () => {
      const session = await register();
      await as(session).setTastes({ diet: 'VEGAN' });

      const { body } = await as(session).recommendations().expect(200);

      expect(ids(body.recipes)).not.toContain('rec_arroz_con_leche');
      expect(ids(body.recipes)).not.toContain('rec_tortilla_patatas');
      expect(ids(body.recipes)).toContain('rec_hummus');
    });

    it('leaves out the recipes with a food the user does not like', async () => {
      const session = await register();
      await as(session).setTastes({ avoidedIngredientIds: ['ing_cebolla'] });
      const withOnion = (
        await prisma.recipeIngredient.findMany({
          where: { ingredientId: 'ing_cebolla' },
          distinct: ['recipeId'],
          select: { recipeId: true },
        })
      ).map(({ recipeId }) => recipeId);

      const { body } = await as(session).recommendations().expect(200);

      expect(withOnion).toContain('rec_tortilla_patatas');
      expect(body.excludedCount).toBe(withOnion.length);
      for (const id of withOnion) {
        expect(ids(body.recipes)).not.toContain(id);
      }
    });

    it('moves up the recipes with liked ingredients', async () => {
      const session = await register();
      await as(session).setTastes({ likedIngredientIds: ['ing_aguacate'] });

      const { body } = await as(session).recommendations().expect(200);

      expect((body.recipes[0] as Recommended).likedIngredients).toEqual([
        { id: 'ing_aguacate', name: 'Aguacate' },
      ]);
    });

    it('moves up a recipe that can be prepared with the pantry', async () => {
      const session = await register();
      await as(session).stock('ing_patata', 6, 'PIECE');
      await as(session).stock('ing_huevo', 12, 'PIECE');
      await as(session).stock('ing_cebolla', 2, 'PIECE');
      await as(session).stock('ing_aceite_de_oliva', null, null);

      const { body } = await as(session).recommendations().expect(200);

      expect(body.recipes[0]).toMatchObject({
        id: 'rec_tortilla_patatas',
        pantry: { canPrepare: true },
      });
    });

    it('moves down the recipes over the goal per meal', async () => {
      const session = await register();
      await as(session).setGoals({
        mealCalories: { value: 600, enabled: true },
      });

      const { body } = await as(session).recommendations().expect(200);

      const fits = (body.recipes as Recommended[]).map(
        ({ goals }) => goals[0].withinGoal,
      );
      const tortilla = ids(body.recipes).indexOf('rec_tortilla_patatas');
      expect(fits[tortilla]).toBe(false);
      expect(fits.slice(tortilla).every((fit) => fit !== true)).toBe(true);
    });

    it('reads only the profile of the user', async () => {
      const other = await register({ ...ana, email: 'otra@example.com' });
      await as(other).setTastes({
        diet: 'VEGAN',
        likedIngredientIds: ['ing_aguacate'],
      });
      await as(other).stock('ing_huevo', 12, 'PIECE');
      const session = await register();

      const { body } = await as(session).recommendations().expect(200);

      expect(body.recipes).toHaveLength(RECIPE_COUNT);
      expect(
        (body.recipes as Recommended[]).every(
          ({ likedIngredients }) => likedIngredients.length === 0,
        ),
      ).toBe(true);
    });
  });

  describe('ingredient origins', () => {
    it('follow the category, with the animal products it does not give away', async () => {
      const origins = Object.fromEntries(
        (
          await prisma.ingredient.findMany({
            select: { id: true, origin: true },
          })
        ).map(({ id, origin }) => [id, origin]),
      );

      expect(origins).toMatchObject({
        ing_pollo: 'MEAT',
        ing_merluza: 'FISH',
        ing_gambas: 'FISH',
        ing_queso: 'ANIMAL_PRODUCT',
        ing_mayonesa: 'ANIMAL_PRODUCT',
        ing_chocolate: 'ANIMAL_PRODUCT',
        ing_miel: 'ANIMAL_PRODUCT',
        ing_caldo_de_pollo: 'MEAT',
        ing_caldo_de_verduras: 'PLANT',
        ing_tofu: 'PLANT',
      });
    });
  });

  describe('catalogue seed', () => {
    it('is consistent', async () => {
      const recipes = await prisma.recipe.findMany({
        include: {
          ingredients: {
            orderBy: { position: 'asc' },
            include: { ingredient: true },
          },
          steps: { orderBy: { position: 'asc' } },
        },
      });

      expect(recipes).toHaveLength(RECIPE_COUNT);
      for (const recipe of recipes) {
        const where = recipe.id;
        expect(recipe.totalMinutes, where).toBeGreaterThan(0);
        expect(recipe.servings, where).toBeGreaterThan(0);
        expect(
          recipe.ingredients.map(({ position }) => position),
          where,
        ).toEqual(recipe.ingredients.map((_, index) => index + 1));
        expect(
          recipe.steps.map(({ position }) => position),
          where,
        ).toEqual(recipe.steps.map((_, index) => index + 1));
        expect(recipe.steps.length, where).toBeGreaterThan(0);
        expect(
          recipe.ingredients.some(({ main }) => main),
          where,
        ).toBe(true);

        for (const line of recipe.ingredients) {
          const what = `${where} ${line.ingredient.id}`;
          // A quantity and its unit go together.
          expect(line.quantity === null, what).toBe(line.unit === null);
          if (line.unit !== null) {
            expect(
              [...MEASURE_UNITS[line.ingredient.measure], ...RECIPE_ONLY_UNITS],
              what,
            ).toContain(line.unit);
            expect(line.quantity!.toNumber(), what).toBeGreaterThan(0);
          }
        }
      }
    });

    it('has the nutrition data of every recipe', async () => {
      const session = await register();
      const { body } = await as(session).catalogue().expect(200);

      for (const { id } of body.recipes as Summary[]) {
        const detail = await as(session).detail(id).expect(200);
        expect(detail.body.nutrition.missingIngredients, id).toEqual([]);
        expect(detail.body.nutrition.perServing.calories, id).toBeGreaterThan(
          0,
        );
        expect(detail.body.nutrition.perServing.protein, id).not.toBeNull();
      }
    });
  });
});
