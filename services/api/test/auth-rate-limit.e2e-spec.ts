import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { PrismaService } from './../src/prisma/prisma.service.js';
import { setupApp } from './../src/setup-app.js';

const LIMIT = 3;

describe('Auth rate limit (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const http = () => request(app.getHttpServer());
  const login = () =>
    http()
      .post('/auth/login')
      .send({ email: 'nobody@example.com', password: 'wrong password' });

  // A fresh application for each test, so the in-memory counters start at zero.
  beforeEach(async () => {
    // The configuration is read when the application module is first
    // imported, so the low limit must be set before that happens.
    process.env.AUTH_RATE_LIMIT_MAX = String(LIMIT);
    const { AppModule } = await import('./../src/app.module.js');

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    setupApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();
  });

  afterEach(async () => {
    await app.close();
  });

  it('blocks sign-in attempts beyond the limit', async () => {
    for (let attempt = 0; attempt < LIMIT; attempt += 1) {
      await login().expect(401);
    }

    await login().expect(429);
  });

  it('counts registration and Google sign-in attempts as well', async () => {
    for (let attempt = 0; attempt < LIMIT; attempt += 1) {
      await http().post('/auth/register').send({}).expect(400);
    }
    await http().post('/auth/register').send({}).expect(429);

    for (let attempt = 0; attempt < LIMIT; attempt += 1) {
      await http().post('/auth/google').send({}).expect(400);
    }
    await http().post('/auth/google').send({}).expect(429);
  });

  it('does not limit the endpoints that take no credentials', async () => {
    for (let attempt = 0; attempt < LIMIT + 2; attempt += 1) {
      await http().get('/health').expect(200);
      await http()
        .post('/auth/refresh')
        .send({ refreshToken: 'unknown' })
        .expect(401);
    }
  });
});
