import { getEnv } from '@/config/app-env';

/** The API answered with an error status. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    /** Stable identifier sent by the API when the status alone is ambiguous. */
    readonly code?: string,
  ) {
    super(`API request failed with status ${status}`);
    this.name = 'ApiError';
  }
}

async function readErrorCode(response: Response): Promise<string | undefined> {
  try {
    const body: unknown = await response.json();
    if (typeof body === 'object' && body !== null && 'code' in body) {
      return typeof body.code === 'string' ? body.code : undefined;
    }
  } catch {
    // Not every error has a JSON body; the status is enough then.
  }
  return undefined;
}

/** The API could not be reached: no connectivity, timeout or server down. */
export class NetworkError extends Error {
  constructor() {
    super('The API could not be reached');
    this.name = 'NetworkError';
  }
}

export type ApiRequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  accessToken?: string;
};

const REQUEST_TIMEOUT_MS = 15_000;

// Returns the parsed JSON body, or `undefined` for empty responses. Callers
// validate the shape; nothing coming from the network is trusted as typed.
export async function apiRequest(
  path: string,
  { method = 'GET', body, accessToken }: ApiRequestOptions = {},
): Promise<unknown> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${getEnv().apiUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch {
    throw new NetworkError();
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new ApiError(response.status, await readErrorCode(response));
  }
  if (response.status === 204) {
    return undefined;
  }
  return response.json();
}
