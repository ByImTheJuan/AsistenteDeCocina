import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { MAX_INVENTORY_ITEMS } from './../src/inventory/inventory.service.js';
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

// The catalogue is inserted by the migrations and never reset.
const tomate = {
  id: 'ing_tomate',
  name: 'Tomate',
  category: 'VEGETABLE',
  allergens: ['HISTAMINE'],
  allergensUncertain: false,
  defaultUnit: 'PIECE',
};
const arroz = {
  id: 'ing_arroz',
  name: 'Arroz',
  category: 'GRAIN',
  allergens: [],
  allergensUncertain: false,
  defaultUnit: 'GRAM',
};

const noQuantity = { quantity: null, unit: null };

type Session = { accessToken: string; refreshToken: string };
type Item = {
  id: string;
  ingredient: { id: string; name: string };
  quantity: number | null;
  unit: string | null;
};

describe('Inventory (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const http = () => request(app.getHttpServer());
  const as = (session: Session) => {
    const auth = { Authorization: `Bearer ${session.accessToken}` };
    return {
      list: () => http().get('/inventory').set(auth),
      add: (body: object) => http().post('/inventory').set(auth).send(body),
      update: (id: string, body: object) =>
        http().put(`/inventory/${id}`).set(auth).send(body),
      remove: (id: string) => http().delete(`/inventory/${id}`).set(auth),
    };
  };
  const register = async (account = ana): Promise<Session> =>
    (await http().post('/auth/register').send(account).expect(201)).body;
  const summary = (items: Item[]) =>
    items.map(({ ingredient, quantity, unit }) => [
      ingredient.name,
      quantity,
      unit,
    ]);

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

  describe('GET /inventory', () => {
    it('is empty for a user who has not added anything', async () => {
      const session = await register();

      expect((await as(session).list().expect(200)).body).toEqual({
        items: [],
      });
    });

    it('lists the items by food name, then in the order they were added', async () => {
      const session = await register();
      await as(session)
        .add({ ingredientId: tomate.id, quantity: 3, unit: 'PIECE' })
        .expect(201);
      await as(session)
        .add({ ingredientId: arroz.id, quantity: 1, unit: 'KILOGRAM' })
        .expect(201);
      await as(session)
        .add({ ingredientId: tomate.id, ...noQuantity })
        .expect(201);

      const response = await as(session).list().expect(200);

      expect(summary(response.body.items)).toEqual([
        ['Arroz', 1, 'KILOGRAM'],
        ['Tomate', 3, 'PIECE'],
        ['Tomate', null, null],
      ]);
    });

    it('rejects requests without a valid access token', async () => {
      await http().get('/inventory').expect(401);
      await http()
        .get('/inventory')
        .set('Authorization', 'Bearer not-a-token')
        .expect(401);
    });
  });

  describe('POST /inventory', () => {
    it('adds a food with its quantity and unit', async () => {
      const session = await register();

      const response = await as(session)
        .add({ ingredientId: arroz.id, quantity: 0.25, unit: 'KILOGRAM' })
        .expect(201);

      expect(response.body).toEqual({
        id: expect.any(String),
        ingredient: arroz,
        quantity: 0.25,
        unit: 'KILOGRAM',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
      expect((await as(session).list().expect(200)).body.items).toEqual([
        response.body,
      ]);
    });

    it('adds a food without saying how much there is', async () => {
      const session = await register();

      const response = await as(session)
        .add({ ingredientId: tomate.id, ...noQuantity })
        .expect(201);

      expect(response.body).toMatchObject({
        ingredient: tomate,
        ...noQuantity,
      });
    });

    it('keeps the same food twice as two items', async () => {
      const session = await register();
      await as(session)
        .add({ ingredientId: arroz.id, quantity: 500, unit: 'GRAM' })
        .expect(201);
      await as(session)
        .add({ ingredientId: arroz.id, quantity: 1, unit: 'PACKAGE' })
        .expect(201);

      const { items } = (await as(session).list().expect(200)).body;

      expect(summary(items)).toEqual([
        ['Arroz', 500, 'GRAM'],
        ['Arroz', 1, 'PACKAGE'],
      ]);
    });

    it('rejects a quantity without a unit and a unit without a quantity', async () => {
      const session = await register();

      for (const body of [
        { ingredientId: arroz.id, quantity: 2, unit: null },
        { ingredientId: arroz.id, quantity: null, unit: 'GRAM' },
      ]) {
        const response = await as(session).add(body).expect(400);
        expect(response.body.code).toBe('incomplete_quantity');
      }
      expect(await prisma.inventoryItem.count()).toBe(0);
    });

    it('rejects an ingredient that is not in the catalogue', async () => {
      const session = await register();

      const response = await as(session)
        .add({ ingredientId: 'ing_unicornio', ...noQuantity })
        .expect(400);

      expect(response.body.code).toBe('unknown_ingredient');
      expect(await prisma.inventoryItem.count()).toBe(0);
    });

    it.each([
      ['no ingredient', { ...noQuantity }],
      ['an empty ingredient', { ingredientId: '', ...noQuantity }],
      ['a missing quantity', { ingredientId: arroz.id, unit: 'GRAM' }],
      ['a missing unit', { ingredientId: arroz.id, quantity: 1 }],
      ['zero', { ingredientId: arroz.id, quantity: 0, unit: 'GRAM' }],
      [
        'a negative quantity',
        { ingredientId: arroz.id, quantity: -1, unit: 'GRAM' },
      ],
      ['too much', { ingredientId: arroz.id, quantity: 100_001, unit: 'GRAM' }],
      [
        'four decimals',
        { ingredientId: arroz.id, quantity: 0.0005, unit: 'KILOGRAM' },
      ],
      [
        'a quantity as text',
        { ingredientId: arroz.id, quantity: '2', unit: 'GRAM' },
      ],
      ['an unknown unit', { ingredientId: arroz.id, quantity: 1, unit: 'CUP' }],
      [
        'unknown fields',
        { ingredientId: arroz.id, ...noQuantity, userId: 'x' },
      ],
    ])('rejects %s', async (_, body) => {
      const session = await register();

      await as(session).add(body).expect(400);

      expect(await prisma.inventoryItem.count()).toBe(0);
    });

    it('accepts the limits of the quantity', async () => {
      const session = await register();

      await as(session)
        .add({ ingredientId: arroz.id, quantity: 0.001, unit: 'KILOGRAM' })
        .expect(201);
      await as(session)
        .add({ ingredientId: arroz.id, quantity: 100_000, unit: 'GRAM' })
        .expect(201);
    });

    it(`refuses more than ${MAX_INVENTORY_ITEMS} items`, async () => {
      const session = await register();
      const { id: userId } = await prisma.user.findUniqueOrThrow({
        where: { email: ana.email },
      });
      await prisma.inventoryItem.createMany({
        data: Array.from({ length: MAX_INVENTORY_ITEMS }, () => ({
          userId,
          ingredientId: arroz.id,
        })),
      });

      const response = await as(session)
        .add({ ingredientId: tomate.id, ...noQuantity })
        .expect(409);

      expect(response.body.code).toBe('inventory_full');
      expect(await prisma.inventoryItem.count()).toBe(MAX_INVENTORY_ITEMS);
    });
  });

  describe('PUT /inventory/:id', () => {
    it('replaces the quantity and unit', async () => {
      const session = await register();
      const added = (
        await as(session)
          .add({ ingredientId: arroz.id, quantity: 1, unit: 'KILOGRAM' })
          .expect(201)
      ).body;

      const response = await as(session)
        .update(added.id, { quantity: 750, unit: 'GRAM' })
        .expect(200);

      expect(response.body).toMatchObject({
        id: added.id,
        ingredient: arroz,
        quantity: 750,
        unit: 'GRAM',
      });
      expect(
        summary((await as(session).list().expect(200)).body.items),
      ).toEqual([['Arroz', 750, 'GRAM']]);
    });

    it('can clear the quantity', async () => {
      const session = await register();
      const added = (
        await as(session)
          .add({ ingredientId: arroz.id, quantity: 1, unit: 'KILOGRAM' })
          .expect(201)
      ).body;

      const response = await as(session)
        .update(added.id, noQuantity)
        .expect(200);

      expect(response.body).toMatchObject(noQuantity);
    });

    it('rejects an incomplete or invalid quantity and keeps the item', async () => {
      const session = await register();
      const added = (
        await as(session)
          .add({ ingredientId: arroz.id, quantity: 1, unit: 'KILOGRAM' })
          .expect(201)
      ).body;

      const incomplete = await as(session)
        .update(added.id, { quantity: 2, unit: null })
        .expect(400);
      expect(incomplete.body.code).toBe('incomplete_quantity');
      await as(session)
        .update(added.id, { quantity: 0, unit: 'GRAM' })
        .expect(400);
      await as(session)
        .update(added.id, { ingredientId: tomate.id, ...noQuantity })
        .expect(400);

      expect(
        summary((await as(session).list().expect(200)).body.items),
      ).toEqual([['Arroz', 1, 'KILOGRAM']]);
    });

    it('answers 404 for an item that does not exist', async () => {
      const session = await register();

      const response = await as(session)
        .update('missing', { quantity: 1, unit: 'GRAM' })
        .expect(404);

      expect(response.body.code).toBe('inventory_item_not_found');
    });
  });

  describe('DELETE /inventory/:id', () => {
    it('removes the item and only that one', async () => {
      const session = await register();
      const first = (
        await as(session)
          .add({ ingredientId: arroz.id, quantity: 1, unit: 'KILOGRAM' })
          .expect(201)
      ).body;
      await as(session)
        .add({ ingredientId: tomate.id, ...noQuantity })
        .expect(201);

      await as(session).remove(first.id).expect(204);

      expect(
        summary((await as(session).list().expect(200)).body.items),
      ).toEqual([['Tomate', null, null]]);
      const again = await as(session).remove(first.id).expect(404);
      expect(again.body.code).toBe('inventory_item_not_found');
    });
  });

  describe('isolation between users', () => {
    it("does not let a user see, change or remove another user's items", async () => {
      const anaSession = await register(ana);
      const luisSession = await register(luis);
      const anas = (
        await as(anaSession)
          .add({ ingredientId: arroz.id, quantity: 1, unit: 'KILOGRAM' })
          .expect(201)
      ).body;

      expect((await as(luisSession).list().expect(200)).body.items).toEqual([]);
      const update = await as(luisSession)
        .update(anas.id, { quantity: 5, unit: 'GRAM' })
        .expect(404);
      expect(update.body.code).toBe('inventory_item_not_found');
      await as(luisSession).remove(anas.id).expect(404);

      expect(
        summary((await as(anaSession).list().expect(200)).body.items),
      ).toEqual([['Arroz', 1, 'KILOGRAM']]);
    });
  });

  // docs/data-retention-policy.md: the inventory is private data.
  describe('account deletion', () => {
    it('removes the inventory of the account and nothing else', async () => {
      const anaSession = await register(ana);
      const luisSession = await register(luis);
      await as(anaSession)
        .add({ ingredientId: arroz.id, quantity: 1, unit: 'KILOGRAM' })
        .expect(201);
      await as(luisSession)
        .add({ ingredientId: tomate.id, quantity: 4, unit: 'PIECE' })
        .expect(201);

      await http()
        .post('/account/delete')
        .set('Authorization', `Bearer ${anaSession.accessToken}`)
        .send({ currentPassword: ana.password })
        .expect(204);

      expect(
        await prisma.inventoryItem.findMany({
          select: { ingredientId: true, user: { select: { email: true } } },
        }),
      ).toEqual([{ ingredientId: tomate.id, user: { email: luis.email } }]);
      await as(anaSession).list().expect(401);
      await as(anaSession)
        .add({ ingredientId: arroz.id, ...noQuantity })
        .expect(401);
    });
  });
});
