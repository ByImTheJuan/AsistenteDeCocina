import { parseEnv } from './env';
import type { AppEnv } from './env';

type EnvResult = { ok: true; env: AppEnv } | { ok: false; message: string };

// Expo only inlines EXPO_PUBLIC_ variables that are read with a literal
// `process.env.NAME`, so each one is listed explicitly.
function readEnv(): EnvResult {
  try {
    return {
      ok: true,
      env: parseEnv({
        EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
        EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
        EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      }),
    };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
}

// Evaluated without throwing: an error while a route module loads leaves
// Expo Router without screens and hides the real cause. The root layout
// reports `envError` instead.
const result = readEnv();

export const envError: string | null = result.ok ? null : result.message;

export function getEnv(): AppEnv {
  if (!result.ok) {
    throw new Error(result.message);
  }
  return result.env;
}
