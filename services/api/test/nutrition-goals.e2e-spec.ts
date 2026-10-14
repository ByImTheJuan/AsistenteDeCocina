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

const none = { dailyCalories: null, mealCalories: null, dailyProtein: null };
const on = (value: number) => ({ value, enabled: true });
const off = (value: number) => ({ value, enabled: false });

type Session = { accessToken: string; refreshToken: string };

describe('Nutrition goals (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const http = () => request(app.getHttpServer());
  const as = (session: Session) => ({
    get: () =>
      http()
        .get('/nutrition-goals')
        .set('Authorization', `Bearer ${session.accessToken}`),
    put: (body: object) =>
      http()
        .put('/nutrition-goals')
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

  describe('GET /nutrition-goals', () => {
    it('has no goal for a user who has not set any', async () => {
      const session = await register();

      const response = await as(session).get().expect(200);

      expect(response.body).toEqual(none);
    });
  });

  describe('PUT /nutrition-goals', () => {
    it('saves the three goals', async () => {
      const session = await register();
      const goals = {
        dailyCalories: on(2000),
        mealCalories: on(650),
        dailyProtein: on(90),
      };

      const saved = await as(session).put(goals).expect(200);

      expect(saved.body).toEqual(goals);
      expect((await as(session).get().expect(200)).body).toEqual(goals);
    });

    it('saves only the goals that are set', async () => {
      const session = await register();
      const goals = { ...none, dailyProtein: on(120) };

      await as(session).put(goals).expect(200);

      expect((await as(session).get().expect(200)).body).toEqual(goals);
      expect(await prisma.nutritionGoal.count()).toBe(1);
    });

    it('changes the value of a goal', async () => {
      const session = await register();
      await as(session)
        .put({ ...none, dailyCalories: on(2000) })
        .expect(200);

      await as(session)
        .put({ ...none, dailyCalories: on(1800) })
        .expect(200);

      expect((await as(session).get().expect(200)).body.dailyCalories).toEqual(
        on(1800),
      );
    });

    it('switches a goal off keeping its value, and on again', async () => {
      const session = await register();
      await as(session)
        .put({ ...none, dailyCalories: on(2000), dailyProtein: on(90) })
        .expect(200);

      await as(session)
        .put({ ...none, dailyCalories: off(2000), dailyProtein: on(90) })
        .expect(200);

      expect((await as(session).get().expect(200)).body).toEqual({
        dailyCalories: off(2000),
        mealCalories: null,
        dailyProtein: on(90),
      });

      await as(session)
        .put({ ...none, dailyCalories: on(2000), dailyProtein: on(90) })
        .expect(200);

      expect((await as(session).get().expect(200)).body.dailyCalories).toEqual(
        on(2000),
      );
    });

    it('removes the goals that come as null', async () => {
      const session = await register();
      await as(session)
        .put({
          dailyCalories: on(2000),
          mealCalories: on(600),
          dailyProtein: on(90),
        })
        .expect(200);

      const response = await as(session).put(none).expect(200);

      expect(response.body).toEqual(none);
      expect(await prisma.nutritionGoal.count()).toBe(0);
    });

    it('accepts the limits of each range', async () => {
      const session = await register();

      await as(session)
        .put({
          dailyCalories: on(500),
          mealCalories: on(50),
          dailyProtein: on(1),
        })
        .expect(200);
      await as(session)
        .put({
          dailyCalories: on(10_000),
          mealCalories: on(5_000),
          dailyProtein: on(500),
        })
        .expect(200);
    });

    it.each([
      ['daily calories below the range', { dailyCalories: on(499) }],
      ['daily calories above the range', { dailyCalories: on(10_001) }],
      ['calories per meal below the range', { mealCalories: on(49) }],
      ['calories per meal above the range', { mealCalories: on(5_001) }],
      ['no protein', { dailyProtein: on(0) }],
      ['protein above the range', { dailyProtein: on(501) }],
      ['a negative value', { dailyCalories: on(-2000) }],
      ['a value with decimals', { dailyProtein: on(90.5) }],
      [
        'a value sent as text',
        { dailyCalories: { value: '2000', enabled: true } },
      ],
      ['a goal without a value', { dailyCalories: { enabled: true } }],
      ['a goal without its switch', { dailyCalories: { value: 2000 } }],
      [
        'a switch that is not a boolean',
        { dailyCalories: { value: 2000, enabled: 'yes' } },
      ],
      ['a goal that is not an object', { dailyCalories: 2000 }],
      [
        'an unexpected field in a goal',
        { dailyCalories: { value: 2000, enabled: true, unit: 'kJ' } },
      ],
      ['an unexpected goal', { dailyCarbs: on(250) }],
    ])('rejects %s', async (_case, goals) => {
      const session = await register();

      await as(session)
        .put({ ...none, ...goals })
        .expect(400);
      expect(await prisma.nutritionGoal.count()).toBe(0);
    });

    it('rejects a body that leaves a goal out', async () => {
      const session = await register();

      await as(session)
        .put({ dailyCalories: on(2000), mealCalories: null })
        .expect(400);
    });

    it('rejects more calories per meal than per day and keeps what was saved', async () => {
      const session = await register();
      const saved = { ...none, dailyCalories: on(2000) };
      await as(session).put(saved).expect(200);

      const response = await as(session)
        .put({ ...none, dailyCalories: on(1500), mealCalories: on(1600) })
        .expect(400);

      expect(response.body.code).toBe('meal_calories_exceed_daily');
      expect((await as(session).get().expect(200)).body).toEqual(saved);
    });

    it('accepts as many calories per meal as per day', async () => {
      const session = await register();

      await as(session)
        .put({ ...none, dailyCalories: on(1500), mealCalories: on(1500) })
        .expect(200);
    });

    it.each([
      ['the daily one', { dailyCalories: off(1500), mealCalories: on(1600) }],
      [
        'the one per meal',
        { dailyCalories: on(1500), mealCalories: off(1600) },
      ],
    ])(
      'does not compare the calorie goals while %s is switched off',
      async (_case, goals) => {
        const session = await register();

        await as(session)
          .put({ ...none, ...goals })
          .expect(200);
      },
    );
  });

  describe('access', () => {
    it('rejects requests without a valid access token', async () => {
      await http().get('/nutrition-goals').expect(401);
      await http().put('/nutrition-goals').send(none).expect(401);
      await http()
        .get('/nutrition-goals')
        .set('Authorization', 'Bearer not-a-token')
        .expect(401);
    });

    it('keeps the goals of each user apart', async () => {
      const anaSession = await register(ana);
      const luisSession = await register(luis);
      await as(anaSession)
        .put({ ...none, dailyCalories: on(2000) })
        .expect(200);

      await as(luisSession)
        .put({ ...none, dailyCalories: on(2600), dailyProtein: on(140) })
        .expect(200);

      expect((await as(anaSession).get().expect(200)).body).toEqual({
        ...none,
        dailyCalories: on(2000),
      });
      expect((await as(luisSession).get().expect(200)).body).toEqual({
        ...none,
        dailyCalories: on(2600),
        dailyProtein: on(140),
      });
    });
  });

  // docs/data-retention-policy.md: goals are private data.
  describe('account deletion', () => {
    it('removes the goals of the account and nothing else', async () => {
      const anaSession = await register(ana);
      const luisSession = await register(luis);
      await as(anaSession)
        .put({ ...none, dailyCalories: on(2000), dailyProtein: off(90) })
        .expect(200);
      await as(luisSession)
        .put({ ...none, mealCalories: on(700) })
        .expect(200);

      await http()
        .post('/account/delete')
        .set('Authorization', `Bearer ${anaSession.accessToken}`)
        .send({ currentPassword: ana.password })
        .expect(204);

      expect(
        await prisma.nutritionGoal.findMany({
          select: {
            kind: true,
            value: true,
            user: { select: { email: true } },
          },
        }),
      ).toEqual([
        { kind: 'MEAL_CALORIES', value: 700, user: { email: luis.email } },
      ]);
      await as(anaSession).get().expect(401);
    });
  });
});
