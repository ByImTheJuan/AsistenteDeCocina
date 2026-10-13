import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/prisma/prisma.service.js';
import { setupApp } from './../src/setup-app.js';

// The catalogue is inserted by the migrations, so it is already there.
describe('Ingredients (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;

  const search = (query: Record<string, string> = {}) =>
    request(app.getHttpServer())
      .get('/ingredients')
      .query(query)
      .set('Authorization', `Bearer ${accessToken}`);
  const names = (body: { name: string }[]) => body.map((item) => item.name);

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    setupApp(app);
    await app.init();
    prisma = app.get(PrismaService);

    await prisma.user.deleteMany();
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Ana',
        email: 'ana@example.com',
        password: 'correct horse battery',
      })
      .expect(201);
    accessToken = response.body.accessToken;
  });

  afterAll(async () => {
    await prisma.user.deleteMany();
    await app.close();
  });

  it('finds ingredients whose name contains the text', async () => {
    const response = await search({ search: 'pimiento' }).expect(200);

    expect(response.body).toEqual([
      { id: 'ing_pimiento_rojo', name: 'Pimiento rojo', category: 'VEGETABLE' },
      {
        id: 'ing_pimiento_verde',
        name: 'Pimiento verde',
        category: 'VEGETABLE',
      },
    ]);
  });

  it('ignores case and accents', async () => {
    expect(
      names((await search({ search: 'PLATANO' }).expect(200)).body),
    ).toEqual(['Plátano']);
    expect(
      names((await search({ search: 'brócoli' }).expect(200)).body),
    ).toEqual(['Brócoli']);
  });

  it('ignores the spaces around the text', async () => {
    const response = await search({ search: '  tomillo ' }).expect(200);

    expect(names(response.body)).toEqual(['Tomillo']);
  });

  it('returns nothing when no ingredient matches', async () => {
    const response = await search({ search: 'zzzz' }).expect(200);

    expect(response.body).toEqual([]);
  });

  it('treats the wildcards of the database as plain text', async () => {
    expect((await search({ search: '%' }).expect(200)).body).toEqual([]);
    expect((await search({ search: 'a_o' }).expect(200)).body).toEqual([]);
  });

  it('lists the start of the catalogue, by name, without a search text', async () => {
    const response = await search().expect(200);

    expect(response.body).toHaveLength(50);
    const listed = names(response.body);
    expect(listed).toEqual(
      [...listed].sort((a, b) => a.localeCompare(b, 'es')),
    );
    expect(await prisma.ingredient.count()).toBeGreaterThan(50);
  });

  it('never returns more than 50 ingredients', async () => {
    const response = await search({ search: 'a' }).expect(200);

    expect(response.body).toHaveLength(50);
  });

  it('rejects a search text that is too long or unknown parameters', async () => {
    await search({ search: 'a'.repeat(101) }).expect(400);
    await search({ category: 'FRUIT' }).expect(400);
  });

  it('rejects requests without a valid access token', async () => {
    await request(app.getHttpServer()).get('/ingredients').expect(401);
    await request(app.getHttpServer())
      .get('/ingredients')
      .set('Authorization', 'Bearer not-a-token')
      .expect(401);
  });
});
