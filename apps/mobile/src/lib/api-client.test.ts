import { ApiError, apiRequest, NetworkError } from './api-client';

function jsonResponse(status: number, body?: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe('apiRequest', () => {
  const fetchMock = jest.fn<Promise<Response>, [string, RequestInit]>();

  beforeEach(() => {
    fetchMock.mockReset();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('calls the configured API and returns the parsed body', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { status: 'ok' }));

    await expect(apiRequest('/health')).resolves.toEqual({ status: 'ok' });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.test/health',
      expect.objectContaining({ method: 'GET', body: undefined }),
    );
  });

  it('sends the body as JSON', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, {}));

    await apiRequest('/auth/google', { method: 'POST', body: { idToken: 'abc' } });

    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe('POST');
    expect(init.body).toBe('{"idToken":"abc"}');
    expect(init.headers).toMatchObject({ 'Content-Type': 'application/json' });
  });

  it('sends the access token as a Bearer header', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, {}));

    await apiRequest('/auth/me', { accessToken: 'access-1' });

    expect(fetchMock.mock.calls[0][1].headers).toMatchObject({
      Authorization: 'Bearer access-1',
    });
  });

  it('does not send an Authorization header without access token', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, {}));

    await apiRequest('/health');

    expect(fetchMock.mock.calls[0][1].headers).not.toHaveProperty('Authorization');
  });

  it('returns undefined for an empty response', async () => {
    fetchMock.mockResolvedValue(jsonResponse(204));

    await expect(apiRequest('/auth/logout', { method: 'POST', body: {} })).resolves.toBeUndefined();
  });

  it.each([400, 401, 500])('throws an ApiError with status %i', async (status) => {
    fetchMock.mockResolvedValue(jsonResponse(status, { message: 'nope' }));

    await expect(apiRequest('/auth/me')).rejects.toMatchObject({
      name: 'ApiError',
      status,
    });
    await expect(apiRequest('/auth/me')).rejects.toBeInstanceOf(ApiError);
  });

  it('throws a NetworkError when the API cannot be reached', async () => {
    fetchMock.mockRejectedValue(new TypeError('Network request failed'));

    await expect(apiRequest('/health')).rejects.toBeInstanceOf(NetworkError);
  });

  it('gives up with a NetworkError when the API does not answer in time', async () => {
    jest.useFakeTimers();
    fetchMock.mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new Error('Aborted')));
        }),
    );

    const request = apiRequest('/health');
    const assertion = expect(request).rejects.toBeInstanceOf(NetworkError);
    await jest.advanceTimersByTimeAsync(15_000);

    await assertion;
  });
});
