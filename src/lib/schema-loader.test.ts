import { describe, expect, it } from 'vitest';

import { resolvePath, resolveRef, type FrigateSchema } from './schema-loader.js';

const schema: FrigateSchema = {
  type: 'object',
  properties: {
    cameras: {
      type: 'object',
      additionalProperties: { $ref: '#/$defs/CameraConfig' },
    },
    record: { $ref: '#/$defs/RecordConfig' },
  },
  $defs: {
    CameraConfig: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean', default: true },
        record: { $ref: '#/$defs/RecordConfig' },
      },
    },
    RecordConfig: {
      type: 'object',
      properties: {
        retain: {
          type: 'object',
          properties: {
            days: { type: 'integer', minimum: 0 },
          },
        },
      },
    },
  },
};

describe('resolveRef', () => {
  it('resolves internal pointers', () => {
    const node = resolveRef(schema, '#/$defs/RecordConfig');
    expect(node?.properties?.retain).toBeDefined();
  });

  it('returns undefined for external refs', () => {
    expect(resolveRef(schema, 'https://example.com/schema.json')).toBeUndefined();
  });

  it('returns undefined for unknown paths', () => {
    expect(resolveRef(schema, '#/$defs/Missing')).toBeUndefined();
  });
});

describe('resolvePath', () => {
  it('returns the root schema for an empty path', () => {
    expect(resolvePath(schema, '')).toBe(schema);
  });

  it('walks through $ref indirection', () => {
    const node = resolvePath(schema, 'record.retain.days');
    expect(node?.type).toBe('integer');
    expect(node?.minimum).toBe(0);
  });

  it('traverses map-like nodes via additionalProperties', () => {
    const node = resolvePath(schema, 'cameras.ingresso.enabled');
    expect(node?.type).toBe('boolean');
    expect(node?.default).toBe(true);
  });

  it('returns undefined for unknown paths', () => {
    expect(resolvePath(schema, 'cameras.ingresso.unknown_field')).toBeUndefined();
  });
});
