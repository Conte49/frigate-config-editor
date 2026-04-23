/**
 * Helpers to talk to Home Assistant from inside the panel.
 *
 * Scope for M1:
 *  - Discover Frigate instances wired through the official HA Frigate
 *    integration.
 *  - Resolve the base URL to reach each discovered Frigate instance.
 *
 * Discovery strategy (see MVP_SPEC §3.3):
 *  - Look for entities produced by the integration that uniquely identify
 *    a Frigate instance (e.g. `sensor.<slug>_detection_fps`,
 *    `binary_sensor.<slug>_camera_fps`).
 *  - Read the device registry through the HA websocket API to resolve the
 *    instance URL. The device `configuration_url` field points to the
 *    Frigate UI base URL.
 *  - Fall back to a manual URL entered by the user if discovery fails.
 */
import type { HomeAssistant } from '../types/home-assistant.js';

export interface FrigateInstance {
  /** Stable identifier derived from the HA device id. */
  id: string;
  /** Human friendly name (device name or entry title). */
  name: string;
  /** Base URL of the Frigate instance, without trailing slash. */
  baseUrl: string;
  /** HA config entry id the instance belongs to. */
  entryId: string;
}

interface HaDevice {
  id: string;
  name: string | null;
  name_by_user: string | null;
  configuration_url: string | null;
  identifiers: Array<[string, string]>;
  config_entries: string[];
}

interface HaConfigEntry {
  entry_id: string;
  domain: string;
  title: string;
}

const FRIGATE_DOMAIN = 'frigate';

/**
 * Discover every Frigate instance known to HA via the Frigate integration.
 *
 * Returns an empty list if the integration is not installed or no entries
 * are configured. The caller is expected to offer manual URL input in that
 * case.
 */
export async function discoverFrigateInstances(hass: HomeAssistant): Promise<FrigateInstance[]> {
  const [entries, devices] = await Promise.all([listConfigEntries(hass), listDevices(hass)]);

  const frigateEntries = entries.filter((e) => e.domain === FRIGATE_DOMAIN);
  if (frigateEntries.length === 0) return [];

  const frigateEntryIds = new Set(frigateEntries.map((e) => e.entry_id));

  const instances: FrigateInstance[] = [];
  for (const device of devices) {
    const matchingEntryId = device.config_entries.find((id) => frigateEntryIds.has(id));
    if (!matchingEntryId) continue;
    if (!device.configuration_url) continue;

    const entry = frigateEntries.find((e) => e.entry_id === matchingEntryId);
    instances.push({
      id: device.id,
      name: device.name_by_user ?? device.name ?? entry?.title ?? 'Frigate',
      baseUrl: device.configuration_url.replace(/\/+$/, ''),
      entryId: matchingEntryId,
    });
  }

  return deduplicateByBaseUrl(instances);
}

async function listConfigEntries(hass: HomeAssistant): Promise<HaConfigEntry[]> {
  return hass.callWS<HaConfigEntry[]>({ type: 'config_entries/get' });
}

async function listDevices(hass: HomeAssistant): Promise<HaDevice[]> {
  return hass.callWS<HaDevice[]>({ type: 'config/device_registry/list' });
}

function deduplicateByBaseUrl(instances: FrigateInstance[]): FrigateInstance[] {
  const seen = new Map<string, FrigateInstance>();
  for (const instance of instances) {
    if (!seen.has(instance.baseUrl)) {
      seen.set(instance.baseUrl, instance);
    }
  }
  return [...seen.values()];
}
