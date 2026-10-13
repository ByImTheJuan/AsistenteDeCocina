import { signInSchema, signUpSchema } from './credentials-schema';

function messages(result: { success: boolean; error?: { issues: { message: string }[] } }) {
  return result.error?.issues.map((issue) => issue.message) ?? [];
}

describe('signUpSchema', () => {
  const valid = { name: 'Ana', email: 'ana@example.com', password: '12345678' };

  it('accepts valid data and trims the name and the email', () => {
    expect(signUpSchema.parse({ ...valid, name: '  Ana ', email: ' ana@example.com ' })).toEqual(
      valid,
    );
  });

  it('keeps the password exactly as typed', () => {
    expect(signUpSchema.parse({ ...valid, password: '  spaces  ' }).password).toBe('  spaces  ');
  });

  it.each([
    ['a blank name', { name: '   ' }, 'Escribe tu nombre.'],
    [
      'a name that is too long',
      { name: 'a'.repeat(101) },
      'El nombre no puede tener más de 100 caracteres.',
    ],
    ['no email', { email: '' }, 'Escribe tu email.'],
    ['a malformed email', { email: 'ana-at-example.com' }, 'Escribe un email válido.'],
    [
      'a short password',
      { password: '1234567' },
      'La contraseña debe tener al menos 8 caracteres.',
    ],
    [
      'a password that is too long',
      { password: 'a'.repeat(129) },
      'La contraseña no puede tener más de 128 caracteres.',
    ],
  ])('rejects %s', (_case, override, message) => {
    expect(messages(signUpSchema.safeParse({ ...valid, ...override }))).toContain(message);
  });
});

describe('signInSchema', () => {
  it('accepts an email and any non-empty password', () => {
    expect(signInSchema.parse({ email: ' ana@example.com ', password: 'x' })).toEqual({
      email: 'ana@example.com',
      password: 'x',
    });
  });

  it.each([
    ['no email', { email: '', password: 'x' }, 'Escribe tu email.'],
    ['a malformed email', { email: 'ana', password: 'x' }, 'Escribe un email válido.'],
    ['no password', { email: 'ana@example.com', password: '' }, 'Escribe tu contraseña.'],
  ])('rejects %s', (_case, input, message) => {
    expect(messages(signInSchema.safeParse(input))).toContain(message);
  });
});
