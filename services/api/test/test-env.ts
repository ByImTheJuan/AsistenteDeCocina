// Environment shared by the integration tests and their global setup.
// CI provides DATABASE_URL; locally it falls back to the cocina_test database
// of the docker-compose container, whose credentials are local-only.
const LOCAL_TEST_DATABASE_URL =
  'mysql://cocina:cocina_dev_password@localhost:3306/cocina_test';

export function applyTestEnv(): void {
  process.env.DATABASE_URL ??= LOCAL_TEST_DATABASE_URL;

  // The tests delete rows, so refuse to run against anything but a test database.
  const database = new URL(process.env.DATABASE_URL).pathname.slice(1);
  if (!database.endsWith('_test')) {
    throw new Error(
      `Integration tests need a database whose name ends in "_test", got "${database}"`,
    );
  }

  process.env.GOOGLE_CLIENT_ID = 'test-client-id.apps.googleusercontent.com';
  process.env.JWT_ACCESS_SECRET = 'test-only-secret-not-used-anywhere-else';
  process.env.JWT_ACCESS_TTL_SECONDS = '900';
  process.env.REFRESH_TOKEN_TTL_DAYS = '30';
  // High enough not to interfere; the limit has its own spec.
  process.env.AUTH_RATE_LIMIT_MAX = '1000';
  process.env.AUTH_RATE_LIMIT_WINDOW_SECONDS = '60';
}
