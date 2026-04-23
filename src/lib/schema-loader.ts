/**
 * Utilities to load and lightly normalise the Frigate JSON Schema.
 *
 * The schema served at `/api/config/schema.json` follows JSON Schema
 * draft 2020-12 with `$ref` / `$defs` indirection. Downstream form code
 * needs the ability to:
 *   - follow a `$ref` pointer within the document
 *   - resolve a node from a dotted property path (e.g. `cameras.record.retain.days`)
 *
 * This module stays intentionally small: full schema validation is
 * delegated to the Frigate server, we only use the schema to drive the
 * form UI (labels, defaults, enums, numeric ranges).
 */

export interface JsonSchemaNode {
  $ref?: string;
  type?: string | string[];
  title?: string;
  description?: string;
  enum?: unknown[];
  default?: unknown;
  properties?: Record<string, JsonSchemaNode>;
  required?: string[];
  items?: JsonSchemaNode | JsonSchemaNode[];
  additionalProperties?: boolean | JsonSchemaNode;
  patternProperties?: Record<string, JsonSchemaNode>;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
  oneOf?: JsonSchemaNode[];
  anyOf?: JsonSchemaNode[];
  allOf?: JsonSchemaNode[];
  const?: unknown;
  [key: string]: unknown;
}

export interface FrigateSchema extends JsonSchemaNode {
  $schema?: string;
  $defs?: Record<string, JsonSchemaNode>;
  definitions?: Record<string, JsonSchemaNode>;
}

/**
 * Resolve a `$ref` pointer (only the internal `#/...` form is supported,
 * which is the only variant Frigate emits).
 */
export function resolveRef(schema: FrigateSchema, ref: string): JsonSchemaNode | undefined {
  if (!ref.startsWith('#/')) return undefined;
  const segments = ref
    .slice(2)
    .split('/')
    .map((s) => decodeURIComponent(s.replace(/~1/g, '/').replace(/~0/g, '~')));
  let cursor: unknown = schema;
  for (const segment of segments) {
    if (!cursor || typeof cursor !== 'object') return undefined;
    cursor = (cursor as Record<string, unknown>)[segment];
  }
  return (cursor as JsonSchemaNode | undefined) ?? undefined;
}

/**
 * Walk a dotted property path and return the schema node that describes
 * the value at that path. Map-typed nodes (e.g. `cameras.*`) are
 * transparently traversed via `additionalProperties` / `patternProperties`.
 */
export function resolvePath(schema: FrigateSchema, path: string): JsonSchemaNode | undefined {
  if (path.length === 0) return schema;
  let node: JsonSchemaNode | undefined = schema;
  const segments = path.split('.');
  for (const segment of segments) {
    node = deref(schema, node);
    if (!node) return undefined;
    if (node.properties && segment in node.properties) {
      node = node.properties[segment];
      continue;
    }
    if (typeof node.additionalProperties === 'object') {
      node = node.additionalProperties;
      continue;
    }
    if (node.patternProperties) {
      const match = Object.entries(node.patternProperties).find(([pattern]) => {
        try {
          return new RegExp(pattern).test(segment);
        } catch {
          return false;
        }
      });
      if (match) {
        node = match[1];
        continue;
      }
    }
    return undefined;
  }
  return deref(schema, node);
}

function deref(
  schema: FrigateSchema,
  node: JsonSchemaNode | undefined,
): JsonSchemaNode | undefined {
  if (!node) return undefined;
  let cursor: JsonSchemaNode | undefined = node;
  const seen = new Set<string>();
  while (cursor?.$ref) {
    if (seen.has(cursor.$ref)) return cursor; // cycle guard
    seen.add(cursor.$ref);
    cursor = resolveRef(schema, cursor.$ref);
  }
  return cursor;
}
