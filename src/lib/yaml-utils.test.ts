import { describe, expect, it } from 'vitest';

import {
  applyPatch,
  parseYaml,
  readPath,
  stringifyDocument,
  summariseChanges,
} from './yaml-utils.js';

const SAMPLE_YAML = `# Managed by hand
mqtt:
  enabled: true
  host: 192.168.1.10 # local broker
cameras:
  ingresso:
    ffmpeg:
      inputs:
        - path: rtsp://cam/stream
          roles: [detect, record]
    record:
      retain:
        days: 7
`;

describe('parseYaml + readPath', () => {
  it('parses a document and reads values by dotted path', () => {
    const parsed = parseYaml(SAMPLE_YAML);
    expect(readPath(parsed.document, 'mqtt.host')).toBe('192.168.1.10');
    expect(readPath(parsed.document, 'cameras.ingresso.record.retain.days')).toBe(7);
    expect(readPath(parsed.document, 'cameras.ingresso.ffmpeg.inputs.0.path')).toBe(
      'rtsp://cam/stream',
    );
  });

  it('returns undefined for unknown paths', () => {
    const parsed = parseYaml(SAMPLE_YAML);
    expect(readPath(parsed.document, 'cameras.nope')).toBeUndefined();
  });
});

describe('applyPatch', () => {
  it('preserves top-level comments on unrelated sections after a patch', () => {
    const parsed = parseYaml(SAMPLE_YAML);
    applyPatch(parsed.document, 'cameras.ingresso.record.retain.days', 30);
    const out = stringifyDocument(parsed.document);
    expect(out).toContain('# Managed by hand');
    expect(out).toContain('# local broker');
    expect(out).toMatch(/days: 30/);
  });

  it('removes a key when value is undefined', () => {
    const parsed = parseYaml(SAMPLE_YAML);
    applyPatch(parsed.document, 'mqtt.host', undefined);
    const out = stringifyDocument(parsed.document);
    expect(out).not.toContain('host:');
    expect(out).toContain('enabled: true');
  });

  it('creates missing intermediate keys', () => {
    const parsed = parseYaml('cameras: {}\n');
    applyPatch(parsed.document, 'cameras.new.ffmpeg.inputs.0.path', 'rtsp://new');
    const json = parsed.document.toJS() as {
      cameras: { new: { ffmpeg: { inputs: Array<{ path: string }> } } };
    };
    expect(json.cameras.new.ffmpeg.inputs[0].path).toBe('rtsp://new');
  });
});

describe('summariseChanges', () => {
  it('returns a no-op message for identical payloads', () => {
    expect(summariseChanges(SAMPLE_YAML, SAMPLE_YAML)).toBe('no effective changes');
  });

  it('summarises changed paths, capped to three', () => {
    const modified = SAMPLE_YAML.replace('days: 7', 'days: 30').replace(
      'enabled: true',
      'enabled: false',
    );
    const summary = summariseChanges(SAMPLE_YAML, modified);
    expect(summary).toContain('cameras.ingresso.record.retain.days changed');
    expect(summary).toContain('mqtt.enabled changed');
  });
});
