/**
 * Thin wrapper around the Frigate REST API.
 *
 * All calls hit the Frigate instance directly from the browser using a
 * base URL resolved by the HA integration (see `ha-integration.ts`).
 * We deliberately keep this layer dependency-free so it can be tested
 * against a mock `fetch` without pulling in any HA context.
 *
 * Endpoints (verified against Frigate 0.15 and 0.16):
 *   GET  /api/version
 *   GET  /api/config
 *   GET  /api/config/raw
 *   GET  /api/config/schema.json
 *   POST /api/config/save?save_option=<saveonly|restart>
 *   POST /api/restart
 */
import type {
  FrigateConfig,
  FrigateSaveOption,
  FrigateSaveResponse,
  FrigateVersionResponse,
} from '../types/frigate.js';

export interface FrigateApiOptions {
  /** Base URL of the Frigate instance, e.g. `https://ha.local/api/frigate/notifications`. */
  baseUrl: string;
  /** Optional fetch implementation (defaults to `globalThis.fetch`). Primarily for tests. */
  fetchImpl?: typeof fetch;
  /** Optional auth header forwarded with every request (e.g. HA long-lived token). */
  authToken?: string;
  /** Default timeout in milliseconds for every request. */
  timeoutMs?: number;
}

export class FrigateApiError extends Error {
  readonly status: number;
  readonly body: string;

  constructor(message: string, status: number, body: string) {
    super(message);
    this.name = 'FrigateApiError';
    this.status = status;
    this.body = body;
  }
}

const DEFAULT_TIMEOUT_MS = 15_000;

export class FrigateApi {
  readonly baseUrl: string;
  readonly #fetchImpl: typeof fetch;
  readonly #authToken: string | undefined;
  readonly #timeoutMs: number;

  constructor(options: FrigateApiOptions) {
    this.baseUrl = stripTrailingSlash(options.baseUrl);
    this.#fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
    this.#authToken = options.authToken;
    this.#timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  /** `GET /api/version` — returns the Frigate version string. */
  async getVersion(): Promise<FrigateVersionResponse> {
    const raw = await this.#request<string | FrigateVersionResponse>('/api/version', {
      accept: 'application/json',
    });
    // Older Frigate builds answer with a bare string; 0.16 answers JSON.
    return typeof raw === 'string' ? { version: raw.trim() } : raw;
  }

  /** `GET /api/config` — parsed config as JSON. */
  async getConfig(): Promise<FrigateConfig> {
    return this.#request<FrigateConfig>('/api/config', { accept: 'application/json' });
  }

  /** `GET /api/config/raw` — raw YAML source as served by Frigate. */
  async getRawConfig(): Promise<string> {
    return this.#request<string>('/api/config/raw', { accept: 'text/plain' });
  }

  /** `GET /api/config/schema.json` — JSON Schema describing the config. */
  async getSchema(): Promise<unknown> {
    return this.#request<unknown>('/api/config/schema.json', { accept: 'application/json' });
  }

  /**
   * `POST /api/config/save` — validate and persist a new YAML config.
   *
   * Returns the parsed Frigate response unchanged so callers can
   * differentiate success and validation errors.
   */
  async saveConfig(
    yamlContent: string,
    saveOption: FrigateSaveOption = 'restart',
  ): Promise<FrigateSaveResponse> {
    return this.#request<FrigateSaveResponse>(
      `/api/config/save?save_option=${encodeURIComponent(saveOption)}`,
      {
        method: 'POST',
        body: yamlContent,
        contentType: 'text/plain; charset=utf-8',
        accept: 'application/json',
      },
    );
  }

  /** `POST /api/restart` — restart the Frigate process. */
  async restart(): Promise<void> {
    await this.#request<unknown>('/api/restart', { method: 'POST', accept: 'application/json' });
  }

  /**
   * Poll `/api/version` until it responds successfully or the deadline
   * expires. Used after `saveConfig('restart')` to know when Frigate is
   * back online.
   */
  async waitUntilHealthy(totalTimeoutMs = 60_000, intervalMs = 1_500): Promise<void> {
    const deadline = Date.now() + totalTimeoutMs;
    let lastError: unknown;
    while (Date.now() < deadline) {
      try {
        await this.getVersion();
        return;
      } catch (error) {
        lastError = error;
        await sleep(intervalMs);
      }
    }
    throw new FrigateApiError(
      `Frigate did not become healthy within ${totalTimeoutMs}ms`,
      0,
      lastError instanceof Error ? lastError.message : String(lastError),
    );
  }

  // ---------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------

  async #request<T>(
    path: string,
    opts: {
      method?: 'GET' | 'POST';
      accept?: string;
      contentType?: string;
      body?: string;
    } = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers = new Headers();
    if (opts.accept) headers.set('Accept', opts.accept);
    if (opts.contentType) headers.set('Content-Type', opts.contentType);
    if (this.#authToken) headers.set('Authorization', `Bearer ${this.#authToken}`);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.#timeoutMs);
    let response: Response;
    try {
      const init: RequestInit = {
        method: opts.method ?? 'GET',
        headers,
        signal: controller.signal,
        credentials: 'include',
      };
      if (opts.body !== undefined) init.body = opts.body;
      response = await this.#fetchImpl(url, init);
    } catch (error) {
      clearTimeout(timer);
      throw new FrigateApiError(
        `Network error reaching Frigate at ${url}`,
        0,
        error instanceof Error ? error.message : String(error),
      );
    }
    clearTimeout(timer);

    const rawBody = await response.text();
    if (!response.ok) {
      throw new FrigateApiError(
        `Frigate ${opts.method ?? 'GET'} ${path} failed: ${response.status} ${response.statusText}`,
        response.status,
        rawBody,
      );
    }

    const expectsJson = (opts.accept ?? '').includes('application/json');
    if (!expectsJson) {
      return rawBody as unknown as T;
    }
    try {
      return JSON.parse(rawBody) as T;
    } catch {
      // Some endpoints (e.g. /api/version on old builds) advertise JSON but
      // return a bare string. Fall back to the raw body in that case.
      return rawBody as unknown as T;
    }
  }
}

function stripTrailingSlash(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
