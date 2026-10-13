import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import type { User } from '../generated/prisma/client.js';

export class GoogleSignInRequest {
  @ApiProperty({ description: 'ID token issued by Google to the mobile app' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  idToken: string;
}

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const trimAndLowerCase = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class RegisterRequest {
  @ApiProperty({ example: 'Ana', maxLength: 100 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'ana@example.com', maxLength: 320 })
  @Transform(trimAndLowerCase)
  @IsEmail()
  @MaxLength(320)
  email: string;

  // Length is the only rule: composition rules make passwords worse.
  @ApiProperty({ minLength: 8, maxLength: 128 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;
}

export class PasswordSignInRequest {
  @ApiProperty({ example: 'ana@example.com' })
  @Transform(trimAndLowerCase)
  @IsEmail()
  @MaxLength(320)
  email: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password: string;
}

export class RefreshTokenRequest {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  refreshToken: string;
}

export class UserResponse {
  @ApiProperty()
  id: string;

  @ApiProperty({ example: 'ana@example.com' })
  email: string;

  @ApiProperty({ type: String, nullable: true })
  name: string | null;

  @ApiProperty({ type: String, nullable: true })
  avatarUrl: string | null;

  // Explicit mapping so internal columns (such as `googleSub`) never leak.
  static from(user: User): UserResponse {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    };
  }
}

export class SessionResponse {
  @ApiProperty({ description: 'Short-lived JWT for the Authorization header' })
  accessToken: string;

  @ApiProperty({ description: 'Single-use token to obtain a new session' })
  refreshToken: string;

  @ApiProperty({ type: UserResponse })
  user: UserResponse;
}
