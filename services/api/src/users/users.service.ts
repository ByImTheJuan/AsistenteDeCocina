import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import type { User } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

export type GoogleProfile = {
  sub: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
};

@Injectable()
export class UsersService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  // Creates the account on the first sign-in and refreshes the profile data on
  // later ones. `googleSub` is unique, so an account is never duplicated.
  async upsertFromGoogle(profile: GoogleProfile): Promise<User> {
    const data = {
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.avatarUrl,
    };
    const upsert = () =>
      this.prisma.user.upsert({
        where: { googleSub: profile.sub },
        create: { googleSub: profile.sub, ...data },
        update: data,
      });

    try {
      return await upsert();
    } catch (error) {
      // Two first sign-ins racing: the loser hits the unique index. The row
      // exists now, so the retry takes the update path.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return upsert();
      }
      throw error;
    }
  }
}
