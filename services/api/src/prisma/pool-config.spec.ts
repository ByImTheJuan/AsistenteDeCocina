import { toPoolConfig } from './pool-config.js';

describe('toPoolConfig', () => {
  it('splits a mysql URL into driver options', () => {
    expect(
      toPoolConfig('mysql://cocina:secret@db.local:3307/cocina_dev'),
    ).toEqual({
      host: 'db.local',
      port: 3307,
      user: 'cocina',
      password: 'secret',
      database: 'cocina_dev',
    });
  });

  it('defaults to the MySQL port', () => {
    expect(toPoolConfig('mysql://u:p@localhost/db').port).toBe(3306);
  });

  it('decodes percent-encoded credentials', () => {
    const config = toPoolConfig('mysql://us%40er:p%40ss%2Fword@localhost/db');

    expect(config.user).toBe('us@er');
    expect(config.password).toBe('p@ss/word');
  });

  it('rejects other protocols', () => {
    expect(() => toPoolConfig('postgresql://u:p@localhost/db')).toThrow(
      'mysql://',
    );
  });

  it('rejects a URL without a database name', () => {
    expect(() => toPoolConfig('mysql://u:p@localhost:3306')).toThrow(
      'database name',
    );
  });

  it('rejects a malformed URL without echoing it', () => {
    expect(() => toPoolConfig('not a url')).toThrow(
      'DATABASE_URL is not a valid URL',
    );
  });
});
