import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createHash } from 'node:crypto';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { GoogleTokenVerifier } from './../src/auth/google-token-verifier.js';
import { PrismaService } from './../src/prisma/prisma.service.js';
import { setupApp } from './../src/setup-app.js';
import type { GoogleProfile } from './../src/users/users.service.js';

const profiles: Record<string, GoogleProfile> = {
  'token-ana': {
    sub: 'google-ana',
    email: 'ana@example.com',
    name: 'Ana',
    avatarUrl: 'https://example.com/ana.png',
  },
  'token-ana-renamed': {
    sub: 'google-ana',
    email: 'ana.nueva@example.com',
    name: 'Ana María',
    avatarUrl: null,
  },
  'token-luis': {
    sub: 'google-luis',
    email: 'luis@example.com',
    name: null,
    avatarUrl: null,
  },
};

// Stands in for Google: the real verifier needs network access and tokens
// signed by Google. Its own behaviour is covered by its unit tests.
const fakeGoogleTokenVerifier = {
  verify: async (idToken: string): Promise<GoogleProfile> => {
    const profile = profiles[idToken];
    if (!profile) {
      throw new UnauthorizedException('Invalid Google ID token');
    }
    return profile;
  },
};

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const http = () => request(app.getHttpServer());
  const signIn = (idToken: string) =>
    http().post('/auth/google').send({ idToken });

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

  describe('POST /auth/google', () => {
    it('creates the account and starts a session on the first sign-in', async () => {
      const response = await signIn('token-ana').expect(200);

      expect(response.body).toEqual({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        user: {
          id: expect.any(String),
          email: 'ana@example.com',
          name: 'Ana',
          avatarUrl: 'https://example.com/ana.png',
        },
      });
      await expect(prisma.user.count()).resolves.toBe(1);
    });

    it('reuses the existing account on later sign-ins', async () => {
      const first = await signIn('token-ana').expect(200);
      const second = await signIn('token-ana').expect(200);

      expect(second.body.user.id).toBe(first.body.user.id);
      await expect(prisma.user.count()).resolves.toBe(1);
    });

    it('updates the profile data without creating another account', async () => {
      const first = await signIn('token-ana').expect(200);
      const second = await signIn('token-ana-renamed').expect(200);

      expect(second.body.user).toEqual({
        id: first.body.user.id,
        email: 'ana.nueva@example.com',
        name: 'Ana María',
        avatarUrl: null,
      });
      await expect(prisma.user.count()).resolves.toBe(1);
    });

    it('does not duplicate the account when two first sign-ins race', async () => {
      const responses = await Promise.all([
        signIn('token-ana'),
        signIn('token-ana'),
        signIn('token-ana'),
      ]);

      expect(responses.map((response) => response.status)).toEqual([
        200, 200, 200,
      ]);
      await expect(prisma.user.count()).resolves.toBe(1);
    });

    it('keeps different Google accounts separate', async () => {
      const ana = await signIn('token-ana').expect(200);
      const luis = await signIn('token-luis').expect(200);

      expect(luis.body.user.id).not.toBe(ana.body.user.id);
      await expect(prisma.user.count()).resolves.toBe(2);
    });

    it('rejects a token that Google does not accept', async () => {
      await signIn('forged-token').expect(401);

      await expect(prisma.user.count()).resolves.toBe(0);
    });

    it.each([
      ['a missing token', {}],
      ['an empty token', { idToken: '' }],
      ['a non-string token', { idToken: 123 }],
      ['an oversized token', { idToken: 'a'.repeat(4097) }],
      ['unknown properties', { idToken: 'token-ana', role: 'admin' }],
    ])('rejects a body with %s', async (_case, body) => {
      await http().post('/auth/google').send(body).expect(400);
    });

    it('stores only a hash of the refresh token', async () => {
      const { body } = await signIn('token-ana').expect(200);

      const stored = await prisma.refreshToken.findMany();
      expect(stored).toHaveLength(1);
      expect(stored[0].tokenHash).not.toBe(body.refreshToken);
      expect(stored[0].tokenHash).toBe(
        createHash('sha256').update(body.refreshToken).digest('hex'),
      );
    });
  });

  describe('GET /auth/me', () => {
    it('returns the user that owns the access token', async () => {
      const ana = await signIn('token-ana').expect(200);
      const luis = await signIn('token-luis').expect(200);

      const anaMe = await http()
        .get('/auth/me')
        .set('Authorization', `Bearer ${ana.body.accessToken}`)
        .expect(200);
      const luisMe = await http()
        .get('/auth/me')
        .set('Authorization', `Bearer ${luis.body.accessToken}`)
        .expect(200);

      expect(anaMe.body).toEqual(ana.body.user);
      expect(luisMe.body).toEqual(luis.body.user);
    });

    it('does not expose the Google account identifier', async () => {
      const { body } = await signIn('token-ana').expect(200);

      const me = await http()
        .get('/auth/me')
        .set('Authorization', `Bearer ${body.accessToken}`)
        .expect(200);

      expect(Object.keys(me.body).sort()).toEqual([
        'avatarUrl',
        'email',
        'id',
        'name',
      ]);
    });

    it('rejects a request without access token', async () => {
      await http().get('/auth/me').expect(401);
    });

    it('rejects an invalid access token', async () => {
      await http()
        .get('/auth/me')
        .set('Authorization', 'Bearer not-a-valid-token')
        .expect(401);
    });

    it('rejects a refresh token used as access token', async () => {
      const { body } = await signIn('token-ana').expect(200);

      await http()
        .get('/auth/me')
        .set('Authorization', `Bearer ${body.refreshToken}`)
        .expect(401);
    });

    it('rejects the token of an account that no longer exists', async () => {
      const { body } = await signIn('token-ana').expect(200);
      await prisma.user.delete({ where: { id: body.user.id } });

      await http()
        .get('/auth/me')
        .set('Authorization', `Bearer ${body.accessToken}`)
        .expect(401);
    });
  });

  describe('POST /auth/refresh', () => {
    const refresh = (refreshToken: string) =>
      http().post('/auth/refresh').send({ refreshToken });

    it('issues a new session for the same user', async () => {
      const session = await signIn('token-ana').expect(200);

      const renewed = await refresh(session.body.refreshToken).expect(200);

      expect(renewed.body.user).toEqual(session.body.user);
      expect(renewed.body.refreshToken).not.toBe(session.body.refreshToken);
      await http()
        .get('/auth/me')
        .set('Authorization', `Bearer ${renewed.body.accessToken}`)
        .expect(200);
    });

    it('lets the rotated token be used in turn', async () => {
      const session = await signIn('token-ana').expect(200);
      const second = await refresh(session.body.refreshToken).expect(200);

      await refresh(second.body.refreshToken).expect(200);
    });

    it('rejects a token that was already used and ends its whole session', async () => {
      const session = await signIn('token-ana').expect(200);
      const renewed = await refresh(session.body.refreshToken).expect(200);

      await refresh(session.body.refreshToken).expect(401);
      await refresh(renewed.body.refreshToken).expect(401);
    });

    it('does not end other sessions of the user when one is compromised', async () => {
      const phone = await signIn('token-ana').expect(200);
      const tablet = await signIn('token-ana').expect(200);
      await refresh(phone.body.refreshToken).expect(200);
      await refresh(phone.body.refreshToken).expect(401);

      await refresh(tablet.body.refreshToken).expect(200);
    });

    it('accepts only one of two concurrent uses of the same token', async () => {
      const session = await signIn('token-ana').expect(200);

      const responses = await Promise.all([
        refresh(session.body.refreshToken),
        refresh(session.body.refreshToken),
      ]);

      expect(
        responses.filter((response) => response.status === 200).length,
      ).toBeLessThanOrEqual(1);
      await expect(
        prisma.refreshToken.count({ where: { revokedAt: null } }),
      ).resolves.toBeLessThanOrEqual(1);
    });

    it('rejects an expired token', async () => {
      const session = await signIn('token-ana').expect(200);
      await prisma.refreshToken.updateMany({
        data: { expiresAt: new Date(Date.now() - 1000) },
      });

      await refresh(session.body.refreshToken).expect(401);
    });

    it('rejects an unknown token', async () => {
      await refresh('unknown-token').expect(401);
    });

    it('rejects a body without token', async () => {
      await http().post('/auth/refresh').send({}).expect(400);
    });
  });

  describe('POST /auth/logout', () => {
    const logout = (refreshToken: string) =>
      http().post('/auth/logout').send({ refreshToken });

    it('revokes the refresh token', async () => {
      const session = await signIn('token-ana').expect(200);

      await logout(session.body.refreshToken).expect(204);

      await http()
        .post('/auth/refresh')
        .send({ refreshToken: session.body.refreshToken })
        .expect(401);
    });

    it('keeps the account so the user can sign in again', async () => {
      const session = await signIn('token-ana').expect(200);
      await logout(session.body.refreshToken).expect(204);

      const again = await signIn('token-ana').expect(200);

      expect(again.body.user.id).toBe(session.body.user.id);
    });

    it('only ends the session it is called with', async () => {
      const ana = await signIn('token-ana').expect(200);
      const luis = await signIn('token-luis').expect(200);

      await logout(ana.body.refreshToken).expect(204);

      await http()
        .post('/auth/refresh')
        .send({ refreshToken: luis.body.refreshToken })
        .expect(200);
    });

    it('is idempotent', async () => {
      const session = await signIn('token-ana').expect(200);

      await logout(session.body.refreshToken).expect(204);
      await logout(session.body.refreshToken).expect(204);
      await logout('unknown-token').expect(204);
    });

    it('rejects a body without token', async () => {
      await http().post('/auth/logout').send({}).expect(400);
    });
  });

  it('documents the auth endpoints in OpenAPI', async () => {
    const response = await http().get('/docs-json').expect(200);

    expect(Object.keys(response.body.paths)).toEqual(
      expect.arrayContaining([
        '/auth/google',
        '/auth/refresh',
        '/auth/logout',
        '/auth/me',
      ]),
    );
    expect(response.body.paths['/auth/me'].get.security).toEqual([
      { bearer: [] },
    ]);
  });
});
