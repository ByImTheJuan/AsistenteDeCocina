import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/prisma/prisma.service.js';
import { setupApp } from './../src/setup-app.js';

const ana = {
  name: 'Ana',
  email: 'ana@example.com',
  password: 'correct horse battery',
};
const luis = {
  name: 'Luis',
  email: 'luis@example.com',
  password: 'another long password',
};

const kiwi = {
  id: 'ing_kiwi',
  name: 'Kiwi',
  category: 'FRUIT',
  allergens: ['FRUCTOSE', 'HISTAMINE'],
  allergensUncertain: false,
  defaultUnit: 'PIECE',
  units: ['PIECE', 'GRAM', 'KILOGRAM'],
};
const pollo = {
  id: 'ing_pollo',
  name: 'Pollo',
  category: 'MEAT',
  allergens: [],
  allergensUncertain: false,
  defaultUnit: 'GRAM',
  units: ['GRAM', 'KILOGRAM'],
};
const leche = {
  id: 'ing_leche',
  name: 'Leche',
  category: 'DAIRY_EGG',
  allergens: ['MILK', 'LACTOSE'],
  allergensUncertain: false,
  defaultUnit: 'LITER',
  units: ['MILLILITER', 'LITER'],
};
const almendras = {
  id: 'ing_almendras',
  name: 'Almendras',
  category: 'NUT_SEED',
  allergens: ['TREE_NUTS'],
  allergensUncertain: false,
  defaultUnit: 'GRAM',
  units: ['GRAM', 'KILOGRAM'],
};

const nothing = { allergens: [], ingredientIds: [] };
const empty = {
  allergens: [],
  ingredients: [],
  conflictingLikedIngredients: [],
};

type Session = { accessToken: string; refreshToken: string };

// The ingredient catalogue and its allergens are inserted by the migrations
// and never reset.
describe('Dietary restrictions (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const http = () => request(app.getHttpServer());
  const authorized = (session: Session, method: 'get' | 'put', path: string) =>
    http()[method](path).set('Authorization', `Bearer ${session.accessToken}`);
  const as = (session: Session) => ({
    get: () => authorized(session, 'get', '/dietary-restrictions'),
    put: (body: object) =>
      authorized(session, 'put', '/dietary-restrictions').send(body),
    like: (likedIngredientIds: string[]) =>
      authorized(session, 'put', '/food-preferences')
        .send({ diet: null, likedIngredientIds, avoidedIngredientIds: [] })
        .expect(200),
  });
  const register = async (account = ana): Promise<Session> =>
    (await http().post('/auth/register').send(account).expect(201)).body;

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

  describe('GET /dietary-restrictions', () => {
    it('is empty for a user who has not registered any', async () => {
      const session = await register();

      const response = await as(session).get().expect(200);

      expect(response.body).toEqual(empty);
    });
  });

  describe('PUT /dietary-restrictions', () => {
    it('saves allergens and ingredients, in a stable order', async () => {
      const session = await register();

      const saved = await as(session)
        .put({
          allergens: ['LACTOSE', 'GLUTEN', 'TREE_NUTS'],
          ingredientIds: [pollo.id, kiwi.id],
        })
        .expect(200);

      const expected = {
        // The order of the list of allergens, then ingredients by name.
        allergens: ['GLUTEN', 'TREE_NUTS', 'LACTOSE'],
        ingredients: [kiwi, pollo],
        conflictingLikedIngredients: [],
      };
      expect(saved.body).toEqual(expected);
      expect((await as(session).get().expect(200)).body).toEqual(expected);
    });

    it('replaces what was saved before', async () => {
      const session = await register();
      await as(session)
        .put({ allergens: ['EGG', 'FISH'], ingredientIds: [kiwi.id] })
        .expect(200);

      await as(session)
        .put({ allergens: ['FISH', 'SESAME'], ingredientIds: [pollo.id] })
        .expect(200);

      expect((await as(session).get().expect(200)).body).toEqual({
        allergens: ['FISH', 'SESAME'],
        ingredients: [pollo],
        conflictingLikedIngredients: [],
      });
    });

    it('clears the restrictions', async () => {
      const session = await register();
      await as(session)
        .put({ allergens: ['PEANUTS'], ingredientIds: [kiwi.id] })
        .expect(200);

      const response = await as(session).put(nothing).expect(200);

      expect(response.body).toEqual(empty);
      expect(await prisma.allergenRestriction.count()).toBe(0);
      expect(await prisma.ingredientRestriction.count()).toBe(0);
    });

    it('accepts every allergen of the list', async () => {
      const session = await register();
      const all = [
        'GLUTEN',
        'CRUSTACEANS',
        'EGG',
        'FISH',
        'PEANUTS',
        'SOY',
        'MILK',
        'TREE_NUTS',
        'CELERY',
        'MUSTARD',
        'SESAME',
        'SULPHITES',
        'LUPIN',
        'MOLLUSCS',
        'LACTOSE',
        'FRUCTOSE',
        'HISTAMINE',
        'SORBITOL',
      ];

      const response = await as(session)
        .put({ allergens: [...all].reverse(), ingredientIds: [] })
        .expect(200);

      expect(response.body.allergens).toEqual(all);
    });

    it.each([
      ['an unknown allergen', { ...nothing, allergens: ['PINEAPPLE'] }],
      ['a repeated allergen', { ...nothing, allergens: ['EGG', 'EGG'] }],
      ['allergens that are not a list', { ...nothing, allergens: 'EGG' }],
      ['a missing list of allergens', { ingredientIds: [] }],
      ['a missing list of ingredients', { allergens: [] }],
      ['an id that is not text', { ...nothing, ingredientIds: [7] }],
      ['an empty id', { ...nothing, ingredientIds: [''] }],
      [
        'a repeated ingredient',
        { ...nothing, ingredientIds: [kiwi.id, kiwi.id] },
      ],
      [
        'more than 100 ingredients',
        {
          ...nothing,
          ingredientIds: Array.from({ length: 101 }, (_, i) => `ing_${i}`),
        },
      ],
      ['an unexpected field', { ...nothing, userId: 'someone-else' }],
    ])('rejects %s', async (_case, body) => {
      const session = await register();

      await as(session).put(body).expect(400);
    });

    it('rejects an ingredient that is not in the catalogue and keeps what was saved', async () => {
      const session = await register();
      await as(session)
        .put({ allergens: ['EGG'], ingredientIds: [kiwi.id] })
        .expect(200);

      const response = await as(session)
        .put({ allergens: [], ingredientIds: [pollo.id, 'ing_unicornio'] })
        .expect(400);

      expect(response.body.code).toBe('unknown_ingredient');
      expect((await as(session).get().expect(200)).body).toEqual({
        allergens: ['EGG'],
        ingredients: [kiwi],
        conflictingLikedIngredients: [],
      });
    });
  });

  describe('conflicts with the food preferences', () => {
    it('reports a liked ingredient that is restricted itself', async () => {
      const session = await register();
      await as(session).like([kiwi.id, pollo.id]);

      const response = await as(session)
        .put({ allergens: [], ingredientIds: [kiwi.id] })
        .expect(200);

      expect(response.body.conflictingLikedIngredients).toEqual([kiwi]);
    });

    it('reports liked ingredients that contain a restricted allergen', async () => {
      const session = await register();
      await as(session).like([leche.id, almendras.id, pollo.id]);

      const response = await as(session)
        .put({ allergens: ['LACTOSE', 'TREE_NUTS'], ingredientIds: [] })
        .expect(200);

      expect(response.body.conflictingLikedIngredients).toEqual([
        almendras,
        leche,
      ]);
    });

    it('keeps the preference: the restriction does not delete it', async () => {
      const session = await register();
      await as(session).like([leche.id]);

      await as(session)
        .put({ allergens: ['MILK'], ingredientIds: [] })
        .expect(200);

      const preferences = await authorized(
        session,
        'get',
        '/food-preferences',
      ).expect(200);
      expect(preferences.body.liked).toEqual([leche]);
    });

    it('stops reporting a conflict once the restriction is removed', async () => {
      const session = await register();
      await as(session).like([leche.id]);
      await as(session)
        .put({ allergens: ['MILK'], ingredientIds: [] })
        .expect(200);

      const response = await as(session).put(nothing).expect(200);

      expect(response.body.conflictingLikedIngredients).toEqual([]);
    });

    it('does not report the ingredients the user would rather avoid', async () => {
      const session = await register();
      await authorized(session, 'put', '/food-preferences')
        .send({
          diet: null,
          likedIngredientIds: [],
          avoidedIngredientIds: [leche.id],
        })
        .expect(200);

      const response = await as(session)
        .put({ allergens: ['MILK'], ingredientIds: [] })
        .expect(200);

      expect(response.body.conflictingLikedIngredients).toEqual([]);
    });
  });

  describe('access', () => {
    it('rejects requests without a valid access token', async () => {
      await http().get('/dietary-restrictions').expect(401);
      await http().put('/dietary-restrictions').send(nothing).expect(401);
      await http()
        .get('/dietary-restrictions')
        .set('Authorization', 'Bearer not-a-token')
        .expect(401);
    });

    it('keeps the restrictions of each user apart', async () => {
      const anaSession = await register(ana);
      const luisSession = await register(luis);
      await as(luisSession).like([leche.id]);
      await as(anaSession)
        .put({ allergens: ['MILK'], ingredientIds: [kiwi.id] })
        .expect(200);

      await as(luisSession)
        .put({ allergens: ['FISH'], ingredientIds: [] })
        .expect(200);

      expect((await as(anaSession).get().expect(200)).body).toEqual({
        allergens: ['MILK'],
        ingredients: [kiwi],
        conflictingLikedIngredients: [],
      });
      // Ana's milk allergy says nothing about the milk Luis likes.
      expect((await as(luisSession).get().expect(200)).body).toEqual({
        allergens: ['FISH'],
        ingredients: [],
        conflictingLikedIngredients: [],
      });
    });
  });

  // docs/data-retention-policy.md: restrictions are private data.
  describe('account deletion', () => {
    it('removes the restrictions of the account and nothing else', async () => {
      const anaSession = await register(ana);
      const luisSession = await register(luis);
      await as(anaSession)
        .put({ allergens: ['MILK', 'EGG'], ingredientIds: [kiwi.id] })
        .expect(200);
      await as(luisSession)
        .put({ allergens: ['FISH'], ingredientIds: [pollo.id] })
        .expect(200);
      const catalogueSize = await prisma.ingredient.count();
      const mappingSize = await prisma.ingredientAllergen.count();

      await http()
        .post('/account/delete')
        .set('Authorization', `Bearer ${anaSession.accessToken}`)
        .send({ currentPassword: ana.password })
        .expect(204);

      expect(
        await prisma.allergenRestriction.findMany({
          select: { allergen: true, user: { select: { email: true } } },
        }),
      ).toEqual([{ allergen: 'FISH', user: { email: luis.email } }]);
      expect(
        await prisma.ingredientRestriction.findMany({
          select: { ingredientId: true, user: { select: { email: true } } },
        }),
      ).toEqual([{ ingredientId: pollo.id, user: { email: luis.email } }]);
      expect(await prisma.ingredient.count()).toBe(catalogueSize);
      expect(await prisma.ingredientAllergen.count()).toBe(mappingSize);
      await as(anaSession).get().expect(401);
    });
  });

  describe('allergens of the catalogue', () => {
    const allergensOf = async (id: string) => {
      const ingredient = await prisma.ingredient.findUniqueOrThrow({
        where: { id },
        include: { allergens: true },
      });
      return {
        allergens: ingredient.allergens.map(({ allergen }) => allergen).sort(),
        uncertain: ingredient.allergensUncertain,
      };
    };

    it.each([
      ['ing_leche', ['LACTOSE', 'MILK']],
      ['ing_almendras', ['TREE_NUTS']],
      ['ing_cacahuetes', ['HISTAMINE', 'PEANUTS']],
      ['ing_gambas', ['CRUSTACEANS', 'HISTAMINE', 'SULPHITES']],
      ['ing_mejillones', ['HISTAMINE', 'MOLLUSCS']],
      ['ing_merluza', ['FISH']],
      ['ing_huevo', ['EGG']],
      ['ing_harina_de_trigo', ['GLUTEN']],
      ['ing_tofu', ['SOY']],
      ['ing_apio', ['CELERY']],
      ['ing_semillas_de_sesamo', ['SESAME']],
      ['ing_pollo', []],
      ['ing_arroz', []],
    ])('knows what %s contains', async (id, allergens) => {
      expect(await allergensOf(id)).toEqual({ allergens, uncertain: false });
    });

    it.each([
      ['ing_salchichas', ['HISTAMINE', 'SULPHITES']],
      ['ing_pan', ['GLUTEN']],
      ['ing_salsa_de_soja', ['GLUTEN', 'HISTAMINE', 'SOY']],
      ['ing_mayonesa', ['EGG', 'MUSTARD']],
      ['ing_jamon_cocido', []],
    ])('marks %s as a food whose composition varies', async (id, allergens) => {
      expect(await allergensOf(id)).toEqual({ allergens, uncertain: true });
    });

    it('has the whole mapping of the migration', async () => {
      expect(await prisma.ingredientAllergen.count()).toBe(162);
      expect(
        await prisma.ingredient.count({ where: { allergensUncertain: true } }),
      ).toBe(22);
    });
  });
});
