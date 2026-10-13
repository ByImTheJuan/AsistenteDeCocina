import { ConflictException, ForbiddenException } from '@nestjs/common';

// Stable identifiers the app maps to messages. Several of these share an HTTP
// status, so the status alone would not tell them apart.
export type AccountErrorCode =
  | 'invalid_current_password'
  | 'last_sign_in_method'
  | 'google_email_mismatch'
  | 'google_account_in_use'
  | 'google_already_linked';

// 403 rather than 401: clients treat 401 as an expired session and try to
// renew it, which is not what a wrong password means here.
export function invalidCurrentPassword(): ForbiddenException {
  return new ForbiddenException({
    statusCode: 403,
    error: 'Forbidden',
    code: 'invalid_current_password' satisfies AccountErrorCode,
    message: 'The current password is missing or incorrect',
  });
}

export function accountConflict(
  code: Exclude<AccountErrorCode, 'invalid_current_password'>,
  message: string,
): ConflictException {
  return new ConflictException({
    statusCode: 409,
    error: 'Conflict',
    code,
    message,
  });
}
