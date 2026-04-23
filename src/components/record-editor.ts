import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { setAtPath } from '../lib/path-utils.js';
import { themeVariables } from '../styles/theme.js';
import type { RecordConfig } from '../types/frigate.js';

import './shared/field-boolean.js';
import './shared/field-number.js';
import './shared/field-select.js';
import './shared/form-section.js';

const QUALITY_OPTIONS = [
  { label: 'Very low', value: 'very_low' },
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
  { label: 'Very high', value: 'very_high' },
];

/**
 * Editor for the global `record` section of Frigate config. Camera-level
 * overrides are still edited through `frigate-camera-editor`.
 */
@customElement('frigate-record-editor')
export class FrigateRecordEditor extends LitElement {
  @property({ attribute: false }) record: RecordConfig = {};

  static override styles = [themeVariables];

  override render() {
    const r = this.record ?? {};
    return html`
      <fce-form-section
        heading="General"
        description="Defaults applied when a camera doesn't override the field."
      >
        <fce-field-boolean
          label="Enabled"
          path="enabled"
          .value=${r.enabled ?? false}
          @fce-change=${this.#onChange}
        ></fce-field-boolean>
        <div class="grid">
          <fce-field-number
            label="Expire interval (seconds)"
            path="expire_interval"
            min=${0}
            .value=${r.expire_interval}
            @fce-change=${this.#onChange}
          ></fce-field-number>
          <fce-field-boolean
            label="Sync recordings at start"
            path="sync_recordings"
            .value=${r.sync_recordings ?? false}
            @fce-change=${this.#onChange}
          ></fce-field-boolean>
        </div>
      </fce-form-section>

      <fce-form-section
        heading="Retention"
        description="Days the recordings are kept around before Frigate deletes them."
      >
        <div class="grid">
          <fce-field-number
            label="Continuous retain (days)"
            path="retain.days"
            min=${0}
            .value=${r.retain?.days}
            @fce-change=${this.#onChange}
          ></fce-field-number>
          <fce-field-select
            label="Continuous mode"
            path="retain.mode"
            .value=${r.retain?.mode ?? ''}
            .options=${[
              { label: 'All', value: 'all' },
              { label: 'Motion', value: 'motion' },
              { label: 'Active objects', value: 'active_objects' },
            ]}
            @fce-change=${this.#onChange}
          ></fce-field-select>
        </div>
      </fce-form-section>

      <fce-form-section
        heading="Alerts"
        description="Retention of alert events (high-priority detections)."
      >
        <div class="grid">
          <fce-field-number
            label="Retain (days)"
            path="alerts.retain.days"
            min=${0}
            .value=${r.alerts?.retain?.days}
            @fce-change=${this.#onChange}
          ></fce-field-number>
          <fce-field-number
            label="Pre-capture (seconds)"
            path="alerts.pre_capture"
            min=${0}
            .value=${r.alerts?.pre_capture}
            @fce-change=${this.#onChange}
          ></fce-field-number>
          <fce-field-number
            label="Post-capture (seconds)"
            path="alerts.post_capture"
            min=${0}
            .value=${r.alerts?.post_capture}
            @fce-change=${this.#onChange}
          ></fce-field-number>
        </div>
      </fce-form-section>

      <fce-form-section heading="Detections" description="Retention of tracked object events.">
        <div class="grid">
          <fce-field-number
            label="Retain (days)"
            path="detections.retain.days"
            min=${0}
            .value=${r.detections?.retain?.days}
            @fce-change=${this.#onChange}
          ></fce-field-number>
          <fce-field-number
            label="Pre-capture (seconds)"
            path="detections.pre_capture"
            min=${0}
            .value=${r.detections?.pre_capture}
            @fce-change=${this.#onChange}
          ></fce-field-number>
          <fce-field-number
            label="Post-capture (seconds)"
            path="detections.post_capture"
            min=${0}
            .value=${r.detections?.post_capture}
            @fce-change=${this.#onChange}
          ></fce-field-number>
        </div>
      </fce-form-section>

      <fce-form-section heading="Preview">
        <fce-field-select
          label="Quality"
          path="preview.quality"
          .value=${r.preview?.quality ?? ''}
          .options=${QUALITY_OPTIONS}
          @fce-change=${this.#onChange}
        ></fce-field-select>
      </fce-form-section>
    `;
  }

  #onChange = (event: CustomEvent<{ path: string; value: unknown }>) => {
    const next = setAtPath(this.record, event.detail.path, event.detail.value) as RecordConfig;
    this.dispatchEvent(
      new CustomEvent('fce-record-change', {
        detail: { record: next },
        bubbles: true,
        composed: true,
      }),
    );
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'frigate-record-editor': FrigateRecordEditor;
  }
}
