import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import type { User } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

export type GoogleProfile = {
  sub: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
};

export type PasswordAccount = {
  name: string;
  email: string;
  passwordHash: string;
};

/** Emails identify accounts, so they are compared trimmed and in lower case. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

@Injectable()
export class UsersService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email: normalizeEmail(email) },
    });
  }

  /** Fails with a conflict when the email already has an account. */
  async createWithPassword(account: PasswordAccount): Promise<User> {
    try {
      return await this.prisma.user.create({
        data: {
          name: account.name,
          email: normalizeEmail(account.email),
          passwordHash: account.passwordHash,
        },
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Email already registered');
      }
      throw error;
    }
  }

  // Finds the account for a verified Google profile, creating it on the first
  // sign-in. There is one account per email, so a profile whose email already
  // belongs to a password account takes that account over.
  async upsertFromGoogle(profile: GoogleProfile): Promise<User> {
    try {
      return await this.resolveGoogleAccount(profile);
    } catch (error) {
      // Two first sign-ins racing: the loser hits a unique index. The row
      // exists now, so the retry finds it.
      if (isUniqueViolation(error)) {
        return this.resolveGoogleAccount(profile);
      }
      throw error;
    }
  }

  private async resolveGoogleAccount(profile: GoogleProfile): Promise<User> {
    const email = normalizeEmail(profile.email);
    const details = { name: profile.name, avatarUrl: profile.avatarUrl };

    const known = await this.prisma.user.findUnique({
      where: { googleSub: profile.sub },
    });
    if (known) {
      return this.refreshGoogleProfile(known, email, details);
    }

    const sameEmail = await this.prisma.user.findUnique({ where: { email } });
    if (!sameEmail) {
      return this.prisma.user.create({
        data: { googleSub: profile.sub, email, ...details },
      });
    }
    if (sameEmail.googleSub) {
      // The address now belongs to a different Google account.
      throw new ConflictException('Email already registered');
    }
    return this.linkPasswordAccountToGoogle(sameEmail, profile);
  }

  private async refreshGoogleProfile(
    user: User,
    email: string,
    details: { name: string | null; avatarUrl: string | null },
  ): Promise<User> {
    try {
      return await this.prisma.user.update({
        where: { id: user.id },
        data: { email, ...details },
      });
    } catch (error) {
      if (!isUniqueViolation(error)) {
        throw error;
      }
      // The new address is taken by another account: keep the current one.
      return this.prisma.user.update({ where: { id: user.id }, data: details });
    }
  }

  // Emails of password accounts are not verified, so whoever registered this
  // address may not own it. Google has verified that this person does: the
  // password and every open session stop working.
  private linkPasswordAccountToGoogle(
    user: User,
    profile: GoogleProfile,
  ): Promise<User> {
    return this.prisma.$transaction(async (tx) => {
      await tx.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return tx.user.update({
        where: { id: user.id },
        data: {
          googleSub: profile.sub,
          passwordHash: null,
          name: profile.name ?? user.name,
          avatarUrl: profile.avatarUrl,
        },
      });
    });
  }
}
