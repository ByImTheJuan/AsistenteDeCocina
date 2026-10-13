import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { GoogleTokenVerifier } from './../src/auth/google-token-verifier.js';
import { PrismaService } from './../src/prisma/prisma.service.js';
import { setupApp } from './../src/setup-app.js';
import type { GoogleProfile } from './../src/users/users.service.js';

const ana = {
  name: 'Ana',
  email: 'ana@example.com',
  password: 'correct horse battery',
};

const googleProfiles: Record<string, GoogleProfile> = {
  'google-token-ana': {
    sub: 'google-ana',
    email: 'Ana@Example.com',
    name: 'Ana de Google',
    avatarUrl: 'https://example.com/ana.png',
  },
  'google-token-ana-other-account': {
    sub: 'google-ana-2',
    email: 'ana@example.com',
    name: 'Otra Ana',
    avatarUrl: null,
  },
};

// Stands in for Google; see test/auth.e2e-spec.ts.
const fakeGoogleTokenVerifier = {
  verify: async (idToken: string): Promise<GoogleProfile> => {
    const profile = googleProfiles[idToken];
    if (!profile) {
      throw new UnauthorizedException('Invalid Google ID token');
    }
    return profile;
  },
};

describe('Email and password accounts (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const http = () => request(app.getHttpServer());
  const register = (body: object = ana) =>
    http().post('/auth/register').send(body);
  const login = (email: string, password: string) =>
    http().post('/auth/login').send({ email, password });
  const signInWithGoogle = (idToken: string) =>
    http().post('/auth/google').send({ idToken });
  const refresh = (refreshToken: string) =>
    http().post('/auth/refresh').send({ refreshToken });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(GoogleTokenVerifier)
      .useValue(fakeGoogleTokenVerifier)
      .compile();

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

  describe('POST /auth/register', () => {
    it('creates the account and starts a session', async () => {
      const response = await register().expect(201);

      expect(response.body).toEqual({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        user: {
          id: expect.any(String),
          email: 'ana@example.com',
          name: 'Ana',
          avatarUrl: null,
        },
      });
      await http()
        .get('/auth/me')
        .set('Authorization', `Bearer ${response.body.accessToken}`)
        .expect(200, response.body.user);
    });

    it('stores only a hash of the password', async () => {
      const response = await register().expect(201);

      const stored = await prisma.user.findUniqueOrThrow({
        where: { id: response.body.user.id },
      });
      expect(stored.passwordHash).toMatch(/^scrypt\$/);
      expect(stored.passwordHash).not.toContain(ana.password);
      expect(JSON.stringify(response.body)).not.toContain(ana.password);
      expect(JSON.stringify(response.body)).not.toContain('passwordHash');
    });

    it('normalises the email and trims the name', async () => {
      const response = await register({
        ...ana,
        name: '  Ana  ',
        email: '  Ana@Example.COM ',
      }).expect(201);

      expect(response.body.user).toMatchObject({
        name: 'Ana',
        email: 'ana@example.com',
      });
    });

    it('rejects an email that already has an account', async () => {
      await register().expect(201);

      await register({ ...ana, password: 'another password' }).expect(409);

      await expect(prisma.user.count()).resolves.toBe(1);
    });

    it('treats emails that differ only in case as the same', async () => {
      await register().expect(201);

      await register({ ...ana, email: 'ANA@example.com' }).expect(409);
    });

    it('creates a single account when two registrations race', async () => {
      const responses = await Promise.all([register(), register()]);

      expect(responses.map((response) => response.status).sort()).toEqual([
        201, 409,
      ]);
      await expect(prisma.user.count()).resolves.toBe(1);
    });

    it('rejects the email of an account created with Google', async () => {
      await signInWithGoogle('google-token-ana').expect(200);

      await register().expect(409);

      const stored = await prisma.user.findUniqueOrThrow({
        where: { email: 'ana@example.com' },
      });
      expect(stored.passwordHash).toBeNull();
    });

    it.each([
      ['no name', { ...ana, name: undefined }],
      ['a blank name', { ...ana, name: '   ' }],
      ['a name that is too long', { ...ana, name: 'a'.repeat(101) }],
      ['no email', { ...ana, email: undefined }],
      ['a malformed email', { ...ana, email: 'ana-at-example.com' }],
      ['no password', { ...ana, password: undefined }],
      ['a password that is too short', { ...ana, password: '1234567' }],
      ['a password that is too long', { ...ana, password: 'a'.repeat(129) }],
      ['a non-string password', { ...ana, password: 12345678 }],
      ['unknown properties', { ...ana, role: 'admin' }],
    ])('rejects a body with %s', async (_case, body) => {
      await register(body).expect(400);

      await expect(prisma.user.count()).resolves.toBe(0);
    });

    it('accepts a password of exactly the minimum length', async () => {
      await register({ ...ana, password: '12345678' }).expect(201);
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      await register().expect(201);
    });

    it('starts a session with the right password', async () => {
      const response = await login(ana.email, ana.password).expect(200);

      expect(response.body.user).toMatchObject({
        email: 'ana@example.com',
        name: 'Ana',
      });
      await http()
        .get('/auth/me')
        .set('Authorization', `Bearer ${response.body.accessToken}`)
        .expect(200);
    });

    it('accepts the email in any case and with surrounding spaces', async () => {
      await login('  ANA@Example.com ', ana.password).expect(200);
    });

    it('gives the same answer for a wrong password and an unknown email', async () => {
      const wrongPassword = await login(ana.email, 'wrong password').expect(
        401,
      );
      const unknownEmail = await login(
        'nobody@example.com',
        ana.password,
      ).expect(401);

      expect(unknownEmail.body).toEqual(wrongPassword.body);
      expect(wrongPassword.body.message).toBe('Invalid email or password');
    });

    it('does not accept the password with different case', async () => {
      await login(ana.email, ana.password.toUpperCase()).expect(401);
    });

    it('rejects password sign-in for an account created with Google', async () => {
      await prisma.refreshToken.deleteMany();
      await prisma.user.deleteMany();
      await signInWithGoogle('google-token-ana').expect(200);

      const response = await login('ana@example.com', 'any password').expect(
        401,
      );

      expect(response.body.message).toBe('Invalid email or password');
    });

    it.each([
      ['no email', { password: ana.password }],
      ['a malformed email', { email: 'ana', password: ana.password }],
      ['no password', { email: ana.email }],
      ['an empty password', { email: ana.email, password: '' }],
    ])('rejects a body with %s', async (_case, body) => {
      await http().post('/auth/login').send(body).expect(400);
    });

    it('issues sessions that can be refreshed and closed', async () => {
      const session = await login(ana.email, ana.password).expect(200);

      const renewed = await refresh(session.body.refreshToken).expect(200);
      await http()
        .post('/auth/logout')
        .send({ refreshToken: renewed.body.refreshToken })
        .expect(204);

      await refresh(renewed.body.refreshToken).expect(401);
    });
  });

  describe('an account with a password that signs in with Google', () => {
    it('keeps a single account and links it to Google', async () => {
      const registered = await register().expect(201);

      const google = await signInWithGoogle('google-token-ana').expect(200);

      expect(google.body.user.id).toBe(registered.body.user.id);
      await expect(prisma.user.count()).resolves.toBe(1);
      const stored = await prisma.user.findUniqueOrThrow({
        where: { id: registered.body.user.id },
      });
      expect(stored.googleSub).toBe('google-ana');
      expect(stored.passwordHash).toMatch(/^scrypt\$/);
    });

    it('can then sign in with either method', async () => {
      const registered = await register().expect(201);
      await signInWithGoogle('google-token-ana').expect(200);

      const withPassword = await login(ana.email, ana.password).expect(200);
      const withGoogle = await signInWithGoogle('google-token-ana').expect(200);

      expect(withPassword.body.user.id).toBe(registered.body.user.id);
      expect(withGoogle.body.user.id).toBe(registered.body.user.id);
      await expect(prisma.user.count()).resolves.toBe(1);
    });

    it('still rejects a wrong password', async () => {
      await register().expect(201);
      await signInWithGoogle('google-token-ana').expect(200);

      await login(ana.email, 'wrong password').expect(401);
    });

    it('keeps the sessions opened with the password', async () => {
      const registered = await register().expect(201);

      const google = await signInWithGoogle('google-token-ana').expect(200);

      await refresh(registered.body.refreshToken).expect(200);
      await refresh(google.body.refreshToken).expect(200);
    });

    it('keeps the name chosen at registration and takes the picture from Google', async () => {
      await register().expect(201);

      const google = await signInWithGoogle('google-token-ana').expect(200);

      expect(google.body.user).toMatchObject({
        email: 'ana@example.com',
        name: 'Ana',
        avatarUrl: 'https://example.com/ana.png',
      });
    });
  });

  describe('an account created with Google', () => {
    it('has no password, so password sign-in is rejected', async () => {
      await signInWithGoogle('google-token-ana').expect(200);

      const response = await login('ana@example.com', 'any password').expect(
        401,
      );

      expect(response.body.message).toBe('Invalid email or password');
    });

    it('cannot be given a password by registering with its email', async () => {
      const google = await signInWithGoogle('google-token-ana').expect(200);

      await register().expect(409);

      const stored = await prisma.user.findUniqueOrThrow({
        where: { id: google.body.user.id },
      });
      expect(stored.passwordHash).toBeNull();
      await login(ana.email, ana.password).expect(401);
    });

    it('rejects a second Google account with the same email', async () => {
      await signInWithGoogle('google-token-ana').expect(200);

      await signInWithGoogle('google-token-ana-other-account').expect(409);

      await expect(prisma.user.count()).resolves.toBe(1);
    });
  });

  it('documents the endpoints in OpenAPI', async () => {
    const response = await http().get('/docs-json').expect(200);

    expect(Object.keys(response.body.paths)).toEqual(
      expect.arrayContaining(['/auth/register', '/auth/login']),
    );
  });
});
