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
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { UsersService } from '../users/users.service.js';
import {
  GoogleSignInRequest,
  PasswordSignInRequest,
  RefreshTokenRequest,
  RegisterRequest,
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

  @Post('register')
  @UseGuards(ThrottlerGuard)
  @ApiOperation({ summary: 'Create an account with email and password' })
  @ApiCreatedResponse({ type: SessionResponse })
  @ApiBadRequestResponse({ description: 'Invalid name, email or password' })
  @ApiConflictResponse({ description: 'The email already has an account' })
  @ApiTooManyRequestsResponse({ description: 'Too many attempts' })
  async register(@Body() body: RegisterRequest): Promise<SessionResponse> {
    return toSessionResponse(await this.auth.register(body));
  }

  @Post('login')
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in with email and password' })
  @ApiOkResponse({ type: SessionResponse })
  @ApiBadRequestResponse({ description: 'Malformed request body' })
  @ApiUnauthorizedResponse({ description: 'Invalid email or password' })
  @ApiTooManyRequestsResponse({ description: 'Too many attempts' })
  async signInWithPassword(
    @Body() body: PasswordSignInRequest,
  ): Promise<SessionResponse> {
    return toSessionResponse(
      await this.auth.signInWithPassword(body.email, body.password),
    );
  }

  @Post('google')
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sign in with a Google ID token',
    description: 'Creates the account on the first sign-in.',
  })
  @ApiOkResponse({ type: SessionResponse })
  @ApiBadRequestResponse({ description: 'Malformed request body' })
  @ApiUnauthorizedResponse({ description: 'Invalid Google ID token' })
  @ApiConflictResponse({
    description: 'The email belongs to a different Google account',
  })
  @ApiTooManyRequestsResponse({ description: 'Too many attempts' })
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
