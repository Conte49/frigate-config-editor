import { beforeEach, describe, expect, it } from 'vitest';

import { HistoryStore } from './history-store.js';

function makeMemoryStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    _raw: store,
  };
}

describe('HistoryStore', () => {
  let storage: ReturnType<typeof makeMemoryStorage>;

  beforeEach(() => {
    storage = makeMemoryStorage();
  });

  it('returns an empty list on a fresh store', () => {
    const store = new HistoryStore({ storage });
    expect(store.list()).toEqual([]);
  });

  it('adds snapshots with generated id and timestamp', () => {
    const store = new HistoryStore({ storage });
    const entry = store.add({ instanceId: 'A', yaml: 'cameras: {}', summary: 'init' });
    expect(entry.id).toBeTruthy();
    expect(entry.timestamp).toBeGreaterThan(0);
    expect(store.list()).toHaveLength(1);
  });

  it('scopes listing by instance id', () => {
    const store = new HistoryStore({ storage });
    store.add({ instanceId: 'A', yaml: 'a1', summary: '1' });
    store.add({ instanceId: 'B', yaml: 'b1', summary: '1' });
    expect(store.list('A')).toHaveLength(1);
    expect(store.list('B')).toHaveLength(1);
    expect(store.list()).toHaveLength(2);
  });

  it('rotates FIFO per instance when exceeding maxEntries', () => {
    const store = new HistoryStore({ storage, maxEntries: 3 });
    for (let i = 0; i < 5; i += 1) {
      store.add({ instanceId: 'A', yaml: `y${i}`, summary: `s${i}` });
    }
    const snapshots = store.list('A');
    expect(snapshots).toHaveLength(3);
    expect(snapshots.map((s) => s.yaml)).toEqual(['y4', 'y3', 'y2']);
  });

  it('does not evict snapshots of other instances when one fills up', () => {
    const store = new HistoryStore({ storage, maxEntries: 2 });
    for (let i = 0; i < 5; i += 1) store.add({ instanceId: 'A', yaml: `a${i}`, summary: '' });
    store.add({ instanceId: 'B', yaml: 'b0', summary: '' });
    expect(store.list('A')).toHaveLength(2);
    expect(store.list('B')).toHaveLength(1);
  });

  it('ignores corrupt storage payloads', () => {
    storage.setItem('frigate-editor:history', 'not json');
    const store = new HistoryStore({ storage });
    expect(store.list()).toEqual([]);
  });

  it('clears only the selected instance when one is provided', () => {
    const store = new HistoryStore({ storage });
    store.add({ instanceId: 'A', yaml: 'a', summary: '' });
    store.add({ instanceId: 'B', yaml: 'b', summary: '' });
    store.clear('A');
    expect(store.list('A')).toHaveLength(0);
    expect(store.list('B')).toHaveLength(1);
  });
});
