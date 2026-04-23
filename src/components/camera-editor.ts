import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import type { CameraConfig, FFmpegInput, FFmpegRole } from '../types/frigate.js';
import { setAtPath } from '../lib/path-utils.js';
import { themeVariables } from '../styles/theme.js';

import './shared/field-boolean.js';
import './shared/field-list.js';
import './shared/field-number.js';
import './shared/field-select.js';
import './shared/field-text.js';

const ROLE_OPTIONS = ['detect', 'record', 'audio'] as const;

/**
 * Form editor for a single Frigate camera. The component is stateless:
 * it receives `camera` from the parent, emits `fce-camera-change` with
 * the patched CameraConfig, and lets the parent persist the diff.
 */
@customElement('frigate-camera-editor')
export class FrigateCameraEditor extends LitElement {
  @property({ type: String }) cameraId = '';
  @property({ attribute: false }) camera: CameraConfig = { ffmpeg: { inputs: [] } };

  static override styles = [
    themeVariables,
    css`
      :host {
        display: block;
        color: var(--fce-text);
        font-family: var(--fce-font);
      }
      section {
        margin-bottom: 28px;
      }
      section h3 {
        font-size: 1rem;
        font-weight: 500;
        margin: 0 0 12px;
        padding-bottom: 6px;
        border-bottom: 1px solid var(--fce-border);
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: var(--fce-gap);
      }
      .role-pills {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .role-pill {
        font-size: 0.75rem;
        border: 1px solid var(--fce-border);
        border-radius: 999px;
        padding: 4px 10px;
        cursor: pointer;
        user-select: none;
      }
      .role-pill.active {
        background: var(--fce-accent);
        color: var(--fce-accent-text);
        border-color: transparent;
      }
      .role-label {
        font-size: 0.8rem;
        font-weight: 500;
        color: var(--fce-text);
        margin-bottom: 6px;
      }
    `,
  ];

  override render() {
    const cam = this.camera;
    const inputs = cam.ffmpeg?.inputs ?? [];
    return html`
      <section>
        <h3>General</h3>
        <fce-field-boolean
          label="Enabled"
          description="Disable to keep the camera config but stop processing it."
          path="enabled"
          .value=${cam.enabled ?? true}
          @fce-change=${this.#onGeneralChange}
        ></fce-field-boolean>
      </section>

      <section>
        <h3>FFmpeg inputs</h3>
        <fce-field-list
          label="Streams"
          path="ffmpeg.inputs"
          addLabel="Add stream"
          emptyLabel="No streams configured — Frigate needs at least one input."
          .items=${inputs}
          .createItem=${this.#emptyInput}
          .renderItem=${this.#renderInput}
          @fce-list-change=${this.#onInputsChange}
        ></fce-field-list>
      </section>

      <section>
        <h3>Detect</h3>
        <div class="grid">
          <fce-field-boolean
            label="Enabled"
            path="detect.enabled"
            .value=${cam.detect?.enabled ?? false}
            @fce-change=${this.#onGeneralChange}
          ></fce-field-boolean>
          <fce-field-number
            label="Width"
            path="detect.width"
            min=${0}
            .value=${cam.detect?.width}
            @fce-change=${this.#onGeneralChange}
          ></fce-field-number>
          <fce-field-number
            label="Height"
            path="detect.height"
            min=${0}
            .value=${cam.detect?.height}
            @fce-change=${this.#onGeneralChange}
          ></fce-field-number>
          <fce-field-number
            label="FPS"
            path="detect.fps"
            min=${1}
            max=${30}
            .value=${cam.detect?.fps}
            @fce-change=${this.#onGeneralChange}
          ></fce-field-number>
        </div>
      </section>

      <section>
        <h3>Record</h3>
        <div class="grid">
          <fce-field-boolean
            label="Enabled"
            path="record.enabled"
            .value=${cam.record?.enabled ?? false}
            @fce-change=${this.#onGeneralChange}
          ></fce-field-boolean>
          <fce-field-number
            label="Continuous retain (days)"
            path="record.retain.days"
            min=${0}
            .value=${cam.record?.retain?.days}
            @fce-change=${this.#onGeneralChange}
          ></fce-field-number>
          <fce-field-number
            label="Alerts retain (days)"
            path="record.alerts.retain.days"
            min=${0}
            .value=${cam.record?.alerts?.retain?.days}
            @fce-change=${this.#onGeneralChange}
          ></fce-field-number>
          <fce-field-number
            label="Detections retain (days)"
            path="record.detections.retain.days"
            min=${0}
            .value=${cam.record?.detections?.retain?.days}
            @fce-change=${this.#onGeneralChange}
          ></fce-field-number>
        </div>
      </section>
    `;
  }

  #emptyInput = (): FFmpegInput => ({ path: '', roles: ['detect'] });

  #renderInput = (input: FFmpegInput, index: number) => {
    const roles = new Set(input.roles ?? []);
    return html`
      <fce-field-text
        label="Stream URL"
        type="url"
        placeholder="rtsp://user:pass@host:554/stream"
        .value=${input.path ?? ''}
        path="ffmpeg.inputs.${index}.path"
        @fce-change=${this.#onGeneralChange}
      ></fce-field-text>
      <div>
        <div class="role-label">Roles</div>
        <div class="role-pills">
          ${ROLE_OPTIONS.map(
            (role) => html`
              <span
                role="checkbox"
                aria-checked=${roles.has(role)}
                tabindex="0"
                class=${`role-pill ${roles.has(role) ? 'active' : ''}`}
                @click=${() => this.#toggleRole(index, role)}
                @keydown=${(e: KeyboardEvent) => this.#onRoleKey(e, index, role)}
              >
                ${role}
              </span>
            `,
          )}
        </div>
      </div>
    `;
  };

  #onGeneralChange = (event: CustomEvent<{ path: string; value: unknown }>) => {
    const { path, value } = event.detail;
    const next = setAtPath(this.camera, path, value);
    this.#emit(next);
  };

  #onInputsChange = (event: CustomEvent<{ value: FFmpegInput[] }>) => {
    const next = setAtPath(this.camera, 'ffmpeg.inputs', event.detail.value);
    this.#emit(next);
  };

  #toggleRole(inputIndex: number, role: FFmpegRole) {
    const current = this.camera.ffmpeg?.inputs?.[inputIndex];
    if (!current) return;
    const roles = new Set<FFmpegRole>(current.roles ?? []);
    if (roles.has(role)) roles.delete(role);
    else roles.add(role);
    const updated = { ...current, roles: [...roles] };
    const next = setAtPath(this.camera, `ffmpeg.inputs.${inputIndex}`, updated);
    this.#emit(next);
  }

  #onRoleKey(event: KeyboardEvent, inputIndex: number, role: FFmpegRole) {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      this.#toggleRole(inputIndex, role);
    }
  }

  #emit(camera: CameraConfig) {
    this.dispatchEvent(
      new CustomEvent('fce-camera-change', {
        detail: { cameraId: this.cameraId, camera },
        bubbles: true,
        composed: true,
      }),
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'frigate-camera-editor': FrigateCameraEditor;
  }
}
