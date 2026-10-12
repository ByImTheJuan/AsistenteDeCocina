import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UsersService } from '../users/users.service.js';
import {
  GoogleSignInRequest,
  RefreshTokenRequest,
  SessionResponse,
  UserResponse,
} from './auth.dto.js';
import { AuthService } from './auth.service.js';
import type { Session } from './auth.service.js';
import { CurrentUser } from './current-user.decorator.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import type { AuthenticatedUser } from './jwt-auth.guard.js';

function toSessionResponse(session: Session): SessionResponse {
  return {
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    user: UserResponse.from(session.user),
  };
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(UsersService) private readonly users: UsersService,
  ) {}

  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sign in with a Google ID token',
    description: 'Creates the account on the first sign-in.',
  })
  @ApiOkResponse({ type: SessionResponse })
  @ApiBadRequestResponse({ description: 'Malformed request body' })
  @ApiUnauthorizedResponse({ description: 'Invalid Google ID token' })
  async signInWithGoogle(
    @Body() body: GoogleSignInRequest,
  ): Promise<SessionResponse> {
    return toSessionResponse(await this.auth.signInWithGoogle(body.idToken));
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange a refresh token for a new session' })
  @ApiOkResponse({ type: SessionResponse })
  @ApiBadRequestResponse({ description: 'Malformed request body' })
  @ApiUnauthorizedResponse({
    description: 'Unknown, expired or already used refresh token',
  })
  async refresh(@Body() body: RefreshTokenRequest): Promise<SessionResponse> {
    return toSessionResponse(await this.auth.refresh(body.refreshToken));
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke a refresh token' })
  @ApiNoContentResponse()
  @ApiBadRequestResponse({ description: 'Malformed request body' })
  async signOut(@Body() body: RefreshTokenRequest): Promise<void> {
    await this.auth.signOut(body.refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Return the signed-in user' })
  @ApiOkResponse({ type: UserResponse })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  async me(@CurrentUser() current: AuthenticatedUser): Promise<UserResponse> {
    const user = await this.users.findById(current.id);
    if (!user) {
      throw new UnauthorizedException('Invalid access token');
    }
    return UserResponse.from(user);
  }
}
