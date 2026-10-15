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

const plain = { allergens: [], allergensUncertain: false };
const tomate = {
  id: 'ing_tomate',
  name: 'Tomate',
  category: 'VEGETABLE',
  allergens: ['HISTAMINE'],
  allergensUncertain: false,
  defaultUnit: 'PIECE',
};
const ajo = {
  id: 'ing_ajo',
  name: 'Ajo',
  category: 'VEGETABLE',
  defaultUnit: 'PIECE',
  ...plain,
};
const pollo = {
  id: 'ing_pollo',
  name: 'Pollo',
  category: 'MEAT',
  defaultUnit: 'GRAM',
  ...plain,
};
const cilantro = {
  id: 'ing_cilantro',
  name: 'Cilantro',
  category: 'HERB_SPICE',
  defaultUnit: 'GRAM',
  ...plain,
};

const nothing = {
  diet: null,
  likedIngredientIds: [],
  avoidedIngredientIds: [],
};

type Session = { accessToken: string; refreshToken: string };

// The ingredient catalogue is inserted by the migrations and never reset.
describe('Food preferences (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const http = () => request(app.getHttpServer());
  const as = (session: Session) => ({
    get: () =>
      http()
        .get('/food-preferences')
        .set('Authorization', `Bearer ${session.accessToken}`),
    put: (body: object) =>
      http()
        .put('/food-preferences')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send(body),
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

  describe('GET /food-preferences', () => {
    it('is empty for a user who has not configured anything', async () => {
      const session = await register();

      const response = await as(session).get().expect(200);

      expect(response.body).toEqual({ diet: null, liked: [], avoided: [] });
    });
  });

  describe('PUT /food-preferences', () => {
    it('saves the diet and both lists, each ordered by name', async () => {
      const session = await register();

      const saved = await as(session)
        .put({
          diet: 'VEGETARIAN',
          likedIngredientIds: [tomate.id, ajo.id],
          avoidedIngredientIds: [pollo.id, cilantro.id],
        })
        .expect(200);

      const expected = {
        diet: 'VEGETARIAN',
        liked: [ajo, tomate],
        avoided: [cilantro, pollo],
      };
      expect(saved.body).toEqual(expected);
      expect((await as(session).get().expect(200)).body).toEqual(expected);
    });

    it('replaces what was saved before', async () => {
      const session = await register();
      await as(session)
        .put({
          diet: 'VEGAN',
          likedIngredientIds: [tomate.id, ajo.id],
          avoidedIngredientIds: [pollo.id],
        })
        .expect(200);

      // Tomato moves to the other list, garlic and chicken are dropped.
      await as(session)
        .put({
          diet: 'FLEXITARIAN',
          likedIngredientIds: [cilantro.id],
          avoidedIngredientIds: [tomate.id],
        })
        .expect(200);

      expect((await as(session).get().expect(200)).body).toEqual({
        diet: 'FLEXITARIAN',
        liked: [cilantro],
        avoided: [tomate],
      });
    });

    it('clears the preferences', async () => {
      const session = await register();
      await as(session)
        .put({
          diet: 'PESCATARIAN',
          likedIngredientIds: [tomate.id],
          avoidedIngredientIds: [pollo.id],
        })
        .expect(200);

      const response = await as(session).put(nothing).expect(200);

      expect(response.body).toEqual({ diet: null, liked: [], avoided: [] });
      expect(await prisma.ingredientPreference.count()).toBe(0);
    });

    it.each([
      ['an unknown diet', { ...nothing, diet: 'CARNIVORE' }],
      ['a missing diet', { likedIngredientIds: [], avoidedIngredientIds: [] }],
      ['a missing list', { diet: null, likedIngredientIds: [] }],
      ['a list that is not one', { ...nothing, likedIngredientIds: 'ing_ajo' }],
      ['an id that is not text', { ...nothing, avoidedIngredientIds: [7] }],
      ['an empty id', { ...nothing, likedIngredientIds: [''] }],
      [
        'a repeated ingredient',
        { ...nothing, likedIngredientIds: [ajo.id, ajo.id] },
      ],
      [
        'more than 100 ingredients in a list',
        {
          ...nothing,
          likedIngredientIds: Array.from({ length: 101 }, (_, i) => `ing_${i}`),
        },
      ],
      ['an unexpected field', { ...nothing, userId: 'someone-else' }],
    ])('rejects %s', async (_case, body) => {
      const session = await register();

      await as(session).put(body).expect(400);
    });

    it('rejects an ingredient that is in both lists and keeps what was saved', async () => {
      const session = await register();
      await as(session)
        .put({ ...nothing, diet: 'VEGAN', likedIngredientIds: [ajo.id] })
        .expect(200);

      const response = await as(session)
        .put({
          diet: null,
          likedIngredientIds: [tomate.id],
          avoidedIngredientIds: [tomate.id],
        })
        .expect(400);

      expect(response.body.code).toBe('ingredient_in_both_lists');
      expect((await as(session).get().expect(200)).body).toEqual({
        diet: 'VEGAN',
        liked: [ajo],
        avoided: [],
      });
    });

    it('rejects an ingredient that is not in the catalogue', async () => {
      const session = await register();

      const response = await as(session)
        .put({ ...nothing, likedIngredientIds: [tomate.id, 'ing_unicornio'] })
        .expect(400);

      expect(response.body.code).toBe('unknown_ingredient');
      expect(await prisma.ingredientPreference.count()).toBe(0);
    });
  });

  describe('access', () => {
    it('rejects requests without a valid access token', async () => {
      await http().get('/food-preferences').expect(401);
      await http().put('/food-preferences').send(nothing).expect(401);
      await http()
        .get('/food-preferences')
        .set('Authorization', 'Bearer not-a-token')
        .expect(401);
    });

    it('keeps the preferences of each user apart', async () => {
      const anaSession = await register(ana);
      const luisSession = await register(luis);
      await as(anaSession)
        .put({ ...nothing, diet: 'VEGAN', likedIngredientIds: [tomate.id] })
        .expect(200);

      await as(luisSession)
        .put({ ...nothing, avoidedIngredientIds: [tomate.id] })
        .expect(200);

      expect((await as(anaSession).get().expect(200)).body).toEqual({
        diet: 'VEGAN',
        liked: [tomate],
        avoided: [],
      });
      expect((await as(luisSession).get().expect(200)).body).toEqual({
        diet: null,
        liked: [],
        avoided: [tomate],
      });
    });
  });

  // docs/data-retention-policy.md: preferences are private data.
  describe('account deletion', () => {
    it('removes the preferences of the account and nothing else', async () => {
      const anaSession = await register(ana);
      const luisSession = await register(luis);
      await as(anaSession)
        .put({
          diet: 'VEGAN',
          likedIngredientIds: [tomate.id],
          avoidedIngredientIds: [pollo.id],
        })
        .expect(200);
      await as(luisSession)
        .put({ ...nothing, likedIngredientIds: [tomate.id] })
        .expect(200);
      const catalogueSize = await prisma.ingredient.count();

      await http()
        .post('/account/delete')
        .set('Authorization', `Bearer ${anaSession.accessToken}`)
        .send({ currentPassword: ana.password })
        .expect(204);

      const remaining = await prisma.ingredientPreference.findMany({
        include: { user: true },
      });
      expect(remaining).toHaveLength(1);
      expect(remaining[0].user.email).toBe(luis.email);
      expect(await prisma.ingredient.count()).toBe(catalogueSize);
      await as(anaSession).get().expect(401);
    });
  });
});
