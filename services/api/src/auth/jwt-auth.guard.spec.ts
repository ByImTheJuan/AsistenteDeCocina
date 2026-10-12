import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard.js';

const SECRET = 'unit-test-secret-with-enough-length';

function contextFor(request: { headers: Record<string, string> }) {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  const jwt = new JwtService({
    secret: SECRET,
    signOptions: { algorithm: 'HS256' },
    verifyOptions: { algorithms: ['HS256'] },
  });
  const guard = new JwtAuthGuard(jwt);

  it('attaches the user ID from a valid token', async () => {
    const token = await jwt.signAsync({ sub: 'user-1' }, { expiresIn: 60 });
    const request = { headers: { authorization: `Bearer ${token}` } };

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(request).toMatchObject({ user: { id: 'user-1' } });
  });

  it.each([
    ['no header', {}],
    ['another scheme', { authorization: 'Basic abc' }],
    ['an empty token', { authorization: 'Bearer ' }],
    ['a malformed token', { authorization: 'Bearer not-a-jwt' }],
  ])('rejects a request with %s', async (_case, headers) => {
    await expect(
      guard.canActivate(contextFor({ headers })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects an expired token', async () => {
    const token = await jwt.signAsync({ sub: 'user-1' }, { expiresIn: -10 });

    await expect(
      guard.canActivate(
        contextFor({ headers: { authorization: `Bearer ${token}` } }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a token signed with another secret', async () => {
    const other = new JwtService({
      secret: 'another-secret-with-enough-length',
    });
    const token = await other.signAsync({ sub: 'user-1' });

    await expect(
      guard.canActivate(
        contextFor({ headers: { authorization: `Bearer ${token}` } }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a token without subject', async () => {
    const token = await jwt.signAsync({ role: 'admin' });

    await expect(
      guard.canActivate(
        contextFor({ headers: { authorization: `Bearer ${token}` } }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
