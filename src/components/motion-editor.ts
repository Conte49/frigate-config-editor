import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { setAtPath } from '../lib/path-utils.js';
import { themeVariables } from '../styles/theme.js';
import type { MotionConfig } from '../types/frigate.js';

import './shared/field-boolean.js';
import './shared/field-number.js';
import './shared/form-section.js';

@customElement('frigate-motion-editor')
export class FrigateMotionEditor extends LitElement {
  @property({ attribute: false }) motion: MotionConfig = {};

  static override styles = [themeVariables];

  override render() {
    const m = this.motion ?? {};
    return html`
      <fce-form-section
        heading="Detection"
        description="Global motion detection defaults. Tune to reduce false positives."
      >
        <fce-field-boolean
          label="Enabled"
          path="enabled"
          .value=${m.enabled ?? true}
          @fce-change=${this.#onChange}
        ></fce-field-boolean>
        <div class="grid">
          <fce-field-number
            label="Threshold"
            description="Pixel difference threshold to flag as motion."
            path="threshold"
            min=${1}
            max=${255}
            .value=${m.threshold}
            @fce-change=${this.#onChange}
          ></fce-field-number>
          <fce-field-number
            label="Lightning threshold"
            path="lightning_threshold"
            min=${0}
            step=${0.01}
            .value=${m.lightning_threshold}
            @fce-change=${this.#onChange}
          ></fce-field-number>
          <fce-field-number
            label="Contour area"
            path="contour_area"
            min=${1}
            .value=${m.contour_area}
            @fce-change=${this.#onChange}
          ></fce-field-number>
          <fce-field-number
            label="Frame alpha"
            path="frame_alpha"
            min=${0}
            max=${1}
            step=${0.01}
            .value=${m.frame_alpha}
            @fce-change=${this.#onChange}
          ></fce-field-number>
          <fce-field-number
            label="Frame height"
            path="frame_height"
            min=${0}
            .value=${m.frame_height}
            @fce-change=${this.#onChange}
          ></fce-field-number>
          <fce-field-number
            label="MQTT off delay (s)"
            path="mqtt_off_delay"
            min=${0}
            .value=${m.mqtt_off_delay}
            @fce-change=${this.#onChange}
          ></fce-field-number>
        </div>
        <fce-field-boolean
          label="Improve contrast"
          description="Helpful on low-light cameras at the cost of extra CPU."
          path="improve_contrast"
          .value=${m.improve_contrast ?? false}
          @fce-change=${this.#onChange}
        ></fce-field-boolean>
      </fce-form-section>
    `;
  }

  #onChange = (event: CustomEvent<{ path: string; value: unknown }>) => {
    const next = setAtPath(this.motion, event.detail.path, event.detail.value) as MotionConfig;
    this.dispatchEvent(
      new CustomEvent('fce-motion-change', {
        detail: { motion: next },
        bubbles: true,
        composed: true,
      }),
    );
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'frigate-motion-editor': FrigateMotionEditor;
  }
}
