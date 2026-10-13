import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { seconds, ThrottlerModule } from '@nestjs/throttler';
import { EnvironmentVariables } from '../config/env.validation.js';
import { UsersModule } from '../users/users.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { GoogleTokenVerifier } from './google-token-verifier.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { PasswordHasher } from './password-hasher.js';

@Module({
  imports: [
    UsersModule,
    // Applied with ThrottlerGuard to the endpoints that accept credentials.
    // Counters live in memory and are kept per client IP.
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) => [
        {
          limit: config.get('AUTH_RATE_LIMIT_MAX', { infer: true }),
          ttl: seconds(
            config.get('AUTH_RATE_LIMIT_WINDOW_SECONDS', { infer: true }),
          ),
        },
      ],
    }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) => ({
        secret: config.get('JWT_ACCESS_SECRET', { infer: true }),
        signOptions: {
          algorithm: 'HS256',
          expiresIn: config.get('JWT_ACCESS_TTL_SECONDS', { infer: true }),
        },
        verifyOptions: { algorithms: ['HS256'] },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, GoogleTokenVerifier, JwtAuthGuard, PasswordHasher],
  // Other modules protect their routes with the guard, which needs JwtService.
  exports: [JwtAuthGuard, JwtModule, GoogleTokenVerifier, PasswordHasher],
})
export class AuthModule {}
