import { validateEnv } from './env.validation.js';

const valid = {
  DATABASE_URL: 'mysql://user:pass@localhost:3306/db',
  GOOGLE_CLIENT_ID: 'client-id.apps.googleusercontent.com',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
};

describe('validateEnv', () => {
  it('applies the default token lifetimes', () => {
    expect(validateEnv(valid)).toMatchObject({
      JWT_ACCESS_TTL_SECONDS: 900,
      REFRESH_TOKEN_TTL_DAYS: 30,
    });
  });

  it('converts numeric variables from strings', () => {
    const env = validateEnv({
      ...valid,
      PORT: '4000',
      JWT_ACCESS_TTL_SECONDS: '600',
      REFRESH_TOKEN_TTL_DAYS: '7',
    });

    expect(env.PORT).toBe(4000);
    expect(env.JWT_ACCESS_TTL_SECONDS).toBe(600);
    expect(env.REFRESH_TOKEN_TTL_DAYS).toBe(7);
  });

  it.each(['DATABASE_URL', 'GOOGLE_CLIENT_ID', 'JWT_ACCESS_SECRET'])(
    'fails when %s is missing',
    (name) => {
      const env: Record<string, unknown> = { ...valid };
      delete env[name];

      expect(() => validateEnv(env)).toThrow(name);
    },
  );

  it('rejects a signing secret shorter than 32 characters', () => {
    expect(() =>
      validateEnv({ ...valid, JWT_ACCESS_SECRET: 'too-short' }),
    ).toThrow('JWT_ACCESS_SECRET');
  });

  it('does not include secret values in the error', () => {
    expect(() =>
      validateEnv({ ...valid, JWT_ACCESS_SECRET: 'too-short' }),
    ).not.toThrow('too-short');
  });
});
