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
  // belongs to a password account is linked to it: from then on the account
  // can sign in with either method.
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

    const known = await this.prisma.user.findUnique({
      where: { googleSub: profile.sub },
    });
    if (known) {
      return this.refreshGoogleProfile(known, email, profile);
    }

    const sameEmail = await this.prisma.user.findUnique({ where: { email } });
    if (!sameEmail) {
      return this.prisma.user.create({
        data: {
          googleSub: profile.sub,
          email,
          name: profile.name,
          avatarUrl: profile.avatarUrl,
        },
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
    profile: GoogleProfile,
  ): Promise<User> {
    const details = this.detailsFromGoogle(user, profile);
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

  // Google becomes a second way into the account: the password and the open
  // sessions keep working. Emails of password accounts are not verified, so
  // whoever registered this address keeps access too.
  private linkPasswordAccountToGoogle(
    user: User,
    profile: GoogleProfile,
  ): Promise<User> {
    return this.prisma.user.update({
      where: { id: user.id },
      data: {
        googleSub: profile.sub,
        ...this.detailsFromGoogle(user, profile),
      },
    });
  }

  // The name may have been chosen by the user when registering, so Google
  // only fills it in when it is missing. The picture only comes from Google.
  private detailsFromGoogle(
    user: User,
    profile: GoogleProfile,
  ): { name: string | null; avatarUrl: string | null } {
    return {
      name: user.name ?? profile.name,
      avatarUrl: profile.avatarUrl,
    };
  }
}
