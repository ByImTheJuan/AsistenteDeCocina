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

// The catalogue is inserted by the migrations and never reset. The tortilla
// has egg; the others do not.
const tortilla = 'rec_tortilla_patatas';
const gazpacho = 'rec_gazpacho';
const lentejas = 'rec_lentejas_verduras';

// A week from Monday to Sunday.
const week = { from: '2026-10-19', to: '2026-10-25' };

type Session = { accessToken: string; refreshToken: string };
type Entry = {
  id: string;
  date: string;
  meal: string;
  recipe: { id: string };
  recipeConflicts: boolean;
};

describe('Meal plan (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const http = () => request(app.getHttpServer());
  const as = (session: Session) => {
    const auth = { Authorization: `Bearer ${session.accessToken}` };
    return {
      list: (range: object = week) =>
        http().get('/meal-plan').query(range).set(auth),
      add: (body: object) => http().post('/meal-plan').set(auth).send(body),
      update: (id: string, body: object) =>
        http().put(`/meal-plan/${id}`).set(auth).send(body),
      remove: (id: string) => http().delete(`/meal-plan/${id}`).set(auth),
      restrict: (allergens: string[]) =>
        http()
          .put('/dietary-restrictions')
          .set(auth)
          .send({ allergens, ingredientIds: [] })
          .expect(200),
    };
  };
  const register = async (account = ana): Promise<Session> =>
    (await http().post('/auth/register').send(account).expect(201)).body;
  const summary = (entries: Entry[]) =>
    entries.map(({ date, meal, recipe }) => [date, meal, recipe.id]);
  const plan = async (session: Session, body: object): Promise<Entry> =>
    (await as(session).add(body).expect(201)).body;

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

  describe('GET /meal-plan', () => {
    it('is empty for a user who has not planned anything', async () => {
      const session = await register();

      expect((await as(session).list().expect(200)).body).toEqual({
        entries: [],
      });
    });

    it('lists the days of the range by day and meal of the day', async () => {
      const session = await register();
      await plan(session, {
        date: '2026-10-21',
        meal: 'DINNER',
        recipeId: gazpacho,
      });
      await plan(session, {
        date: '2026-10-20',
        meal: 'DINNER',
        recipeId: lentejas,
      });
      await plan(session, {
        date: '2026-10-20',
        meal: 'BREAKFAST',
        recipeId: tortilla,
      });
      await plan(session, {
        date: '2026-10-20',
        meal: 'LUNCH',
        recipeId: gazpacho,
      });
      // Outside the week, before and after it.
      await plan(session, {
        date: '2026-10-18',
        meal: 'LUNCH',
        recipeId: tortilla,
      });
      await plan(session, {
        date: '2026-10-26',
        meal: 'LUNCH',
        recipeId: tortilla,
      });

      const { body } = await as(session).list().expect(200);

      expect(summary(body.entries)).toEqual([
        ['2026-10-20', 'BREAKFAST', tortilla],
        ['2026-10-20', 'LUNCH', gazpacho],
        ['2026-10-20', 'DINNER', lentejas],
        ['2026-10-21', 'DINNER', gazpacho],
      ]);
    });

    it('includes both ends of the range', async () => {
      const session = await register();
      await plan(session, {
        date: week.from,
        meal: 'LUNCH',
        recipeId: tortilla,
      });
      await plan(session, { date: week.to, meal: 'LUNCH', recipeId: gazpacho });

      const { body } = await as(session).list().expect(200);

      expect(summary(body.entries)).toEqual([
        [week.from, 'LUNCH', tortilla],
        [week.to, 'LUNCH', gazpacho],
      ]);
    });

    it('returns each recipe with its summary', async () => {
      const session = await register();
      await plan(session, {
        date: '2026-10-20',
        meal: 'LUNCH',
        recipeId: tortilla,
      });

      const [entry] = (await as(session).list().expect(200)).body.entries;

      expect(entry).toEqual({
        id: expect.any(String),
        date: '2026-10-20',
        meal: 'LUNCH',
        recipe: expect.objectContaining({
          id: tortilla,
          name: 'Tortilla de patatas',
          totalMinutes: expect.any(Number),
          allergensUncertain: false,
          caloriesPerServing: expect.any(Number),
        }),
        recipeConflicts: false,
      });
    });

    it('keeps the plan for a new session of the same user', async () => {
      const session = await register();
      await plan(session, {
        date: '2026-10-20',
        meal: 'LUNCH',
        recipeId: tortilla,
      });

      const again: Session = (
        await http()
          .post('/auth/login')
          .send({ email: ana.email, password: ana.password })
          .expect(200)
      ).body;

      expect(
        summary((await as(again).list().expect(200)).body.entries),
      ).toEqual([['2026-10-20', 'LUNCH', tortilla]]);
    });

    it('accepts a range of 31 days and rejects a longer or backward one', async () => {
      const session = await register();

      await as(session)
        .list({ from: '2026-10-01', to: '2026-10-31' })
        .expect(200);
      await as(session)
        .list({ from: '2026-10-20', to: '2026-10-20' })
        .expect(200);
      for (const range of [
        { from: '2026-10-01', to: '2026-11-01' },
        { from: '2026-10-20', to: '2026-10-19' },
      ]) {
        const { body } = await as(session).list(range).expect(400);
        expect(body.code).toBe('invalid_range');
      }
    });

    it('rejects days that are missing or not YYYY-MM-DD', async () => {
      const session = await register();

      for (const range of [
        {},
        { from: '2026-10-19' },
        { from: '19/10/2026', to: '2026-10-25' },
        { from: '2026-02-30', to: '2026-03-01' },
        { from: '1999-12-31', to: '2000-01-01' },
      ]) {
        await as(session).list(range).expect(400);
      }
    });

    it('rejects requests without a valid access token', async () => {
      await http().get('/meal-plan').query(week).expect(401);
    });
  });

  describe('POST /meal-plan', () => {
    it('plans a recipe for a meal of a day', async () => {
      const session = await register();

      const { body } = await as(session)
        .add({ date: '2026-10-20', meal: 'BREAKFAST', recipeId: tortilla })
        .expect(201);

      expect(body).toMatchObject({
        date: '2026-10-20',
        meal: 'BREAKFAST',
        recipe: { id: tortilla },
        recipeConflicts: false,
      });
    });

    it('takes one recipe per meal of a day', async () => {
      const session = await register();
      await plan(session, {
        date: '2026-10-20',
        meal: 'LUNCH',
        recipeId: tortilla,
      });

      const { body } = await as(session)
        .add({ date: '2026-10-20', meal: 'LUNCH', recipeId: gazpacho })
        .expect(409);

      expect(body.code).toBe('meal_slot_taken');
      expect(
        summary((await as(session).list().expect(200)).body.entries),
      ).toEqual([['2026-10-20', 'LUNCH', tortilla]]);
    });

    it('lets the same recipe be planned for other meals and days', async () => {
      const session = await register();

      await plan(session, {
        date: '2026-10-20',
        meal: 'LUNCH',
        recipeId: tortilla,
      });
      await plan(session, {
        date: '2026-10-20',
        meal: 'DINNER',
        recipeId: tortilla,
      });
      await plan(session, {
        date: '2026-10-21',
        meal: 'LUNCH',
        recipeId: tortilla,
      });

      expect((await as(session).list().expect(200)).body.entries).toHaveLength(
        3,
      );
    });

    it('rejects a recipe that is not in the catalogue', async () => {
      const session = await register();

      const { body } = await as(session)
        .add({ date: '2026-10-20', meal: 'LUNCH', recipeId: 'rec_unknown' })
        .expect(400);

      expect(body.code).toBe('unknown_recipe');
    });

    it('rejects a recipe that clashes with the restrictions', async () => {
      const session = await register();
      await as(session).restrict(['EGG']);

      const { body } = await as(session)
        .add({ date: '2026-10-20', meal: 'LUNCH', recipeId: tortilla })
        .expect(409);

      expect(body.code).toBe('recipe_not_allowed');
      expect((await as(session).list().expect(200)).body.entries).toEqual([]);
    });

    it('rejects an invalid day, meal or recipe id', async () => {
      const session = await register();
      const valid = { date: '2026-10-20', meal: 'LUNCH', recipeId: tortilla };

      for (const body of [
        { ...valid, date: '20-10-2026' },
        { ...valid, date: '2026-13-01' },
        { ...valid, date: '2101-01-01' },
        { ...valid, date: null },
        { ...valid, meal: 'SNACK' },
        { ...valid, meal: undefined },
        { ...valid, recipeId: '' },
        { ...valid, recipeId: 42 },
      ]) {
        await as(session).add(body).expect(400);
      }
      expect((await as(session).list().expect(200)).body.entries).toEqual([]);
    });
  });

  describe('PUT /meal-plan/:id', () => {
    it('moves an entry to another day and meal', async () => {
      const session = await register();
      const entry = await plan(session, {
        date: '2026-10-20',
        meal: 'LUNCH',
        recipeId: tortilla,
      });

      const { body } = await as(session)
        .update(entry.id, {
          date: '2026-10-22',
          meal: 'DINNER',
          recipeId: tortilla,
        })
        .expect(200);

      expect(body).toMatchObject({
        id: entry.id,
        date: '2026-10-22',
        meal: 'DINNER',
      });
      expect(
        summary((await as(session).list().expect(200)).body.entries),
      ).toEqual([['2026-10-22', 'DINNER', tortilla]]);
    });

    it('puts another recipe in the same meal', async () => {
      const session = await register();
      const entry = await plan(session, {
        date: '2026-10-20',
        meal: 'LUNCH',
        recipeId: tortilla,
      });

      await as(session)
        .update(entry.id, {
          date: '2026-10-20',
          meal: 'LUNCH',
          recipeId: gazpacho,
        })
        .expect(200);

      expect(
        summary((await as(session).list().expect(200)).body.entries),
      ).toEqual([['2026-10-20', 'LUNCH', gazpacho]]);
    });

    it('does not move an entry to a meal that already has a recipe', async () => {
      const session = await register();
      const lunch = await plan(session, {
        date: '2026-10-20',
        meal: 'LUNCH',
        recipeId: tortilla,
      });
      await plan(session, {
        date: '2026-10-20',
        meal: 'DINNER',
        recipeId: gazpacho,
      });

      const { body } = await as(session)
        .update(lunch.id, {
          date: '2026-10-20',
          meal: 'DINNER',
          recipeId: tortilla,
        })
        .expect(409);

      expect(body.code).toBe('meal_slot_taken');
      expect(
        summary((await as(session).list().expect(200)).body.entries),
      ).toEqual([
        ['2026-10-20', 'LUNCH', tortilla],
        ['2026-10-20', 'DINNER', gazpacho],
      ]);
    });

    it('rejects a new recipe that clashes with the restrictions', async () => {
      const session = await register();
      await as(session).restrict(['EGG']);
      const entry = await plan(session, {
        date: '2026-10-20',
        meal: 'LUNCH',
        recipeId: gazpacho,
      });

      const { body } = await as(session)
        .update(entry.id, {
          date: '2026-10-20',
          meal: 'LUNCH',
          recipeId: tortilla,
        })
        .expect(409);

      expect(body.code).toBe('recipe_not_allowed');
    });

    it('rejects a recipe that is not in the catalogue', async () => {
      const session = await register();
      const entry = await plan(session, {
        date: '2026-10-20',
        meal: 'LUNCH',
        recipeId: tortilla,
      });

      const { body } = await as(session)
        .update(entry.id, {
          date: '2026-10-20',
          meal: 'LUNCH',
          recipeId: 'rec_unknown',
        })
        .expect(400);

      expect(body.code).toBe('unknown_recipe');
    });

    it('answers 404 for an entry that does not exist', async () => {
      const session = await register();

      const { body } = await as(session)
        .update('missing', {
          date: '2026-10-20',
          meal: 'LUNCH',
          recipeId: tortilla,
        })
        .expect(404);

      expect(body.code).toBe('meal_plan_entry_not_found');
    });
  });

  describe('restrictions saved after planning', () => {
    it('keeps the entry, says it clashes and still lets it move', async () => {
      const session = await register();
      const entry = await plan(session, {
        date: '2026-10-20',
        meal: 'LUNCH',
        recipeId: tortilla,
      });

      await as(session).restrict(['EGG']);

      const [listed] = (await as(session).list().expect(200)).body.entries;
      expect(listed).toMatchObject({ id: entry.id, recipeConflicts: true });
      const { body } = await as(session)
        .update(entry.id, {
          date: '2026-10-21',
          meal: 'LUNCH',
          recipeId: tortilla,
        })
        .expect(200);
      expect(body).toMatchObject({ date: '2026-10-21', recipeConflicts: true });
    });
  });

  describe('DELETE /meal-plan/:id', () => {
    it('removes the entry and only that one, leaving the recipe in the catalogue', async () => {
      const session = await register();
      const lunch = await plan(session, {
        date: '2026-10-20',
        meal: 'LUNCH',
        recipeId: tortilla,
      });
      await plan(session, {
        date: '2026-10-20',
        meal: 'DINNER',
        recipeId: gazpacho,
      });

      await as(session).remove(lunch.id).expect(204);

      expect(
        summary((await as(session).list().expect(200)).body.entries),
      ).toEqual([['2026-10-20', 'DINNER', gazpacho]]);
      expect(await prisma.recipe.count({ where: { id: tortilla } })).toBe(1);
      const again = await as(session).remove(lunch.id).expect(404);
      expect(again.body.code).toBe('meal_plan_entry_not_found');
    });
  });

  describe('isolation between users', () => {
    it("does not let a user see, change or remove another user's plan", async () => {
      const anaSession = await register(ana);
      const luisSession = await register(luis);
      const anas = await plan(anaSession, {
        date: '2026-10-20',
        meal: 'LUNCH',
        recipeId: tortilla,
      });

      expect((await as(luisSession).list().expect(200)).body.entries).toEqual(
        [],
      );
      const update = await as(luisSession)
        .update(anas.id, {
          date: '2026-10-21',
          meal: 'DINNER',
          recipeId: gazpacho,
        })
        .expect(404);
      expect(update.body.code).toBe('meal_plan_entry_not_found');
      await as(luisSession).remove(anas.id).expect(404);
      // Each user has their own meals: Luis can plan the same one.
      await plan(luisSession, {
        date: '2026-10-20',
        meal: 'LUNCH',
        recipeId: gazpacho,
      });

      expect(
        summary((await as(anaSession).list().expect(200)).body.entries),
      ).toEqual([['2026-10-20', 'LUNCH', tortilla]]);
    });
  });

  // docs/data-retention-policy.md: the meal plan is private data.
  describe('account deletion', () => {
    it('removes the plan of the account and nothing else', async () => {
      const anaSession = await register(ana);
      const luisSession = await register(luis);
      await plan(anaSession, {
        date: '2026-10-20',
        meal: 'LUNCH',
        recipeId: tortilla,
      });
      await plan(luisSession, {
        date: '2026-10-20',
        meal: 'LUNCH',
        recipeId: gazpacho,
      });

      await http()
        .post('/account/delete')
        .set('Authorization', `Bearer ${anaSession.accessToken}`)
        .send({ currentPassword: ana.password })
        .expect(204);

      expect(
        await prisma.mealPlanEntry.findMany({
          select: { recipeId: true, user: { select: { email: true } } },
        }),
      ).toEqual([{ recipeId: gazpacho, user: { email: luis.email } }]);
      expect(await prisma.recipe.count({ where: { id: tortilla } })).toBe(1);
      await as(anaSession).list().expect(401);
      await as(anaSession)
        .add({ date: '2026-10-21', meal: 'LUNCH', recipeId: tortilla })
        .expect(401);
    });
  });
});
