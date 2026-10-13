export type PoolConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
};

// The MariaDB driver takes discrete options, while the project configures a
// single `mysql://` URL shared with the Prisma CLI.
export function toPoolConfig(databaseUrl: string): PoolConfig {
  let url: URL;
  try {
    url = new URL(databaseUrl);
  } catch {
    throw new Error('DATABASE_URL is not a valid URL');
  }
  if (url.protocol !== 'mysql:') {
    throw new Error('DATABASE_URL must use the mysql:// protocol');
  }
  const database = decodeURIComponent(url.pathname.replace(/^\//, ''));
  if (!database) {
    throw new Error('DATABASE_URL must include a database name');
  }
  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database,
  };
}
