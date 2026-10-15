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

    const plain = {
      allergens: [],
      allergensUncertain: false,
      defaultUnit: 'PIECE',
    };
    expect(response.body).toEqual([
      {
        id: 'ing_pimiento_rojo',
        name: 'Pimiento rojo',
        category: 'VEGETABLE',
        ...plain,
      },
      {
        id: 'ing_pimiento_verde',
        name: 'Pimiento verde',
        category: 'VEGETABLE',
        ...plain,
      },
    ]);
  });

  it('says which allergens each ingredient contains', async () => {
    const response = await search({ search: 'mayonesa' }).expect(200);

    expect(response.body).toEqual([
      {
        id: 'ing_mayonesa',
        name: 'Mayonesa',
        category: 'OTHER',
        allergens: ['EGG', 'MUSTARD'],
        allergensUncertain: true,
        defaultUnit: 'GRAM',
      },
    ]);
  });

  it('suggests the unit each ingredient is usually measured in', async () => {
    const unitOf = async (name: string) =>
      (await search({ search: name }).expect(200)).body.find(
        (ingredient: { name: string }) => ingredient.name === name,
      ).defaultUnit;

    expect(await unitOf('Leche')).toBe('LITER');
    expect(await unitOf('Huevo')).toBe('PIECE');
    expect(await unitOf('Harina de trigo')).toBe('GRAM');
    expect(await unitOf('Espinacas')).toBe('GRAM');
    expect(await unitOf('Salsa de soja')).toBe('MILLILITER');
    expect(await unitOf('Tortillas de trigo')).toBe('PACKAGE');
  });

  it('finds an ingredient by any of its synonyms', async () => {
    expect(names((await search({ search: 'papa' }).expect(200)).body)).toEqual([
      'Patata',
    ]);
    expect(
      names((await search({ search: 'huevos' }).expect(200)).body),
    ).toEqual(['Huevo']);
    expect(
      names((await search({ search: 'CHICHAROS' }).expect(200)).body),
    ).toEqual(['Guisantes']);
  });

  it('returns each ingredient once when its name and synonyms match', async () => {
    // "Tomate" matches by name and through "Tomates"; "Tomate frito" too.
    const response = await search({ search: 'tomate' }).expect(200);

    expect(names(response.body)).toEqual(['Tomate', 'Tomate frito']);
  });

  it('lists the ingredients a shared word matches by name or synonym', async () => {
    const response = await search({ search: 'leche' }).expect(200);

    expect(names(response.body)).toEqual([
      'Bebida de almendras',
      'Bebida de avena',
      'Bebida de soja',
      'Leche',
      'Nata',
    ]);
  });

  it('keeps every synonym distinct from the catalogue names', async () => {
    const aliases = await prisma.ingredientAlias.findMany({
      include: { ingredient: true },
    });
    const catalogue = await prisma.ingredient.findMany();
    const normalise = (text: string) =>
      text
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase();
    const catalogueNames = new Set(
      catalogue.map(({ name }) => normalise(name)),
    );

    expect(aliases.length).toBeGreaterThan(0);
    for (const { alias, ingredient } of aliases) {
      expect(catalogueNames.has(normalise(alias))).toBe(false);
      expect(normalise(alias)).not.toBe(normalise(ingredient.name));
    }
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
