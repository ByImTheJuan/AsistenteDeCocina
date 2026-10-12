import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash } from 'node:crypto';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { UsersService } from '../users/users.service.js';
import { AuthService } from './auth.service.js';
import type { GoogleTokenVerifier } from './google-token-verifier.js';

// Persistence against MySQL is covered by test/auth.e2e-spec.ts. These tests
// pin down the decisions the service takes around it.
const user = {
  id: 'user-1',
  googleSub: 'google-1',
  email: 'ana@example.com',
  name: 'Ana',
  avatarUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const sha256 = (value: string) =>
  createHash('sha256').update(value).digest('hex');

function storedToken(overrides: Record<string, unknown> = {}) {
  return {
    id: 'token-1',
    userId: user.id,
    familyId: 'family-1',
    tokenHash: sha256('current-token'),
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt: null,
    createdAt: new Date(),
    user,
    ...overrides,
  };
}

describe('AuthService', () => {
  const refreshToken = {
    findUnique: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
  };
  const prisma = {
    refreshToken,
    $transaction: vi.fn((run: (tx: unknown) => unknown) =>
      run({ refreshToken }),
    ),
  };
  const users = { upsertFromGoogle: vi.fn() };
  const googleTokenVerifier = { verify: vi.fn() };
  const jwt = new JwtService({ secret: 'unit-test-secret-with-enough-length' });

  let service: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    refreshToken.updateMany.mockResolvedValue({ count: 1 });
    service = new AuthService(
      prisma as unknown as PrismaService,
      users as unknown as UsersService,
      googleTokenVerifier as unknown as GoogleTokenVerifier,
      jwt,
      new ConfigService({ REFRESH_TOKEN_TTL_DAYS: 30 }),
    );
  });

  describe('signInWithGoogle', () => {
    it('issues a session for the account that matches the Google profile', async () => {
      const profile = {
        sub: 'google-1',
        email: user.email,
        name: user.name,
        avatarUrl: null,
      };
      googleTokenVerifier.verify.mockResolvedValue(profile);
      users.upsertFromGoogle.mockResolvedValue(user);

      const session = await service.signInWithGoogle('id-token');

      expect(users.upsertFromGoogle).toHaveBeenCalledWith(profile);
      expect(session.user).toBe(user);
      expect(jwt.decode(session.accessToken)).toMatchObject({ sub: user.id });
      expect(refreshToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: user.id,
          tokenHash: sha256(session.refreshToken),
        }),
      });
    });

    it('does not create an account when Google rejects the token', async () => {
      googleTokenVerifier.verify.mockRejectedValue(new UnauthorizedException());

      await expect(service.signInWithGoogle('id-token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(users.upsertFromGoogle).not.toHaveBeenCalled();
      expect(refreshToken.create).not.toHaveBeenCalled();
    });

    it('sets the refresh token expiry from the configured lifetime', async () => {
      googleTokenVerifier.verify.mockResolvedValue({});
      users.upsertFromGoogle.mockResolvedValue(user);
      const before = Date.now();

      await service.signInWithGoogle('id-token');

      const { expiresAt } = refreshToken.create.mock.calls[0][0].data;
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(before + thirtyDays);
      expect(expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + thirtyDays);
    });
  });

  describe('refresh', () => {
    it('looks the token up by its hash', async () => {
      refreshToken.findUnique.mockResolvedValue(storedToken());

      await service.refresh('current-token');

      expect(refreshToken.findUnique).toHaveBeenCalledWith({
        where: { tokenHash: sha256('current-token') },
        include: { user: true },
      });
    });

    it('revokes the used token and issues another one of the same family', async () => {
      refreshToken.findUnique.mockResolvedValue(storedToken());

      const session = await service.refresh('current-token');

      expect(refreshToken.updateMany).toHaveBeenCalledWith({
        where: { id: 'token-1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
      expect(refreshToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: user.id,
          familyId: 'family-1',
          tokenHash: sha256(session.refreshToken),
        }),
      });
      expect(session.refreshToken).not.toBe('current-token');
    });

    it('rejects an unknown token', async () => {
      refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.refresh('unknown')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(refreshToken.create).not.toHaveBeenCalled();
    });

    it('rejects an expired token', async () => {
      refreshToken.findUnique.mockResolvedValue(
        storedToken({ expiresAt: new Date(Date.now() - 1) }),
      );

      await expect(service.refresh('current-token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(refreshToken.create).not.toHaveBeenCalled();
    });

    it('revokes the whole family when a revoked token is reused', async () => {
      refreshToken.findUnique.mockResolvedValue(
        storedToken({ revokedAt: new Date() }),
      );

      await expect(service.refresh('current-token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(refreshToken.updateMany).toHaveBeenCalledWith({
        where: { familyId: 'family-1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
      expect(refreshToken.create).not.toHaveBeenCalled();
    });

    it('revokes the whole family when another request rotated the token first', async () => {
      refreshToken.findUnique.mockResolvedValue(storedToken());
      refreshToken.updateMany.mockResolvedValueOnce({ count: 0 });

      await expect(service.refresh('current-token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(refreshToken.create).not.toHaveBeenCalled();
      expect(refreshToken.updateMany).toHaveBeenLastCalledWith({
        where: { familyId: 'family-1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });

  describe('signOut', () => {
    it('revokes the token by its hash', async () => {
      await service.signOut('current-token');

      expect(refreshToken.updateMany).toHaveBeenCalledWith({
        where: { tokenHash: sha256('current-token'), revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('does not fail for a token that is not active', async () => {
      refreshToken.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.signOut('unknown')).resolves.toBeUndefined();
    });
  });
});
