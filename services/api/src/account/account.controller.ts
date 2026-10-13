import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import type { AuthenticatedUser } from '../auth/jwt-auth.guard.js';
import {
  AccountResponse,
  CurrentPasswordRequest,
  DeleteAccountRequest,
  LinkGoogleRequest,
  SetPasswordRequest,
} from './account.dto.js';
import { AccountService } from './account.service.js';

const WRONG_PASSWORD = 'Current password missing or incorrect';
const LAST_METHOD = 'The account would be left without a sign-in method';

// Every route acts on the account of the access token; no account ID is
// ever taken from the request.
@ApiTags('account')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
@UseGuards(JwtAuthGuard)
@Controller('account')
export class AccountController {
  constructor(
    @Inject(AccountService) private readonly account: AccountService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Return the account and its sign-in methods' })
  @ApiOkResponse({ type: AccountResponse })
  async get(
    @CurrentUser() current: AuthenticatedUser,
  ): Promise<AccountResponse> {
    return AccountResponse.from(await this.account.getAccount(current));
  }

  @Put('password')
  @UseGuards(ThrottlerGuard)
  @ApiOperation({
    summary: 'Add a password or change the current one',
    description: 'Closes the other sessions of the account.',
  })
  @ApiOkResponse({ type: AccountResponse })
  @ApiBadRequestResponse({ description: 'Invalid new password' })
  @ApiForbiddenResponse({ description: WRONG_PASSWORD })
  @ApiTooManyRequestsResponse({ description: 'Too many attempts' })
  async setPassword(
    @CurrentUser() current: AuthenticatedUser,
    @Body() body: SetPasswordRequest,
  ): Promise<AccountResponse> {
    return AccountResponse.from(
      await this.account.setPassword(
        current,
        body.newPassword,
        body.currentPassword,
      ),
    );
  }

  @Delete('password')
  @UseGuards(ThrottlerGuard)
  @ApiOperation({ summary: 'Remove the password from the account' })
  @ApiOkResponse({ type: AccountResponse })
  @ApiForbiddenResponse({ description: WRONG_PASSWORD })
  @ApiConflictResponse({ description: LAST_METHOD })
  @ApiTooManyRequestsResponse({ description: 'Too many attempts' })
  async removePassword(
    @CurrentUser() current: AuthenticatedUser,
    @Body() body: CurrentPasswordRequest,
  ): Promise<AccountResponse> {
    return AccountResponse.from(
      await this.account.removePassword(current, body.currentPassword),
    );
  }

  @Put('google')
  @UseGuards(ThrottlerGuard)
  @ApiOperation({ summary: 'Link the Google account with the same email' })
  @ApiOkResponse({ type: AccountResponse })
  @ApiUnauthorizedResponse({
    description: 'Missing access token or invalid Google ID token',
  })
  @ApiConflictResponse({
    description:
      'Different email, Google account in use, or another one already linked',
  })
  @ApiTooManyRequestsResponse({ description: 'Too many attempts' })
  async linkGoogle(
    @CurrentUser() current: AuthenticatedUser,
    @Body() body: LinkGoogleRequest,
  ): Promise<AccountResponse> {
    return AccountResponse.from(
      await this.account.linkGoogle(current, body.idToken),
    );
  }

  @Delete('google')
  @UseGuards(ThrottlerGuard)
  @ApiOperation({ summary: 'Unlink Google from the account' })
  @ApiOkResponse({ type: AccountResponse })
  @ApiForbiddenResponse({ description: WRONG_PASSWORD })
  @ApiConflictResponse({ description: LAST_METHOD })
  @ApiTooManyRequestsResponse({ description: 'Too many attempts' })
  async unlinkGoogle(
    @CurrentUser() current: AuthenticatedUser,
    @Body() body: CurrentPasswordRequest,
  ): Promise<AccountResponse> {
    return AccountResponse.from(
      await this.account.unlinkGoogle(current, body.currentPassword),
    );
  }

  @Post('delete')
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete the account',
    description: 'Immediate and permanent. Removes every private datum.',
  })
  @ApiNoContentResponse()
  @ApiForbiddenResponse({ description: WRONG_PASSWORD })
  @ApiTooManyRequestsResponse({ description: 'Too many attempts' })
  async delete(
    @CurrentUser() current: AuthenticatedUser,
    @Body() body: DeleteAccountRequest,
  ): Promise<void> {
    await this.account.deleteAccount(current, body.currentPassword);
  }
}
