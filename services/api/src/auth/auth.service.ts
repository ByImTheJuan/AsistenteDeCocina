import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { EnvironmentVariables } from '../config/env.validation.js';
import type { User } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsersService } from '../users/users.service.js';
import { GoogleTokenVerifier } from './google-token-verifier.js';

export type Session = {
  accessToken: string;
  refreshToken: string;
  user: User;
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService {
  private readonly refreshTokenTtlMs: number;

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(UsersService) private readonly users: UsersService,
    @Inject(GoogleTokenVerifier)
    private readonly googleTokenVerifier: GoogleTokenVerifier,
    @Inject(JwtService) private readonly jwt: JwtService,
    @Inject(ConfigService)
    config: ConfigService<EnvironmentVariables, true>,
  ) {
    this.refreshTokenTtlMs =
      config.get('REFRESH_TOKEN_TTL_DAYS', { infer: true }) * DAY_IN_MS;
  }

  async signInWithGoogle(idToken: string): Promise<Session> {
    const profile = await this.googleTokenVerifier.verify(idToken);
    const user = await this.users.upsertFromGoogle(profile);
    const refreshToken = await this.createRefreshToken(user.id, randomUUID());
    return this.buildSession(user, refreshToken);
  }

  // Each refresh token can be used once: it is revoked and replaced by a new
  // one of the same family.
  async refresh(refreshToken: string): Promise<Session> {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(refreshToken) },
      include: { user: true },
    });
    if (!stored) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (stored.revokedAt) {
      // A revoked token coming back means it was copied: end every session
      // descended from that sign-in.
      await this.revokeFamily(stored.familyId);
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (stored.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const replacement = this.generateRefreshToken();
    const rotated = await this.prisma.$transaction(async (tx) => {
      // The `revokedAt: null` filter makes concurrent uses of the same token
      // race on this update, so only one of them can win.
      const { count } = await tx.refreshToken.updateMany({
        where: { id: stored.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      if (count !== 1) {
        return false;
      }
      await tx.refreshToken.create({
        data: {
          userId: stored.userId,
          familyId: stored.familyId,
          tokenHash: hashToken(replacement),
          expiresAt: new Date(Date.now() + this.refreshTokenTtlMs),
        },
      });
      return true;
    });
    if (!rotated) {
      await this.revokeFamily(stored.familyId);
      throw new UnauthorizedException('Invalid refresh token');
    }

    return this.buildSession(stored.user, replacement);
  }

  // Idempotent: an unknown or already revoked token is not an error.
  async signOut(refreshToken: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async revokeFamily(familyId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private generateRefreshToken(): string {
    return randomBytes(32).toString('base64url');
  }

  private async createRefreshToken(
    userId: string,
    familyId: string,
  ): Promise<string> {
    const token = this.generateRefreshToken();
    await this.prisma.refreshToken.create({
      data: {
        userId,
        familyId,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + this.refreshTokenTtlMs),
      },
    });
    return token;
  }

  private async buildSession(
    user: User,
    refreshToken: string,
  ): Promise<Session> {
    const accessToken = await this.jwt.signAsync({ sub: user.id });
    return { accessToken, refreshToken, user };
  }
}
