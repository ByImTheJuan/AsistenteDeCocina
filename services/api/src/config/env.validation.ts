// Implicit type conversion reads the property types from decorator metadata.
import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

export class EnvironmentVariables {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT?: number;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL: string;

  // OAuth client ID of type "Web application": the audience of the ID tokens
  // that the mobile app obtains from Google.
  @IsString()
  @IsNotEmpty()
  GOOGLE_CLIENT_ID: string;

  @IsString()
  @MinLength(32)
  JWT_ACCESS_SECRET: string;

  @IsInt()
  @Min(60)
  JWT_ACCESS_TTL_SECONDS: number = 900;

  @IsInt()
  @Min(1)
  REFRESH_TOKEN_TTL_DAYS: number = 30;

  // Attempts allowed per client IP and window on the endpoints that accept
  // credentials.
  @IsInt()
  @Min(1)
  AUTH_RATE_LIMIT_MAX: number = 10;

  @IsInt()
  @Min(1)
  AUTH_RATE_LIMIT_WINDOW_SECONDS: number = 60;
}

// Fails fast at startup instead of on the first request that needs a value.
// Only variable names are reported, never their values.
export function validateEnv(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
    exposeDefaultValues: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    const details = errors
      .map((error) => Object.values(error.constraints ?? {}).join(', '))
      .join('; ');
    throw new Error(`Invalid environment configuration: ${details}`);
  }
  return validated;
}
