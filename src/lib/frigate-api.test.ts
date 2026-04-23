import { describe, expect, it, vi } from 'vitest';

import { FrigateApi, FrigateApiError } from './frigate-api.js';

function makeFetch(responses: Array<{ body: string; status?: number; statusText?: string }>) {
  const queue = [...responses];
  const fetchMock = vi.fn(async () => {
    const next = queue.shift();
    if (!next) throw new Error('no more mock responses');
    const status = next.status ?? 200;
    return {
      ok: status >= 200 && status < 300,
      status,
      statusText: next.statusText ?? '',
      text: async () => next.body,
    } as unknown as Response;
  });
  return fetchMock as unknown as typeof fetch;
}

describe('FrigateApi', () => {
  it('strips trailing slashes from the base URL', () => {
    const api = new FrigateApi({ baseUrl: 'https://frigate.local/', fetchImpl: makeFetch([]) });
    expect(api.baseUrl).toBe('https://frigate.local');
  });

  it('parses JSON responses and forwards auth header', async () => {
    const fetchImpl = makeFetch([{ body: '{"cameras":{}}' }]);
    const api = new FrigateApi({
      baseUrl: 'https://frigate.local',
      fetchImpl,
      authToken: 'abc',
    });
    const config = await api.getConfig();
    expect(config).toEqual({ cameras: {} });
    const call = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toBe('https://frigate.local/api/config');
    const headers = call[1].headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer abc');
  });

  it('returns a version object for both string and JSON responses', async () => {
    const apiString = new FrigateApi({
      baseUrl: 'https://frigate.local',
      fetchImpl: makeFetch([{ body: '0.15.0\n' }]),
    });
    expect(await apiString.getVersion()).toEqual({ version: '0.15.0' });

    const apiJson = new FrigateApi({
      baseUrl: 'https://frigate.local',
      fetchImpl: makeFetch([{ body: '{"version":"0.16.1"}' }]),
    });
    expect(await apiJson.getVersion()).toEqual({ version: '0.16.1' });
  });

  it('throws FrigateApiError on non-2xx responses preserving the body', async () => {
    const api = new FrigateApi({
      baseUrl: 'https://frigate.local',
      fetchImpl: makeFetch([{ body: 'nope', status: 500, statusText: 'Server Error' }]),
    });
    await expect(api.getConfig()).rejects.toMatchObject({
      name: 'FrigateApiError',
      status: 500,
      body: 'nope',
    });
  });

  it('returns the parsed Frigate save failure payload without throwing', async () => {
    const api = new FrigateApi({
      baseUrl: 'https://frigate.local',
      fetchImpl: makeFetch([
        {
          body: '{"success":false,"message":"Your configuration is invalid..."}',
        },
      ]),
    });
    const result = await api.saveConfig('cameras: {}', 'saveonly');
    expect(result).toEqual({ success: false, message: 'Your configuration is invalid...' });
  });

  it('wraps network errors in FrigateApiError with status 0', async () => {
    const brokenFetch = vi.fn(async () => {
      throw new Error('boom');
    }) as unknown as typeof fetch;
    const api = new FrigateApi({ baseUrl: 'https://frigate.local', fetchImpl: brokenFetch });
    await expect(api.getConfig()).rejects.toBeInstanceOf(FrigateApiError);
    await expect(api.getConfig()).rejects.toMatchObject({ status: 0 });
  });
});
