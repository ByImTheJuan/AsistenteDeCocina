import { Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import type { LoginTicket, TokenPayload } from 'google-auth-library';
import { GoogleTokenVerifier } from './google-token-verifier.js';

const AUDIENCE = 'client-id.apps.googleusercontent.com';

function ticketWith(payload: Partial<TokenPayload> | undefined): LoginTicket {
  return { getPayload: () => payload } as LoginTicket;
}

describe('GoogleTokenVerifier', () => {
  let verifier: GoogleTokenVerifier;
  let verifyIdToken: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    verifyIdToken = vi.spyOn(OAuth2Client.prototype, 'verifyIdToken');
    verifier = new GoogleTokenVerifier(
      new ConfigService({ GOOGLE_CLIENT_ID: AUDIENCE }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the profile of a verified token', async () => {
    verifyIdToken.mockResolvedValue(
      ticketWith({
        sub: 'google-123',
        email: 'ana@example.com',
        email_verified: true,
        name: 'Ana',
        picture: 'https://example.com/ana.png',
      }),
    );

    await expect(verifier.verify('id-token')).resolves.toEqual({
      sub: 'google-123',
      email: 'ana@example.com',
      name: 'Ana',
      avatarUrl: 'https://example.com/ana.png',
    });
  });

  it('checks the token against the configured client ID', async () => {
    verifyIdToken.mockResolvedValue(
      ticketWith({ sub: 's', email: 'a@b.c', email_verified: true }),
    );

    await verifier.verify('id-token');

    expect(verifyIdToken).toHaveBeenCalledWith({
      idToken: 'id-token',
      audience: AUDIENCE,
    });
  });

  it('maps a missing name and picture to null', async () => {
    verifyIdToken.mockResolvedValue(
      ticketWith({ sub: 's', email: 'a@b.c', email_verified: true }),
    );

    await expect(verifier.verify('id-token')).resolves.toMatchObject({
      name: null,
      avatarUrl: null,
    });
  });

  it('rejects a token that Google does not accept', async () => {
    verifyIdToken.mockRejectedValue(new Error('Wrong recipient'));

    await expect(verifier.verify('id-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('does not write the rejected token to the log', async () => {
    const warn = vi
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    verifyIdToken.mockRejectedValue(
      new Error('Wrong number of segments in token: secret-token-value'),
    );

    await expect(verifier.verify('secret-token-value')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    expect(warn).toHaveBeenCalledWith(
      'Google ID token rejected: Wrong number of segments in token',
    );
  });

  it.each([
    [
      'an unverified email',
      { sub: 's', email: 'a@b.c', email_verified: false },
    ],
    ['no email', { sub: 's', email_verified: true }],
    ['no subject', { email: 'a@b.c', email_verified: true }],
  ])('rejects a token with %s', async (_case, payload) => {
    verifyIdToken.mockResolvedValue(ticketWith(payload));

    await expect(verifier.verify('id-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects a token without payload', async () => {
    verifyIdToken.mockResolvedValue(ticketWith(undefined));

    await expect(verifier.verify('id-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
