/**
 * Tiny dotted-path accessor for plain JS objects, used by the form
 * renderer to bind field values to a config tree.
 *
 * Supports numeric segments (array indices) and preserves immutability:
 * `setAtPath` returns a new tree, the input is not mutated.
 */

export type PathSegment = string | number;

export function parsePath(path: string): PathSegment[] {
  if (path.length === 0) return [];
  return path.split('.').map((s) => (/^\d+$/.test(s) ? Number(s) : s));
}

export function formatPath(segments: PathSegment[]): string {
  return segments.map((s) => String(s)).join('.');
}

export function getAtPath(root: unknown, path: string): unknown {
  const segments = parsePath(path);
  let cursor: unknown = root;
  for (const segment of segments) {
    if (cursor == null) return undefined;
    if (Array.isArray(cursor) && typeof segment === 'number') {
      cursor = cursor[segment];
    } else if (typeof cursor === 'object') {
      cursor = (cursor as Record<string, unknown>)[String(segment)];
    } else {
      return undefined;
    }
  }
  return cursor;
}

/**
 * Immutable deep set. Creates missing intermediate objects/arrays based
 * on the type of the next segment (numeric ⇒ array, string ⇒ object).
 */
export function setAtPath<T>(root: T, path: string, value: unknown): T {
  const segments = parsePath(path);
  if (segments.length === 0) return value as T;
  return assign(root, segments, value) as T;
}

function assign(target: unknown, segments: PathSegment[], value: unknown): unknown {
  const [head, ...rest] = segments;
  if (head === undefined) return value;
  const isIndex = typeof head === 'number';
  const container = target ?? (isIndex ? [] : {});
  if (isIndex) {
    const array = Array.isArray(container) ? [...container] : [];
    array[head] = rest.length === 0 ? value : assign(array[head], rest, value);
    return array;
  }
  const obj: Record<string, unknown> = {
    ...((container as Record<string, unknown> | undefined) ?? {}),
  };
  const key = String(head);
  obj[key] = rest.length === 0 ? value : assign(obj[key], rest, value);
  return obj;
}

export function deleteAtPath<T>(root: T, path: string): T {
  const segments = parsePath(path);
  if (segments.length === 0) return root;
  return drop(root, segments) as T;
}

function drop(target: unknown, segments: PathSegment[]): unknown {
  const [head, ...rest] = segments;
  if (head === undefined) return target;
  const isIndex = typeof head === 'number';
  if (rest.length === 0) {
    if (isIndex && Array.isArray(target)) {
      const next = [...target];
      next.splice(head, 1);
      return next;
    }
    if (!isIndex && typeof target === 'object' && target !== null) {
      const next = { ...(target as Record<string, unknown>) };
      delete next[String(head)];
      return next;
    }
    return target;
  }
  if (isIndex && Array.isArray(target)) {
    const next = [...target];
    next[head] = drop(next[head], rest);
    return next;
  }
  if (typeof target === 'object' && target !== null) {
    const next = { ...(target as Record<string, unknown>) };
    const key = String(head);
    next[key] = drop(next[key], rest);
    return next;
  }
  return target;
}
