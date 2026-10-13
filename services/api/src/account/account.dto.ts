import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import type { User } from '../generated/prisma/client.js';

export class SetPasswordRequest {
  // Same rule as registration: length only.
  @ApiProperty({ minLength: 8, maxLength: 128 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword: string;

  @ApiPropertyOptional({
    description: 'Required when the account already has a password',
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  currentPassword?: string;
}

export class CurrentPasswordRequest {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  currentPassword: string;
}

export class LinkGoogleRequest {
  @ApiProperty({ description: 'ID token issued by Google to the mobile app' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  idToken: string;
}

export class DeleteAccountRequest {
  @ApiPropertyOptional({
    description: 'Required when the account has a password',
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  currentPassword?: string;
}

export class SignInMethodsResponse {
  @ApiProperty()
  password: boolean;

  @ApiProperty()
  google: boolean;
}

export class AccountResponse {
  @ApiProperty()
  id: string;

  @ApiProperty({ example: 'ana@example.com' })
  email: string;

  @ApiProperty({ type: String, nullable: true })
  name: string | null;

  @ApiProperty({ type: String, nullable: true })
  avatarUrl: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt: string;

  @ApiProperty({ type: SignInMethodsResponse })
  signInMethods: SignInMethodsResponse;

  // Says which methods exist without exposing the hash or the Google ID.
  static from(user: User): AccountResponse {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt.toISOString(),
      signInMethods: {
        password: user.passwordHash !== null,
        google: user.googleSub !== null,
      },
    };
  }
}
