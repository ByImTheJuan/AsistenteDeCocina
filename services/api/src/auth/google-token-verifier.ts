import {
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import type { TokenPayload } from 'google-auth-library';
import { EnvironmentVariables } from '../config/env.validation.js';
import type { GoogleProfile } from '../users/users.service.js';

@Injectable()
export class GoogleTokenVerifier {
  private readonly logger = new Logger(GoogleTokenVerifier.name);
  private readonly client = new OAuth2Client();
  private readonly audience: string;

  constructor(
    @Inject(ConfigService)
    config: ConfigService<EnvironmentVariables, true>,
  ) {
    this.audience = config.get('GOOGLE_CLIENT_ID', { infer: true });
  }

  // Checks signature, issuer, expiry and audience against Google's keys.
  async verify(idToken: string): Promise<GoogleProfile> {
    let payload: TokenPayload | undefined;
    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: this.audience,
      });
      payload = ticket.getPayload();
    } catch (error) {
      // The library appends the token or its decoded payload after a colon;
      // only the reason before it is safe to log.
      const reason =
        error instanceof Error ? error.message.split(':')[0] : 'unknown error';
      this.logger.warn(`Google ID token rejected: ${reason}`);
      throw new UnauthorizedException('Invalid Google ID token');
    }

    if (!payload?.sub || !payload.email || payload.email_verified !== true) {
      throw new UnauthorizedException('Invalid Google ID token');
    }

    return {
      sub: payload.sub,
      email: payload.email,
      name: payload.name ?? null,
      avatarUrl: payload.picture ?? null,
    };
  }
}
