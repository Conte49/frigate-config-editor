/**
 * Minimal line-based diff utility.
 *
 * We intentionally avoid pulling in a diff library: the config files we
 * compare are at most a few hundred lines and an O((N+M)·D) Myers-style
 * implementation is overkill. A plain LCS works well and renders the
 * same structure a user expects from a `git diff --no-color` output.
 *
 * The emitted `DiffLine[]` is rendered by `diff-modal.ts`. Post-MVP we
 * may swap this for word-level diffing or a richer hunk layout.
 */

export type DiffLineStatus = 'equal' | 'added' | 'removed';

export interface DiffLine {
  status: DiffLineStatus;
  /** 1-based line number on the left (original) side, if present. */
  oldNumber?: number;
  /** 1-based line number on the right (new) side, if present. */
  newNumber?: number;
  text: string;
}

/**
 * Compute a line-level diff between two strings. The result preserves
 * original ordering and makes no assumptions about trailing newlines.
 */
export function diffLines(before: string, after: string): DiffLine[] {
  const beforeLines = before.split('\n');
  const afterLines = after.split('\n');

  const table = lcsTable(beforeLines, afterLines);
  const lines: DiffLine[] = [];

  let i = beforeLines.length;
  let j = afterLines.length;

  // Walk the LCS table backwards, emitting lines, then reverse at the end.
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && beforeLines[i - 1] === afterLines[j - 1]) {
      lines.push({
        status: 'equal',
        oldNumber: i,
        newNumber: j,
        text: beforeLines[i - 1] ?? '',
      });
      i -= 1;
      j -= 1;
    } else if (j > 0 && (i === 0 || (table[i]?.[j - 1] ?? 0) >= (table[i - 1]?.[j] ?? 0))) {
      lines.push({ status: 'added', newNumber: j, text: afterLines[j - 1] ?? '' });
      j -= 1;
    } else if (i > 0) {
      lines.push({ status: 'removed', oldNumber: i, text: beforeLines[i - 1] ?? '' });
      i -= 1;
    }
  }

  return lines.reverse();
}

/**
 * Summary counters used to render a compact header on the diff modal.
 */
export interface DiffStats {
  added: number;
  removed: number;
  unchanged: number;
}

export function diffStats(lines: DiffLine[]): DiffStats {
  const stats: DiffStats = { added: 0, removed: 0, unchanged: 0 };
  for (const line of lines) {
    if (line.status === 'added') stats.added += 1;
    else if (line.status === 'removed') stats.removed += 1;
    else stats.unchanged += 1;
  }
  return stats;
}

function lcsTable(a: string[], b: string[]): number[][] {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const table: number[][] = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));
  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const row = table[i]!;
      const prev = table[i - 1]!;
      row[j] =
        a[i - 1] === b[j - 1] ? (prev[j - 1] ?? 0) + 1 : Math.max(prev[j] ?? 0, row[j - 1] ?? 0);
    }
  }
  return table;
}
