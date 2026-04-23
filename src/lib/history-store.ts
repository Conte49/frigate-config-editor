/**
 * LocalStorage-backed rolling history of config snapshots.
 *
 * - Keeps the latest N snapshots (FIFO rotation).
 * - Stores the raw YAML plus a short human summary.
 * - Each snapshot is scoped to a Frigate instance id so multiple
 *   instances don't clobber each other.
 *
 * Post-MVP: compress payloads with pako when approaching the storage
 * quota (~5 MB). For now we keep the implementation dependency-free.
 */

export interface ConfigSnapshot {
  id: string;
  timestamp: number;
  instanceId: string;
  yaml: string;
  summary: string;
}

export interface HistoryStoreOptions {
  storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
  storageKey?: string;
  maxEntries?: number;
}

const DEFAULT_KEY = 'frigate-editor:history';
const DEFAULT_MAX = 10;

export class HistoryStore {
  readonly #storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
  readonly #key: string;
  readonly #max: number;
  /**
   * Monotonic suffix counter used to disambiguate snapshots added within
   * the same millisecond. Guarantees a stable, deterministic ordering
   * without relying on `performance.now()` which is not always available.
   */
  #lastTimestamp = 0;

  constructor(options: HistoryStoreOptions = {}) {
    this.#storage = options.storage ?? safeLocalStorage();
    this.#key = options.storageKey ?? DEFAULT_KEY;
    this.#max = options.maxEntries ?? DEFAULT_MAX;
  }

  list(instanceId?: string): ConfigSnapshot[] {
    const all = this.#readAll();
    const scoped = instanceId ? all.filter((s) => s.instanceId === instanceId) : all;
    return [...scoped].sort((a, b) => b.timestamp - a.timestamp);
  }

  get(id: string): ConfigSnapshot | undefined {
    return this.#readAll().find((s) => s.id === id);
  }

  add(snapshot: Omit<ConfigSnapshot, 'id' | 'timestamp'>): ConfigSnapshot {
    const now = Date.now();
    const timestamp = now > this.#lastTimestamp ? now : this.#lastTimestamp + 1;
    this.#lastTimestamp = timestamp;
    const entry: ConfigSnapshot = {
      id: generateId(),
      timestamp,
      ...snapshot,
    };
    const all = this.#readAll();
    all.push(entry);
    // Enforce per-instance FIFO rotation so one busy instance doesn't push
    // another instance's snapshots out of storage.
    const byInstance = groupBy(all, (s) => s.instanceId);
    const trimmed: ConfigSnapshot[] = [];
    for (const group of byInstance.values()) {
      const sorted = group.sort((a, b) => a.timestamp - b.timestamp);
      const overflow = Math.max(0, sorted.length - this.#max);
      trimmed.push(...sorted.slice(overflow));
    }
    this.#writeAll(trimmed);
    return entry;
  }

  clear(instanceId?: string): void {
    if (!instanceId) {
      this.#storage.removeItem(this.#key);
      return;
    }
    const filtered = this.#readAll().filter((s) => s.instanceId !== instanceId);
    this.#writeAll(filtered);
  }

  #readAll(): ConfigSnapshot[] {
    const raw = this.#storage.getItem(this.#key);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(isSnapshot);
    } catch {
      return [];
    }
  }

  #writeAll(snapshots: ConfigSnapshot[]): void {
    this.#storage.setItem(this.#key, JSON.stringify(snapshots));
  }
}

function isSnapshot(value: unknown): value is ConfigSnapshot {
  if (!value || typeof value !== 'object') return false;
  const s = value as Record<string, unknown>;
  return (
    typeof s.id === 'string' &&
    typeof s.timestamp === 'number' &&
    typeof s.instanceId === 'string' &&
    typeof s.yaml === 'string' &&
    typeof s.summary === 'string'
  );
}

function groupBy<T, K>(items: T[], keyFn: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }
  return map;
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `snap_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * In-memory fallback when `localStorage` is unavailable (e.g. private
 * browsing, sandbox iframes). Keeps the API identical so callers don't
 * need to branch.
 */
function safeLocalStorage(): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> {
  try {
    if (typeof localStorage !== 'undefined') {
      const probe = '__frigate_editor_probe__';
      localStorage.setItem(probe, probe);
      localStorage.removeItem(probe);
      return localStorage;
    }
  } catch {
    // Swallow — fall through to in-memory stub.
  }
  const store = new Map<string, string>();
  return {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => void store.set(k, v),
    removeItem: (k) => void store.delete(k),
  };
}
