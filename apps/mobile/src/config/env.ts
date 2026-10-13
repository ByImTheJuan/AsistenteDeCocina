import { z } from 'zod';

const envSchema = z.object({
  EXPO_PUBLIC_API_URL: z
    .string({ required_error: 'EXPO_PUBLIC_API_URL is required' })
    .url('EXPO_PUBLIC_API_URL must be a valid URL'),
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: z
    .string({ required_error: 'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is required' })
    .min(1, 'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is required'),
  // Only needed to sign in on iOS; an empty value counts as not set.
  EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: z
    .string()
    .optional()
    .transform((value) => value || undefined),
});

export type AppEnv = {
  apiUrl: string;
  googleWebClientId: string;
  googleIosClientId?: string;
};

export function parseEnv(source: Record<string, string | undefined>): AppEnv {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const details = result.error.issues.map((issue) => issue.message).join('; ');
    throw new Error(`Invalid environment configuration: ${details}`);
  }
  return {
    apiUrl: result.data.EXPO_PUBLIC_API_URL.replace(/\/+$/, ''),
    googleWebClientId: result.data.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    googleIosClientId: result.data.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  };
}
