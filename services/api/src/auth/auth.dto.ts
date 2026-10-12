import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import type { User } from '../generated/prisma/client.js';

export class GoogleSignInRequest {
  @ApiProperty({ description: 'ID token issued by Google to the mobile app' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  idToken: string;
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
