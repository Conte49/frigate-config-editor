import { describe, expect, it } from 'vitest';

import { diffLines, diffStats } from './diff.js';

describe('diffLines', () => {
  it('returns all equal lines when inputs match', () => {
    const result = diffLines('a\nb\nc', 'a\nb\nc');
    expect(result.every((l) => l.status === 'equal')).toBe(true);
    expect(result.map((l) => l.text)).toEqual(['a', 'b', 'c']);
  });

  it('emits added lines for new content', () => {
    const result = diffLines('a\nc', 'a\nb\nc');
    expect(result).toEqual([
      { status: 'equal', oldNumber: 1, newNumber: 1, text: 'a' },
      { status: 'added', newNumber: 2, text: 'b' },
      { status: 'equal', oldNumber: 2, newNumber: 3, text: 'c' },
    ]);
  });

  it('emits removed lines for deleted content', () => {
    const result = diffLines('a\nb\nc', 'a\nc');
    expect(result).toEqual([
      { status: 'equal', oldNumber: 1, newNumber: 1, text: 'a' },
      { status: 'removed', oldNumber: 2, text: 'b' },
      { status: 'equal', oldNumber: 3, newNumber: 2, text: 'c' },
    ]);
  });

  it('handles completely disjoint inputs', () => {
    const result = diffLines('a\nb', 'c\nd');
    expect(result.map((l) => [l.status, l.text])).toEqual([
      ['removed', 'a'],
      ['removed', 'b'],
      ['added', 'c'],
      ['added', 'd'],
    ]);
  });

  it('handles trailing newlines without duplicating empty lines mid-file', () => {
    const result = diffLines('a\nb\n', 'a\nb\n');
    expect(result.filter((l) => l.status !== 'equal')).toEqual([]);
  });
});

describe('diffStats', () => {
  it('counts added/removed/unchanged lines', () => {
    const lines = diffLines('a\nb\nc', 'a\nX\nc');
    const stats = diffStats(lines);
    expect(stats.added).toBe(1);
    expect(stats.removed).toBe(1);
    expect(stats.unchanged).toBe(2);
  });
});
