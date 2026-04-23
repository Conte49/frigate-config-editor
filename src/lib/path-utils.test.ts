import { describe, expect, it } from 'vitest';

import { deleteAtPath, getAtPath, setAtPath } from './path-utils.js';

describe('getAtPath', () => {
  it('reads nested object values', () => {
    const root = { a: { b: { c: 42 } } };
    expect(getAtPath(root, 'a.b.c')).toBe(42);
    expect(getAtPath(root, 'a.b')).toEqual({ c: 42 });
  });

  it('reads array indices', () => {
    const root = { list: [{ x: 1 }, { x: 2 }] };
    expect(getAtPath(root, 'list.1.x')).toBe(2);
  });

  it('returns undefined for unknown paths', () => {
    expect(getAtPath({ a: 1 }, 'a.b')).toBeUndefined();
    expect(getAtPath(undefined, 'a')).toBeUndefined();
  });
});

describe('setAtPath', () => {
  it('returns a new tree, leaves input untouched', () => {
    const root = { a: { b: 1 } };
    const next = setAtPath(root, 'a.b', 2);
    expect(next).toEqual({ a: { b: 2 } });
    expect(root).toEqual({ a: { b: 1 } });
    expect(next).not.toBe(root);
    expect((next as { a: object }).a).not.toBe(root.a);
  });

  it('creates missing object intermediates', () => {
    const next = setAtPath({}, 'cameras.ingresso.enabled', true);
    expect(next).toEqual({ cameras: { ingresso: { enabled: true } } });
  });

  it('creates array intermediates when the next segment is numeric', () => {
    const next = setAtPath({}, 'items.0.name', 'hello');
    expect(next).toEqual({ items: [{ name: 'hello' }] });
  });

  it('replaces the root when path is empty', () => {
    expect(setAtPath({ a: 1 }, '', { b: 2 })).toEqual({ b: 2 });
  });
});

describe('deleteAtPath', () => {
  it('removes an object key', () => {
    const next = deleteAtPath({ a: 1, b: 2 }, 'b');
    expect(next).toEqual({ a: 1 });
  });

  it('removes an array element and reindexes', () => {
    const next = deleteAtPath({ items: [1, 2, 3] }, 'items.1') as { items: number[] };
    expect(next.items).toEqual([1, 3]);
  });

  it('is a no-op for unknown paths', () => {
    expect(deleteAtPath({ a: 1 }, 'b.c')).toEqual({ a: 1 });
  });
});
