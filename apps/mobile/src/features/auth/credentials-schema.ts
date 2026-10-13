import { z } from 'zod';

// Same rules as the API (services/api/src/auth/auth.dto.ts), which remains
// the authority: these only save the user a round trip.
const email = z
  .string()
  .trim()
  .min(1, 'Escribe tu email.')
  .max(320, 'El email es demasiado largo.')
  .email('Escribe un email válido.');

export const signInSchema = z.object({
  email,
  password: z.string().min(1, 'Escribe tu contraseña.'),
});

export const signUpSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Escribe tu nombre.')
    .max(100, 'El nombre no puede tener más de 100 caracteres.'),
  email,
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres.')
    .max(128, 'La contraseña no puede tener más de 128 caracteres.'),
});

export type SignInForm = z.infer<typeof signInSchema>;
export type SignUpForm = z.infer<typeof signUpSchema>;
