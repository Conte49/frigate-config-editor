import { describe, expect, it, vi } from 'vitest';

import { discoverFrigateInstances } from './ha-integration.js';
import type { HomeAssistant } from '../types/home-assistant.js';

function makeHass(responses: Record<string, unknown>): HomeAssistant {
  return {
    states: {},
    language: 'en',
    themes: { darkMode: false },
    callApi: vi.fn(),
    hassUrl: () => '',
    callWS: vi.fn(async (msg: Record<string, unknown>) => {
      const key = msg.type as string;
      if (!(key in responses)) throw new Error(`unexpected WS call: ${key}`);
      return responses[key];
    }),
  } as unknown as HomeAssistant;
}

describe('discoverFrigateInstances', () => {
  it('returns [] when the Frigate integration is not installed', async () => {
    const hass = makeHass({
      'config_entries/get': [{ entry_id: 'e1', domain: 'mqtt', title: 'MQTT' }],
      'config/device_registry/list': [],
    });
    expect(await discoverFrigateInstances(hass)).toEqual([]);
  });

  it('maps frigate devices into FrigateInstance records', async () => {
    const hass = makeHass({
      'config_entries/get': [
        { entry_id: 'e1', domain: 'frigate', title: 'Frigate main' },
        { entry_id: 'e2', domain: 'other', title: 'Other' },
      ],
      'config/device_registry/list': [
        {
          id: 'dev1',
          name: 'Frigate NVR',
          name_by_user: null,
          configuration_url: 'http://192.168.1.10:5000/',
          identifiers: [['frigate', 'main']],
          config_entries: ['e1'],
        },
        {
          id: 'dev2',
          name: 'Thermostat',
          name_by_user: null,
          configuration_url: 'http://192.168.1.30',
          identifiers: [['thermo', 'x']],
          config_entries: ['e2'],
        },
      ],
    });
    const instances = await discoverFrigateInstances(hass);
    expect(instances).toEqual([
      {
        id: 'dev1',
        name: 'Frigate NVR',
        baseUrl: 'http://192.168.1.10:5000',
        entryId: 'e1',
      },
    ]);
  });

  it('prefers name_by_user over device name when set', async () => {
    const hass = makeHass({
      'config_entries/get': [{ entry_id: 'e1', domain: 'frigate', title: 'Frigate' }],
      'config/device_registry/list': [
        {
          id: 'dev1',
          name: 'Frigate NVR',
          name_by_user: 'Casa',
          configuration_url: 'http://192.168.1.10:5000',
          identifiers: [],
          config_entries: ['e1'],
        },
      ],
    });
    const [instance] = await discoverFrigateInstances(hass);
    expect(instance?.name).toBe('Casa');
  });

  it('deduplicates by base URL when multiple devices share it', async () => {
    const hass = makeHass({
      'config_entries/get': [{ entry_id: 'e1', domain: 'frigate', title: 'Frigate' }],
      'config/device_registry/list': [
        {
          id: 'dev1',
          name: 'A',
          name_by_user: null,
          configuration_url: 'http://192.168.1.10:5000',
          identifiers: [],
          config_entries: ['e1'],
        },
        {
          id: 'dev2',
          name: 'B',
          name_by_user: null,
          configuration_url: 'http://192.168.1.10:5000/',
          identifiers: [],
          config_entries: ['e1'],
        },
      ],
    });
    expect(await discoverFrigateInstances(hass)).toHaveLength(1);
  });

  it('skips devices without a configuration URL', async () => {
    const hass = makeHass({
      'config_entries/get': [{ entry_id: 'e1', domain: 'frigate', title: 'Frigate' }],
      'config/device_registry/list': [
        {
          id: 'dev1',
          name: 'Frigate',
          name_by_user: null,
          configuration_url: null,
          identifiers: [],
          config_entries: ['e1'],
        },
      ],
    });
    expect(await discoverFrigateInstances(hass)).toEqual([]);
  });
});
