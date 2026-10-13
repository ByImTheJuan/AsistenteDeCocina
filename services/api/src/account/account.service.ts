import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { GoogleTokenVerifier } from '../auth/google-token-verifier.js';
import type { AuthenticatedUser } from '../auth/jwt-auth.guard.js';
import { PasswordHasher } from '../auth/password-hasher.js';
import { Prisma } from '../generated/prisma/client.js';
import type { User } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { normalizeEmail } from '../users/users.service.js';
import { accountConflict, invalidCurrentPassword } from './account.errors.js';

@Injectable()
export class AccountService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PasswordHasher) private readonly passwordHasher: PasswordHasher,
    @Inject(GoogleTokenVerifier)
    private readonly googleTokenVerifier: GoogleTokenVerifier,
  ) {}

  getAccount(current: AuthenticatedUser): Promise<User> {
    return this.requireUser(current);
  }

  /** Adds a password to the account or replaces the one it has. */
  async setPassword(
    current: AuthenticatedUser,
    newPassword: string,
    currentPassword: string | undefined,
  ): Promise<User> {
    const user = await this.requireUser(current);
    await this.confirmPassword(user, currentPassword);

    const passwordHash = await this.passwordHasher.hash(newPassword);
    return this.prisma.$transaction(async (tx) => {
      await this.closeOtherSessions(tx, current);
      return tx.user.update({ where: { id: user.id }, data: { passwordHash } });
    });
  }

  async removePassword(
    current: AuthenticatedUser,
    currentPassword: string,
  ): Promise<User> {
    const user = await this.requireUser(current);
    if (!user.passwordHash) {
      return user;
    }
    if (!user.googleSub) {
      throw this.lastSignInMethod();
    }
    await this.confirmPassword(user, currentPassword);

    return this.prisma.$transaction(async (tx) => {
      // The filter repeats the check inside the statement: a concurrent
      // request unlinking Google cannot leave the account without any method.
      const { count } = await tx.user.updateMany({
        where: { id: user.id, googleSub: { not: null } },
        data: { passwordHash: null },
      });
      if (count !== 1) {
        throw this.lastSignInMethod();
      }
      await this.closeOtherSessions(tx, current);
      return tx.user.findUniqueOrThrow({ where: { id: user.id } });
    });
  }

  // Only the Google account with the same email can be linked: there is one
  // account per email, and Google sign-in finds accounts by it.
  async linkGoogle(current: AuthenticatedUser, idToken: string): Promise<User> {
    const user = await this.requireUser(current);
    const profile = await this.googleTokenVerifier.verify(idToken);

    if (normalizeEmail(profile.email) !== user.email) {
      throw accountConflict(
        'google_email_mismatch',
        'The Google account has a different email than this account',
      );
    }
    if (user.googleSub === profile.sub) {
      return user;
    }
    if (user.googleSub) {
      throw accountConflict(
        'google_already_linked',
        'This account is already linked to another Google account',
      );
    }

    try {
      return await this.prisma.user.update({
        where: { id: user.id },
        data: {
          googleSub: profile.sub,
          avatarUrl: profile.avatarUrl ?? user.avatarUrl,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw accountConflict(
          'google_account_in_use',
          'The Google account is linked to another account',
        );
      }
      throw error;
    }
  }

  async unlinkGoogle(
    current: AuthenticatedUser,
    currentPassword: string,
  ): Promise<User> {
    const user = await this.requireUser(current);
    if (!user.googleSub) {
      return user;
    }
    if (!user.passwordHash) {
      throw this.lastSignInMethod();
    }
    await this.confirmPassword(user, currentPassword);

    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.user.updateMany({
        where: { id: user.id, passwordHash: { not: null } },
        data: { googleSub: null },
      });
      if (count !== 1) {
        throw this.lastSignInMethod();
      }
      await this.closeOtherSessions(tx, current);
      return tx.user.findUniqueOrThrow({ where: { id: user.id } });
    });
  }

  // Immediate and permanent, as set in docs/data-retention-policy.md. Rows
  // that belong to the user go with it through cascading foreign keys.
  async deleteAccount(
    current: AuthenticatedUser,
    currentPassword: string | undefined,
  ): Promise<void> {
    const user = await this.requireUser(current);
    await this.confirmPassword(user, currentPassword);
    await this.prisma.user.deleteMany({ where: { id: user.id } });
  }

  // A valid access token can outlive its account by a few minutes.
  private async requireUser(current: AuthenticatedUser): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id: current.id },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid access token');
    }
    return user;
  }

  // Accounts with a password prove it on sensitive changes, so an unlocked
  // phone is not enough. Accounts without one rely on the session alone.
  private async confirmPassword(
    user: User,
    currentPassword: string | undefined,
  ): Promise<void> {
    if (!user.passwordHash) {
      return;
    }
    if (
      !currentPassword ||
      !(await this.passwordHasher.verify(currentPassword, user.passwordHash))
    ) {
      throw invalidCurrentPassword();
    }
  }

  // After a credential changes, sessions opened with the old ones end. The
  // calling session stays so the user is not signed out of this device.
  private async closeOtherSessions(
    tx: Prisma.TransactionClient,
    current: AuthenticatedUser,
  ): Promise<void> {
    await tx.refreshToken.updateMany({
      where: {
        userId: current.id,
        revokedAt: null,
        ...(current.sessionId ? { familyId: { not: current.sessionId } } : {}),
      },
      data: { revokedAt: new Date() },
    });
  }

  private lastSignInMethod() {
    return accountConflict(
      'last_sign_in_method',
      'The account must keep at least one sign-in method',
    );
  }
}
