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
const luis = {
  name: 'Luis',
  email: 'luis@example.com',
  password: 'another long password',
};

const googleProfiles: Record<string, GoogleProfile> = {
  'google-ana': {
    sub: 'google-sub-ana',
    email: 'Ana@Example.com',
    name: 'Ana de Google',
    avatarUrl: 'https://example.com/ana.png',
  },
  'google-ana-second': {
    sub: 'google-sub-ana-2',
    email: 'ana@example.com',
    name: 'Ana',
    avatarUrl: null,
  },
  'google-luis': {
    sub: 'google-sub-luis',
    email: 'luis@example.com',
    name: 'Luis',
    avatarUrl: null,
  },
  'google-carla': {
    sub: 'google-sub-carla',
    email: 'carla@example.com',
    name: 'Carla',
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

type Session = { accessToken: string; refreshToken: string };

describe('Account (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const http = () => request(app.getHttpServer());
  const as = (session: Session) => ({
    get: (path: string) =>
      http().get(path).set('Authorization', `Bearer ${session.accessToken}`),
    put: (path: string, body: object) =>
      http()
        .put(path)
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send(body),
    post: (path: string, body: object) =>
      http()
        .post(path)
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send(body),
    delete: (path: string, body: object) =>
      http()
        .delete(path)
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send(body),
  });

  const register = async (account = ana): Promise<Session> =>
    (await http().post('/auth/register').send(account).expect(201)).body;
  const login = (email: string, password: string) =>
    http().post('/auth/login').send({ email, password });
  const signInWithGoogle = (idToken: string) =>
    http().post('/auth/google').send({ idToken });
  const googleSession = async (idToken: string): Promise<Session> =>
    (await signInWithGoogle(idToken).expect(200)).body;
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

  describe('GET /account', () => {
    it('returns the basic data of an account created with a password', async () => {
      const session = await register();

      const response = await as(session).get('/account').expect(200);

      expect(response.body).toEqual({
        id: expect.any(String),
        email: 'ana@example.com',
        name: 'Ana',
        avatarUrl: null,
        createdAt: expect.any(String),
        signInMethods: { password: true, google: false },
      });
      expect(Date.parse(response.body.createdAt)).not.toBeNaN();
    });

    it('reports Google as the only method of an account created with Google', async () => {
      const session = await googleSession('google-ana');

      const response = await as(session).get('/account').expect(200);

      expect(response.body.signInMethods).toEqual({
        password: false,
        google: true,
      });
    });

    it('reports both methods once they are linked', async () => {
      const session = await register();
      await signInWithGoogle('google-ana').expect(200);

      const response = await as(session).get('/account').expect(200);

      expect(response.body.signInMethods).toEqual({
        password: true,
        google: true,
      });
    });

    it('does not expose the password hash or the Google identifier', async () => {
      const session = await register();
      await signInWithGoogle('google-ana').expect(200);

      const response = await as(session).get('/account').expect(200);

      const body = JSON.stringify(response.body);
      expect(body).not.toContain('scrypt');
      expect(body).not.toContain('google-sub-ana');
    });

    it('returns only the account of the caller', async () => {
      const anaSession = await register(ana);
      const luisSession = await register(luis);

      const anaAccount = await as(anaSession).get('/account').expect(200);
      const luisAccount = await as(luisSession).get('/account').expect(200);

      expect(anaAccount.body.email).toBe('ana@example.com');
      expect(luisAccount.body.email).toBe('luis@example.com');
    });
  });

  describe('without a valid access token', () => {
    it.each([
      ['get', '/account'],
      ['put', '/account/password'],
      ['delete', '/account/password'],
      ['put', '/account/google'],
      ['delete', '/account/google'],
      ['post', '/account/delete'],
    ] as const)('rejects %s %s', async (method, path) => {
      await http()[method](path).send({}).expect(401);
      await http()
        [method](path)
        .set('Authorization', 'Bearer not-a-token')
        .send({})
        .expect(401);
    });
  });

  describe('PUT /account/password', () => {
    it('adds a password to an account created with Google', async () => {
      const session = await googleSession('google-ana');

      const response = await as(session)
        .put('/account/password', { newPassword: 'a brand new password' })
        .expect(200);

      expect(response.body.signInMethods).toEqual({
        password: true,
        google: true,
      });
      await login('ana@example.com', 'a brand new password').expect(200);
      await signInWithGoogle('google-ana').expect(200);
    });

    it('changes the password when the current one is given', async () => {
      const session = await register();

      await as(session)
        .put('/account/password', {
          currentPassword: ana.password,
          newPassword: 'a brand new password',
        })
        .expect(200);

      await login(ana.email, 'a brand new password').expect(200);
      await login(ana.email, ana.password).expect(401);
    });

    it.each([
      ['is missing', {}],
      ['is wrong', { currentPassword: 'not the password' }],
    ])(
      'refuses to change it when the current password %s',
      async (_case, extra) => {
        const session = await register();

        const response = await as(session)
          .put('/account/password', {
            ...extra,
            newPassword: 'a brand new password',
          })
          .expect(403);

        expect(response.body.code).toBe('invalid_current_password');
        await login(ana.email, ana.password).expect(200);
        await login(ana.email, 'a brand new password').expect(401);
      },
    );

    it.each([
      ['is missing', {}],
      ['is too short', { newPassword: '1234567' }],
      ['is too long', { newPassword: 'a'.repeat(129) }],
      ['is not a string', { newPassword: 12345678 }],
    ])('rejects a new password that %s', async (_case, body) => {
      const session = await register();

      await as(session)
        .put('/account/password', { currentPassword: ana.password, ...body })
        .expect(400);

      await login(ana.email, ana.password).expect(200);
    });

    it('stores only a hash of the new password', async () => {
      const session = await register();

      const response = await as(session)
        .put('/account/password', {
          currentPassword: ana.password,
          newPassword: 'a brand new password',
        })
        .expect(200);

      const stored = await prisma.user.findUniqueOrThrow({
        where: { email: ana.email },
      });
      expect(stored.passwordHash).toMatch(/^scrypt\$/);
      expect(stored.passwordHash).not.toContain('a brand new password');
      expect(JSON.stringify(response.body)).not.toContain(
        'a brand new password',
      );
    });

    it('closes the other sessions and keeps the one that made the change', async () => {
      const phone = await register();
      const tablet: Session = (await login(ana.email, ana.password).expect(200))
        .body;

      await as(phone)
        .put('/account/password', {
          currentPassword: ana.password,
          newPassword: 'a brand new password',
        })
        .expect(200);

      await refresh(tablet.refreshToken).expect(401);
      await refresh(phone.refreshToken).expect(200);
    });

    it('does not touch the account of another user', async () => {
      const anaSession = await register(ana);
      await register(luis);

      await as(anaSession)
        .put('/account/password', {
          currentPassword: ana.password,
          newPassword: 'a brand new password',
        })
        .expect(200);

      await login(luis.email, luis.password).expect(200);
      await login(luis.email, 'a brand new password').expect(401);
    });
  });

  describe('PUT /account/google', () => {
    it('links the Google account with the same email', async () => {
      const session = await register();

      const response = await as(session)
        .put('/account/google', { idToken: 'google-ana' })
        .expect(200);

      expect(response.body).toMatchObject({
        name: 'Ana',
        avatarUrl: 'https://example.com/ana.png',
        signInMethods: { password: true, google: true },
      });
      const google = await signInWithGoogle('google-ana').expect(200);
      expect(google.body.user.id).toBe(response.body.id);
      await login(ana.email, ana.password).expect(200);
    });

    it('rejects a Google account with a different email', async () => {
      const session = await register();

      const response = await as(session)
        .put('/account/google', { idToken: 'google-carla' })
        .expect(409);

      expect(response.body.code).toBe('google_email_mismatch');
      const account = await as(session).get('/account').expect(200);
      expect(account.body.signInMethods.google).toBe(false);
    });

    it('rejects a second Google account once one is linked', async () => {
      const session = await register();
      await as(session)
        .put('/account/google', { idToken: 'google-ana' })
        .expect(200);

      const response = await as(session)
        .put('/account/google', { idToken: 'google-ana-second' })
        .expect(409);

      expect(response.body.code).toBe('google_already_linked');
    });

    it('rejects a Google account that belongs to another account', async () => {
      const luisSession = await register(luis);
      await as(luisSession)
        .put('/account/google', { idToken: 'google-luis' })
        .expect(200);
      // Luis's Google account later changes its address to Ana's.
      googleProfiles['google-luis-moved'] = {
        ...googleProfiles['google-luis'],
        email: 'ana@example.com',
      };
      const anaSession = await register(ana);

      const response = await as(anaSession)
        .put('/account/google', { idToken: 'google-luis-moved' })
        .expect(409);

      expect(response.body.code).toBe('google_account_in_use');
    });

    it('accepts linking the same Google account again', async () => {
      const session = await register();
      await as(session)
        .put('/account/google', { idToken: 'google-ana' })
        .expect(200);

      await as(session)
        .put('/account/google', { idToken: 'google-ana' })
        .expect(200);
    });

    it('rejects a token that Google does not accept', async () => {
      const session = await register();

      await as(session)
        .put('/account/google', { idToken: 'forged' })
        .expect(401);
    });

    it('rejects a body without token', async () => {
      const session = await register();

      await as(session).put('/account/google', {}).expect(400);
    });
  });

  describe('removing a sign-in method', () => {
    async function accountWithBothMethods(): Promise<Session> {
      const session = await register();
      await as(session)
        .put('/account/google', { idToken: 'google-ana' })
        .expect(200);
      return session;
    }

    it('removes the password and leaves Google', async () => {
      const session = await accountWithBothMethods();

      const response = await as(session)
        .delete('/account/password', { currentPassword: ana.password })
        .expect(200);

      expect(response.body.signInMethods).toEqual({
        password: false,
        google: true,
      });
      await login(ana.email, ana.password).expect(401);
      await signInWithGoogle('google-ana').expect(200);
    });

    it('unlinks Google and leaves the password', async () => {
      const session = await accountWithBothMethods();

      const response = await as(session)
        .delete('/account/google', { currentPassword: ana.password })
        .expect(200);

      expect(response.body.signInMethods).toEqual({
        password: true,
        google: false,
      });
      await login(ana.email, ana.password).expect(200);
    });

    it('refuses to remove the password when it is the only method', async () => {
      const session = await register();

      const response = await as(session)
        .delete('/account/password', { currentPassword: ana.password })
        .expect(409);

      expect(response.body.code).toBe('last_sign_in_method');
      await login(ana.email, ana.password).expect(200);
    });

    it('refuses to unlink Google when it is the only method', async () => {
      const session = await googleSession('google-ana');

      const response = await as(session)
        .delete('/account/google', { currentPassword: 'anything' })
        .expect(409);

      expect(response.body.code).toBe('last_sign_in_method');
      await signInWithGoogle('google-ana').expect(200);
    });

    it.each(['/account/password', '/account/google'])(
      'requires the current password on %s',
      async (path) => {
        const session = await accountWithBothMethods();

        const wrong = await as(session)
          .delete(path, { currentPassword: 'not the password' })
          .expect(403);
        await as(session).delete(path, {}).expect(400);

        expect(wrong.body.code).toBe('invalid_current_password');
        const account = await as(session).get('/account').expect(200);
        expect(account.body.signInMethods).toEqual({
          password: true,
          google: true,
        });
      },
    );

    it('keeps at least one method when both removals race', async () => {
      const session = await accountWithBothMethods();

      await Promise.all([
        as(session).delete('/account/password', {
          currentPassword: ana.password,
        }),
        as(session).delete('/account/google', {
          currentPassword: ana.password,
        }),
      ]);

      const stored = await prisma.user.findUniqueOrThrow({
        where: { email: ana.email },
      });
      expect(stored.passwordHash !== null || stored.googleSub !== null).toBe(
        true,
      );
    });

    it('closes the other sessions and keeps the current one', async () => {
      const phone = await accountWithBothMethods();
      const tablet: Session = (await login(ana.email, ana.password).expect(200))
        .body;

      await as(phone)
        .delete('/account/google', { currentPassword: ana.password })
        .expect(200);

      await refresh(tablet.refreshToken).expect(401);
      await refresh(phone.refreshToken).expect(200);
    });

    it('is a no-op for a method the account does not have', async () => {
      const passwordOnly = await register();
      await as(passwordOnly)
        .delete('/account/google', { currentPassword: ana.password })
        .expect(200);

      const googleOnly = await googleSession('google-luis');
      await as(googleOnly)
        .delete('/account/password', { currentPassword: 'anything' })
        .expect(200);
    });
  });

  describe('POST /account/delete', () => {
    it('deletes the account and everything that belongs to it', async () => {
      const session = await register();
      await login(ana.email, ana.password).expect(200);

      await as(session)
        .post('/account/delete', { currentPassword: ana.password })
        .expect(204);

      await expect(prisma.user.count()).resolves.toBe(0);
      await expect(prisma.refreshToken.count()).resolves.toBe(0);
    });

    it('makes its sessions and credentials stop working', async () => {
      const session = await register();

      await as(session)
        .post('/account/delete', { currentPassword: ana.password })
        .expect(204);

      await as(session).get('/account').expect(401);
      await http()
        .get('/auth/me')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .expect(401);
      await refresh(session.refreshToken).expect(401);
      await login(ana.email, ana.password).expect(401);
    });

    it.each([
      ['is missing', {}],
      ['is wrong', { currentPassword: 'not the password' }],
    ])('keeps the account when the password %s', async (_case, body) => {
      const session = await register();

      const response = await as(session)
        .post('/account/delete', body)
        .expect(403);

      expect(response.body.code).toBe('invalid_current_password');
      await expect(prisma.user.count()).resolves.toBe(1);
      await login(ana.email, ana.password).expect(200);
    });

    it('needs no password for an account that only signs in with Google', async () => {
      const session = await googleSession('google-ana');

      await as(session).post('/account/delete', {}).expect(204);

      await expect(prisma.user.count()).resolves.toBe(0);
    });

    it('deletes only the account of the caller', async () => {
      const anaSession = await register(ana);
      const luisSession = await register(luis);

      await as(anaSession)
        .post('/account/delete', { currentPassword: ana.password })
        .expect(204);

      await as(luisSession).get('/account').expect(200);
      await refresh(luisSession.refreshToken).expect(200);
      await expect(prisma.user.count()).resolves.toBe(1);
    });

    it('lets the email be registered again afterwards', async () => {
      const session = await register();
      await as(session)
        .post('/account/delete', { currentPassword: ana.password })
        .expect(204);

      const again = await register();

      const account = await as(again).get('/account').expect(200);
      expect(account.body.email).toBe(ana.email);
    });

    it('rejects unknown properties', async () => {
      const session = await register();

      await as(session)
        .post('/account/delete', {
          currentPassword: ana.password,
          userId: 'someone-else',
        })
        .expect(400);

      await expect(prisma.user.count()).resolves.toBe(1);
    });
  });

  it('documents the account endpoints in OpenAPI', async () => {
    const response = await http().get('/docs-json').expect(200);

    expect(Object.keys(response.body.paths)).toEqual(
      expect.arrayContaining([
        '/account',
        '/account/password',
        '/account/google',
        '/account/delete',
      ]),
    );
    expect(response.body.paths['/account'].get.security).toEqual([
      { bearer: [] },
    ]);
  });
});
