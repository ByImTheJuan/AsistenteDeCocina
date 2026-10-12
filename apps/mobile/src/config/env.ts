import { z } from 'zod';

const envSchema = z.object({
  EXPO_PUBLIC_API_URL: z
    .string({ required_error: 'EXPO_PUBLIC_API_URL is required' })
    .url('EXPO_PUBLIC_API_URL must be a valid URL'),
});

export type AppEnv = {
  apiUrl: string;
};

export function parseEnv(source: Record<string, string | undefined>): AppEnv {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const details = result.error.issues.map((issue) => issue.message).join('; ');
    throw new Error(`Invalid environment configuration: ${details}`);
  }
  return { apiUrl: result.data.EXPO_PUBLIC_API_URL.replace(/\/+$/, '') };
}
