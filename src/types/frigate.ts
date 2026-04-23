/**
 * Frigate configuration typings (MVP subset).
 *
 * These interfaces describe the slice of the Frigate config we expose
 * through dedicated form editors. Anything not covered here is kept
 * untouched in the YAML (see `yaml-utils.ts`) and routed to the raw
 * editor fallback.
 *
 * Source of truth: https://docs.frigate.video/configuration/reference/
 * Verified against Frigate 0.15 and 0.16 schemas.
 */

export type FFmpegRole = 'detect' | 'record' | 'audio';

export interface FFmpegInput {
  path: string;
  roles: FFmpegRole[];
  input_args?: string | string[];
  global_args?: string | string[];
  hwaccel_args?: string | string[];
}

export interface FFmpegConfig {
  inputs: FFmpegInput[];
  hwaccel_args?: string | string[];
  input_args?: string | string[];
  output_args?: Record<string, string | string[]>;
  retry_interval?: number;
}

export interface DetectConfig {
  enabled?: boolean;
  width?: number;
  height?: number;
  fps?: number;
  min_initialized?: number;
  max_disappeared?: number;
  stationary?: {
    interval?: number;
    threshold?: number;
    max_frames?: { default?: number; objects?: Record<string, number> };
  };
}

export interface RetentionConfig {
  days?: number;
  mode?: 'all' | 'motion' | 'active_objects';
}

export interface RecordConfig {
  enabled?: boolean;
  expire_interval?: number;
  sync_recordings?: boolean;
  retain?: RetentionConfig;
  alerts?: {
    retain?: RetentionConfig;
    pre_capture?: number;
    post_capture?: number;
  };
  detections?: {
    retain?: RetentionConfig;
    pre_capture?: number;
    post_capture?: number;
  };
  preview?: {
    quality?: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
  };
}

export interface ObjectsConfig {
  track?: string[];
  filters?: Record<
    string,
    {
      min_area?: number;
      max_area?: number;
      min_ratio?: number;
      max_ratio?: number;
      threshold?: number;
      min_score?: number;
      mask?: string | string[];
    }
  >;
  mask?: string | string[];
}

export interface MotionConfig {
  enabled?: boolean;
  threshold?: number;
  lightning_threshold?: number;
  contour_area?: number;
  frame_alpha?: number;
  frame_height?: number;
  mask?: string | string[];
  improve_contrast?: boolean;
  mqtt_off_delay?: number;
}

export interface ZoneConfig {
  coordinates: string;
  inertia?: number;
  loitering_time?: number;
  objects?: string[];
  filters?: ObjectsConfig['filters'];
}

export interface SnapshotsConfig {
  enabled?: boolean;
  clean_copy?: boolean;
  timestamp?: boolean;
  bounding_box?: boolean;
  crop?: boolean;
  required_zones?: string[];
  height?: number;
  retain?: RetentionConfig;
  quality?: number;
}

export interface CameraConfig {
  enabled?: boolean;
  ffmpeg: FFmpegConfig;
  detect?: DetectConfig;
  record?: RecordConfig;
  objects?: ObjectsConfig;
  motion?: MotionConfig;
  zones?: Record<string, ZoneConfig>;
  snapshots?: SnapshotsConfig;
  best_image_timeout?: number;
  webui_url?: string;
  zone_order?: string[];
  [key: string]: unknown;
}

export interface Go2RtcStream {
  name?: string;
  url?: string | string[];
  [key: string]: unknown;
}

export interface Go2RtcConfig {
  streams?: Record<string, string | string[]>;
  webrtc?: {
    candidates?: string[];
    ice_servers?: Array<{ urls: string | string[]; username?: string; credential?: string }>;
  };
  [key: string]: unknown;
}

export interface MqttConfig {
  enabled?: boolean;
  host?: string;
  port?: number;
  topic_prefix?: string;
  client_id?: string;
  user?: string;
  password?: string;
  tls_ca_certs?: string;
  tls_client_cert?: string;
  tls_client_key?: string;
  tls_insecure?: boolean;
  stats_interval?: number;
}

/**
 * Root Frigate config. We keep an index signature so fields we don't
 * model explicitly survive the round-trip.
 */
export interface FrigateConfig {
  version?: string;
  mqtt?: MqttConfig;
  cameras: Record<string, CameraConfig>;
  record?: RecordConfig;
  detect?: DetectConfig;
  objects?: ObjectsConfig;
  motion?: MotionConfig;
  go2rtc?: Go2RtcConfig;
  database?: { path?: string };
  [key: string]: unknown;
}

/**
 * Response returned by POST /api/config/save when validation succeeds.
 */
export interface FrigateSaveSuccess {
  success: true;
  message: string;
}

export interface FrigateSaveFailure {
  success: false;
  message: string;
}

export type FrigateSaveResponse = FrigateSaveSuccess | FrigateSaveFailure;

/**
 * Modes accepted by POST /api/config/save `save_option` query parameter.
 * - `saveonly`: persist the new YAML without restarting Frigate.
 * - `restart`: persist and restart the container.
 */
export type FrigateSaveOption = 'saveonly' | 'restart';

export interface FrigateVersionResponse {
  /**
   * Raw version string returned by `/api/version`, e.g. `"0.16.1"`.
   */
  version: string;
}
