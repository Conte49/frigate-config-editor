/**
 * YAML parse / stringify helpers built on top of `yaml` (eemeli/yaml).
 *
 * We keep the full Document representation around so comments and
 * ordering from the original file survive the round-trip (ADR-002).
 * Callers edit the logical JS object and we patch the document through
 * `setIn` so the surrounding comments, anchors and tags are untouched.
 */
import {
  isMap,
  isScalar,
  isSeq,
  parseDocument,
  stringify as stringifyYaml,
  type Document,
  type Node,
  type ParsedNode,
} from 'yaml';

export interface ParsedYaml {
  /** The raw Document (use for surgical edits). */
  document: Document.Parsed<ParsedNode>;
  /** The document projected to a plain JS object (use for reads). */
  data: unknown;
}

export function parseYaml(source: string): ParsedYaml {
  const document = parseDocument(source, { keepSourceTokens: true });
  return { document, data: document.toJS() };
}

export function stringifyDocument(doc: Document): string {
  return String(doc);
}

/**
 * Serialize a plain JS object to YAML without any source document
 * reference. Used for brand new configs where comment preservation is
 * not meaningful.
 */
export function stringifyValue(value: unknown): string {
  return stringifyYaml(value, { lineWidth: 120, indent: 2 });
}

/**
 * Apply a partial update, addressed by dotted path, to the parsed
 * Document. Missing intermediate nodes are created.
 *
 * When `value` is `undefined` the path is deleted (YAML omits the key
 * rather than emitting `null`).
 */
export function applyPatch(doc: Document, path: string, value: unknown): void {
  const segments = splitPath(path);
  if (segments.length === 0) return;
  if (value === undefined) {
    doc.deleteIn(segments);
    return;
  }
  doc.setIn(segments, value);
}

/**
 * Read the value at `path` from a parsed Document.
 */
export function readPath(doc: Document, path: string): unknown {
  const segments = splitPath(path);
  if (segments.length === 0) return doc.toJS();
  const node = doc.getIn(segments, true);
  if (node === undefined) return undefined;
  return toPlain(node);
}

function toPlain(value: unknown): unknown {
  if (isScalar(value)) return value.value;
  if (isMap(value) || isSeq(value)) return (value as Node).toJSON();
  return value;
}

function splitPath(path: string): Array<string | number> {
  if (path.length === 0) return [];
  const out: Array<string | number> = [];
  for (const raw of path.split('.')) {
    // support numeric indices e.g. `cameras.foo.ffmpeg.inputs.0.path`
    if (/^\d+$/.test(raw)) {
      out.push(Number(raw));
    } else {
      out.push(raw);
    }
  }
  return out;
}

/**
 * Produce a short human summary of the difference between two YAML
 * payloads, used as `summary` on history snapshots. Keeps the first
 * three changed paths and appends "+N more" when more exist.
 */
export function summariseChanges(before: string, after: string): string {
  const a = safeParse(before);
  const b = safeParse(after);
  if (!a || !b) return 'config updated';
  const changes = diffObjects(a, b, '');
  if (changes.length === 0) return 'no effective changes';
  const shown = changes.slice(0, 3).join(', ');
  const extra = changes.length - 3;
  return extra > 0 ? `${shown}, +${extra} more` : shown;
}

function safeParse(source: string): unknown {
  try {
    return parseDocument(source).toJS();
  } catch {
    return undefined;
  }
}

function diffObjects(a: unknown, b: unknown, prefix: string): string[] {
  if (Object.is(a, b)) return [];
  if (!isPlainObject(a) || !isPlainObject(b)) {
    return [`${prefix || '(root)'} changed`];
  }
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const out: string[] = [];
  for (const key of keys) {
    const left = (a as Record<string, unknown>)[key];
    const right = (b as Record<string, unknown>)[key];
    const path = prefix ? `${prefix}.${key}` : key;
    if (!(key in a)) out.push(`added ${path}`);
    else if (!(key in b)) out.push(`removed ${path}`);
    else if (isPlainObject(left) && isPlainObject(right))
      out.push(...diffObjects(left, right, path));
    else if (!valueEqual(left, right)) out.push(`${path} changed`);
  }
  return out;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function valueEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, i) => valueEqual(item, b[i]));
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const key of keys) {
      if (!valueEqual(a[key], b[key])) return false;
    }
    return true;
  }
  return false;
}
