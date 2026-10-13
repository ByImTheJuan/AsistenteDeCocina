import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { GoogleTokenVerifier } from '../auth/google-token-verifier.js';
import type { PasswordHasher } from '../auth/password-hasher.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { AccountService } from './account.service.js';

// The rules are exercised against MySQL in test/account.e2e-spec.ts. These
// tests cover the branches that cannot be reached through the HTTP API.
const account = {
  id: 'user-1',
  googleSub: null,
  email: 'ana@example.com',
  passwordHash: 'hashed:current password',
  name: 'Ana',
  avatarUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('AccountService', () => {
  const user = {
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
  };
  const refreshToken = { updateMany: vi.fn() };
  const prisma = {
    user,
    refreshToken,
    $transaction: vi.fn((run: (tx: unknown) => unknown) =>
      run({ user, refreshToken }),
    ),
  };
  const passwordHasher = {
    hash: vi.fn(async (password: string) => `hashed:${password}`),
    verify: vi.fn(
      async (password: string, hash: string) => hash === `hashed:${password}`,
    ),
  };
  const googleTokenVerifier = { verify: vi.fn() };

  let service: AccountService;

  beforeEach(() => {
    vi.clearAllMocks();
    user.findUnique.mockResolvedValue(account);
    user.update.mockResolvedValue(account);
    service = new AccountService(
      prisma as unknown as PrismaService,
      passwordHasher as unknown as PasswordHasher,
      googleTokenVerifier as unknown as GoogleTokenVerifier,
    );
  });

  it('keeps the calling session open when the password changes', async () => {
    await service.setPassword(
      { id: 'user-1', sessionId: 'family-1' },
      'a new password',
      'current password',
    );

    expect(refreshToken.updateMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        revokedAt: null,
        familyId: { not: 'family-1' },
      },
      data: { revokedAt: expect.any(Date) },
    });
    expect(user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { passwordHash: 'hashed:a new password' },
    });
  });

  it('closes every session when the token does not identify its own', async () => {
    await service.setPassword(
      { id: 'user-1', sessionId: null },
      'a new password',
      'current password',
    );

    expect(refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it('changes nothing when the current password is wrong', async () => {
    await expect(
      service.setPassword(
        { id: 'user-1', sessionId: 'family-1' },
        'a new password',
        'wrong password',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(passwordHasher.hash).not.toHaveBeenCalled();
    expect(user.update).not.toHaveBeenCalled();
    expect(refreshToken.updateMany).not.toHaveBeenCalled();
  });

  it('does not delete the account when the password is wrong', async () => {
    await expect(
      service.deleteAccount({ id: 'user-1', sessionId: null }, 'wrong'),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(user.deleteMany).not.toHaveBeenCalled();
  });

  it('rejects a token whose account no longer exists', async () => {
    user.findUnique.mockResolvedValue(null);

    await expect(
      service.getAccount({ id: 'gone', sessionId: null }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(
      service.deleteAccount({ id: 'gone', sessionId: null }, undefined),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('does not check Google before knowing the caller exists', async () => {
    user.findUnique.mockResolvedValue(null);

    await expect(
      service.linkGoogle({ id: 'gone', sessionId: null }, 'id-token'),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(googleTokenVerifier.verify).not.toHaveBeenCalled();
  });
});
