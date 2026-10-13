import { PasswordHasher } from './password-hasher.js';

describe('PasswordHasher', () => {
  const hasher = new PasswordHasher();

  it('verifies the password it hashed', async () => {
    const hash = await hasher.hash('correct horse battery staple');

    await expect(
      hasher.verify('correct horse battery staple', hash),
    ).resolves.toBe(true);
  });

  it('rejects any other password', async () => {
    const hash = await hasher.hash('correct horse battery staple');

    await expect(
      hasher.verify('correct horse battery stapl', hash),
    ).resolves.toBe(false);
    await expect(hasher.verify('', hash)).resolves.toBe(false);
  });

  it('never contains the password', async () => {
    const hash = await hasher.hash('correct horse battery staple');

    expect(hash).not.toContain('correct horse battery staple');
  });

  it('uses a different salt for each hash', async () => {
    const [first, second] = await Promise.all([
      hasher.hash('same password'),
      hasher.hash('same password'),
    ]);

    expect(first).not.toBe(second);
    await expect(hasher.verify('same password', first)).resolves.toBe(true);
    await expect(hasher.verify('same password', second)).resolves.toBe(true);
  });

  it('records the algorithm and its parameters', async () => {
    const hash = await hasher.hash('password');

    expect(hash).toMatch(/^scrypt\$32768\$8\$3\$[\w-]+\$[\w-]+$/);
    expect(hash.length).toBeLessThanOrEqual(255);
  });

  it('accepts passwords with non-ASCII characters', async () => {
    const hash = await hasher.hash('contraseña-ñandú-🔑');

    await expect(hasher.verify('contraseña-ñandú-🔑', hash)).resolves.toBe(
      true,
    );
    await expect(hasher.verify('contrasena-nandu-🔑', hash)).resolves.toBe(
      false,
    );
  });

  it.each([
    ['an empty value', ''],
    ['another algorithm', 'bcrypt$10$abc$def'],
    ['missing parts', 'scrypt$32768$8$3$c2FsdA'],
    ['non-numeric parameters', 'scrypt$x$8$3$c2FsdA$a2V5'],
    ['parameters scrypt rejects', 'scrypt$1000$8$3$c2FsdA$a2V5'],
  ])('does not match %s', async (_case, stored) => {
    await expect(hasher.verify('password', stored)).resolves.toBe(false);
  });
});
