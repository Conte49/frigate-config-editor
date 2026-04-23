/**
 * Minimal Home Assistant typings used by the panel.
 *
 * The full `HomeAssistant` interface is huge and lives in the official
 * frontend repo (MIT licensed). We only redeclare the subset we consume so
 * the bundle stays self-contained and we don't drag in an external dep.
 */

export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed: string;
  last_updated: string;
  context: { id: string; parent_id: string | null; user_id: string | null };
}

export interface HassUser {
  id: string;
  name: string;
  is_owner: boolean;
  is_admin: boolean;
  credentials: Array<{ auth_provider_type: string; auth_provider_id: string | null }>;
}

export interface HomeAssistant {
  states: Record<string, HassEntity>;
  user?: HassUser;
  language: string;
  themes: { darkMode: boolean };
  callApi<T>(method: string, path: string, parameters?: unknown): Promise<T>;
  callWS<T>(msg: Record<string, unknown>): Promise<T>;
  hassUrl(path?: string): string;
}

export interface PanelInfo<TConfig = Record<string, unknown>> {
  component_name: string;
  config: TConfig;
  icon: string | null;
  title: string | null;
  url_path: string;
}
