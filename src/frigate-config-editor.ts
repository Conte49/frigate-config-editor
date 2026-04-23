import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { FrigateApi, FrigateApiError } from './lib/frigate-api.js';
import { discoverFrigateInstances, type FrigateInstance } from './lib/ha-integration.js';
import { applyPatch, parseYaml, stringifyDocument, summariseChanges } from './lib/yaml-utils.js';
import { HistoryStore, type ConfigSnapshot } from './lib/history-store.js';
import { setAtPath } from './lib/path-utils.js';
import { themeVariables } from './styles/theme.js';
import type { CameraConfig, FrigateConfig } from './types/frigate.js';
import type { HomeAssistant, PanelInfo } from './types/home-assistant.js';

import './components/camera-editor.js';
import './components/camera-list.js';
import './components/diff-modal.js';
import './components/go2rtc-editor.js';
import './components/history-panel.js';
import './components/motion-editor.js';
import './components/objects-editor.js';
import './components/raw-yaml-editor.js';
import './components/record-editor.js';

type Status = 'idle' | 'loading' | 'saving' | 'error' | 'ready';
type View = 'cameras' | 'record' | 'objects' | 'motion' | 'go2rtc' | 'raw' | 'history';

/**
 * Root component. Owns discovery, config load/save and sidebar state,
 * delegates per-section editing to child components.
 */
@customElement('frigate-config-editor')
export class FrigateConfigEditor extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @property({ attribute: false }) panel?: PanelInfo;
  @property({ type: Boolean, reflect: true }) narrow = false;

  @state() private instances: FrigateInstance[] = [];
  @state() private currentInstance?: FrigateInstance;
  @state() private currentApi?: FrigateApi;
  @state() private frigateVersion = '';
  @state() private originalYaml = '';
  @state() private workingConfig?: FrigateConfig;
  @state() private selectedCamera = '';
  @state() private status: Status = 'idle';
  @state() private errorMessage = '';
  @state() private saveMessage = '';
  @state() private view: View = 'cameras';
  @state() private rawYaml = '';
  @state() private pendingYaml = '';
  @state() private diffOpen = false;
  @state() private snapshots: ConfigSnapshot[] = [];

  private readonly history = new HistoryStore();

  static override styles = [
    themeVariables,
    css`
      :host {
        display: block;
        height: 100%;
        background: var(--fce-bg);
        color: var(--fce-text);
        font-family: var(--fce-font);
      }
      .shell {
        display: grid;
        grid-template-columns: 260px 1fr;
        gap: 0;
        height: 100%;
      }
      :host([narrow]) .shell {
        grid-template-columns: 1fr;
      }
      aside {
        border-right: 1px solid var(--fce-border);
        padding: 16px;
        background: var(--fce-surface);
        overflow-y: auto;
      }
      main {
        padding: 24px 32px;
        overflow-y: auto;
      }
      header.page {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 20px;
      }
      h1 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 500;
      }
      h2 {
        margin: 24px 0 8px;
        font-size: 0.8rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--fce-text-muted);
      }
      .instance-pill {
        font-size: 0.75rem;
        padding: 4px 10px;
        border-radius: 999px;
        background: var(--fce-surface-muted);
        color: var(--fce-text-muted);
      }
      .toolbar {
        display: flex;
        gap: 8px;
        align-items: center;
        flex-wrap: wrap;
      }
      .nav {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .nav-btn {
        text-align: left;
        font-family: inherit;
        font-size: 0.9rem;
        background: transparent;
        border: 1px solid transparent;
        border-radius: var(--fce-radius-sm);
        padding: 8px 10px;
        color: var(--fce-text);
        cursor: pointer;
      }
      .nav-btn:hover {
        background: var(--fce-surface-muted);
      }
      .nav-btn.active {
        background: var(--fce-accent);
        color: var(--fce-accent-text);
      }
      button {
        font-family: inherit;
        font-size: 0.9rem;
        padding: 8px 14px;
        border-radius: var(--fce-radius-sm);
        border: 1px solid var(--fce-border);
        background: var(--fce-surface);
        color: var(--fce-text);
        cursor: pointer;
      }
      button.primary {
        background: var(--fce-accent);
        color: var(--fce-accent-text);
        border-color: transparent;
      }
      button[disabled] {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .banner {
        padding: 12px 14px;
        border-radius: var(--fce-radius);
        margin-bottom: 16px;
      }
      .banner.error {
        background: color-mix(in srgb, var(--fce-danger) 10%, transparent);
        color: var(--fce-danger);
        border: 1px solid var(--fce-danger);
      }
      .banner.success {
        background: color-mix(in srgb, var(--fce-success) 12%, transparent);
        color: var(--fce-success);
        border: 1px solid var(--fce-success);
      }
      .placeholder {
        color: var(--fce-text-muted);
        padding: 48px 0;
        text-align: center;
      }
      label.select-instance {
        display: block;
        margin-bottom: 12px;
        font-size: 0.85rem;
        color: var(--fce-text-muted);
      }
      select {
        width: 100%;
        padding: 8px;
        border: 1px solid var(--fce-border);
        border-radius: var(--fce-radius-sm);
        background: var(--fce-surface);
        color: var(--fce-text);
        font-family: inherit;
      }
    `,
  ];

  override connectedCallback(): void {
    super.connectedCallback();
    void this.#bootstrap();
  }

  override updated(changed: Map<string, unknown>): void {
    if (changed.has('hass') && this.hass && this.instances.length === 0) {
      void this.#bootstrap();
    }
  }

  async #bootstrap(): Promise<void> {
    if (!this.hass) return;
    try {
      const instances = await discoverFrigateInstances(this.hass);
      this.instances = instances;
      if (instances.length > 0 && !this.currentInstance) {
        await this.#selectInstance(instances[0]!);
      }
    } catch (error) {
      this.status = 'error';
      this.errorMessage = error instanceof Error ? error.message : 'Discovery failed';
    }
  }

  async #selectInstance(instance: FrigateInstance): Promise<void> {
    this.currentInstance = instance;
    this.currentApi = new FrigateApi({ baseUrl: instance.baseUrl });
    await this.#loadConfig();
  }

  async #loadConfig(): Promise<void> {
    if (!this.currentApi) return;
    this.status = 'loading';
    this.errorMessage = '';
    this.saveMessage = '';
    try {
      const [raw, version] = await Promise.all([
        this.currentApi.getRawConfig(),
        this.currentApi.getVersion().catch(() => ({ version: '' })),
      ]);
      this.originalYaml = raw;
      this.rawYaml = raw;
      this.frigateVersion = version.version;
      const { data } = parseYaml(raw);
      this.workingConfig = data as FrigateConfig;
      const cameras = Object.keys(this.workingConfig.cameras ?? {});
      this.selectedCamera = cameras[0] ?? '';
      this.#refreshSnapshots();
      this.status = 'ready';
    } catch (error) {
      this.status = 'error';
      this.errorMessage = this.#explainError(error);
    }
  }

  #refreshSnapshots(): void {
    if (!this.currentInstance) {
      this.snapshots = [];
      return;
    }
    this.snapshots = this.history.list(this.currentInstance.id);
  }

  #buildNextYaml(): string {
    if (this.view === 'raw') return this.rawYaml;
    if (!this.workingConfig) return this.originalYaml;
    const parsed = parseYaml(this.originalYaml);
    applyPatch(parsed.document, 'cameras', this.workingConfig.cameras);
    for (const section of ['record', 'objects', 'motion', 'go2rtc'] as const) {
      const value = this.workingConfig[section];
      applyPatch(parsed.document, section, value);
    }
    return stringifyDocument(parsed.document);
  }

  #onRequestSave = (): void => {
    const nextYaml = this.#buildNextYaml();
    if (nextYaml === this.originalYaml) {
      this.saveMessage = 'No changes to save.';
      this.errorMessage = '';
      return;
    }
    this.pendingYaml = nextYaml;
    this.diffOpen = true;
  };

  #onDiffCancel = (): void => {
    if (this.status === 'saving') return;
    this.diffOpen = false;
    this.pendingYaml = '';
  };

  #onDiffConfirm = async (): Promise<void> => {
    await this.#save(this.pendingYaml);
  };

  async #save(nextYaml: string): Promise<void> {
    if (!this.currentApi || nextYaml === this.originalYaml) return;
    this.status = 'saving';
    this.errorMessage = '';
    try {
      const response = await this.currentApi.saveConfig(nextYaml, 'restart');
      if (!response.success) {
        this.status = 'error';
        this.errorMessage = response.message;
        return;
      }
      if (this.currentInstance) {
        this.history.add({
          instanceId: this.currentInstance.id,
          yaml: this.originalYaml,
          summary: summariseChanges(this.originalYaml, nextYaml),
        });
        this.#refreshSnapshots();
      }
      this.originalYaml = nextYaml;
      this.rawYaml = nextYaml;
      const { data } = parseYaml(nextYaml);
      this.workingConfig = data as FrigateConfig;
      this.saveMessage = 'Configuration saved. Frigate is restarting.';
      this.diffOpen = false;
      this.pendingYaml = '';
      this.status = 'ready';
    } catch (error) {
      this.status = 'error';
      this.errorMessage = this.#explainError(error);
    }
  }

  #explainError(error: unknown): string {
    if (error instanceof FrigateApiError) {
      return `${error.message}${error.body ? `\n${error.body}` : ''}`;
    }
    return error instanceof Error ? error.message : String(error);
  }

  #onCameraSelect = (event: CustomEvent<{ id: string }>) => {
    this.selectedCamera = event.detail.id;
  };

  #onCameraChange = (event: CustomEvent<{ cameraId: string; camera: CameraConfig }>) => {
    const { cameraId, camera } = event.detail;
    const next = setAtPath(
      this.workingConfig ?? ({ cameras: {} } as FrigateConfig),
      `cameras.${cameraId}`,
      camera,
    );
    this.workingConfig = next as FrigateConfig;
  };

  #onRecordChange = (event: CustomEvent<{ record: FrigateConfig['record'] }>) => {
    if (!this.workingConfig) return;
    this.workingConfig = this.#withSection(this.workingConfig, 'record', event.detail.record);
  };

  #onObjectsChange = (event: CustomEvent<{ objects: FrigateConfig['objects'] }>) => {
    if (!this.workingConfig) return;
    this.workingConfig = this.#withSection(this.workingConfig, 'objects', event.detail.objects);
  };

  #onMotionChange = (event: CustomEvent<{ motion: FrigateConfig['motion'] }>) => {
    if (!this.workingConfig) return;
    this.workingConfig = this.#withSection(this.workingConfig, 'motion', event.detail.motion);
  };

  #onGo2RtcChange = (event: CustomEvent<{ go2rtc: FrigateConfig['go2rtc'] }>) => {
    if (!this.workingConfig) return;
    this.workingConfig = this.#withSection(this.workingConfig, 'go2rtc', event.detail.go2rtc);
  };

  #withSection<K extends 'record' | 'objects' | 'motion' | 'go2rtc'>(
    config: FrigateConfig,
    key: K,
    value: FrigateConfig[K] | undefined,
  ): FrigateConfig {
    const next: FrigateConfig = { ...config };
    if (value === undefined) {
      delete next[key];
    } else {
      (next as Record<string, unknown>)[key] = value;
    }
    return next;
  }

  #onInstanceChange = (event: Event) => {
    const target = event.target as HTMLSelectElement;
    const instance = this.instances.find((i) => i.id === target.value);
    if (instance) void this.#selectInstance(instance);
  };

  #onRawChange = (event: CustomEvent<{ value: string }>) => {
    this.rawYaml = event.detail.value;
  };

  #onHistoryRestore = (event: CustomEvent<{ snapshot: ConfigSnapshot }>) => {
    const { snapshot } = event.detail;
    this.rawYaml = snapshot.yaml;
    this.view = 'raw';
    this.saveMessage = `Loaded snapshot from ${new Date(snapshot.timestamp).toLocaleString()}. Review and save to apply.`;
    this.errorMessage = '';
  };

  #setView(view: View): void {
    this.view = view;
    if (view === 'raw' && !this.rawYaml) this.rawYaml = this.originalYaml;
    if (view === 'cameras' && this.workingConfig === undefined) {
      try {
        const { data } = parseYaml(this.rawYaml || this.originalYaml);
        this.workingConfig = data as FrigateConfig;
      } catch {
        /* leave workingConfig untouched */
      }
    }
  }

  override render() {
    if (!this.hass) {
      return html`<div class="placeholder">Waiting for Home Assistant context…</div>`;
    }

    const cameras = Object.keys(this.workingConfig?.cameras ?? {});
    const currentCamera = this.selectedCamera
      ? this.workingConfig?.cameras?.[this.selectedCamera]
      : undefined;

    return html`
      <div class="shell">
        <aside>
          <header>
            <h1>Frigate</h1>
            ${this.frigateVersion
              ? html`<span class="instance-pill">v${this.frigateVersion}</span>`
              : nothing}
          </header>

          ${this.instances.length > 1
            ? html`
                <label class="select-instance">
                  Instance
                  <select @change=${this.#onInstanceChange}>
                    ${this.instances.map(
                      (i) => html`
                        <option value=${i.id} ?selected=${i.id === this.currentInstance?.id}>
                          ${i.name}
                        </option>
                      `,
                    )}
                  </select>
                </label>
              `
            : nothing}

          <h2>Cameras</h2>
          <frigate-camera-list
            .cameras=${cameras}
            .selected=${this.selectedCamera}
            @fce-camera-select=${this.#onCameraSelect}
          ></frigate-camera-list>

          <h2>Global</h2>
          <nav class="nav">
            <button
              class=${this.view === 'record' ? 'nav-btn active' : 'nav-btn'}
              type="button"
              @click=${() => this.#setView('record')}
            >
              Record
            </button>
            <button
              class=${this.view === 'objects' ? 'nav-btn active' : 'nav-btn'}
              type="button"
              @click=${() => this.#setView('objects')}
            >
              Objects
            </button>
            <button
              class=${this.view === 'motion' ? 'nav-btn active' : 'nav-btn'}
              type="button"
              @click=${() => this.#setView('motion')}
            >
              Motion
            </button>
            <button
              class=${this.view === 'go2rtc' ? 'nav-btn active' : 'nav-btn'}
              type="button"
              @click=${() => this.#setView('go2rtc')}
            >
              go2rtc
            </button>
          </nav>

          <h2>Advanced</h2>
          <nav class="nav">
            <button
              class=${this.view === 'raw' ? 'nav-btn active' : 'nav-btn'}
              type="button"
              @click=${() => this.#setView('raw')}
            >
              Raw YAML
            </button>
            <button
              class=${this.view === 'history' ? 'nav-btn active' : 'nav-btn'}
              type="button"
              @click=${() => this.#setView('history')}
            >
              History (${this.snapshots.length})
            </button>
            ${this.view !== 'cameras'
              ? html`
                  <button class="nav-btn" type="button" @click=${() => this.#setView('cameras')}>
                    Back to cameras
                  </button>
                `
              : nothing}
          </nav>
        </aside>

        <main>
          <header class="page">
            <div>
              <h1>${this.#headingForView()}</h1>
              ${this.currentInstance
                ? html`<small style="color: var(--fce-text-muted)"
                    >${this.currentInstance.name} — ${this.currentInstance.baseUrl}</small
                  >`
                : nothing}
            </div>
            <div class="toolbar">
              <button
                type="button"
                @click=${() => void this.#loadConfig()}
                ?disabled=${this.status === 'loading' || this.status === 'saving'}
              >
                Reload
              </button>
              <button
                class="primary"
                type="button"
                @click=${this.#onRequestSave}
                ?disabled=${this.#saveDisabled()}
              >
                Review & save
              </button>
            </div>
          </header>

          ${this.errorMessage
            ? html`<div class="banner error">${this.errorMessage}</div>`
            : nothing}
          ${this.saveMessage && !this.errorMessage
            ? html`<div class="banner success">${this.saveMessage}</div>`
            : nothing}
          ${this.#renderBody(currentCamera)}
        </main>
      </div>

      <frigate-diff-modal
        .open=${this.diffOpen}
        .oldText=${this.originalYaml}
        .newText=${this.pendingYaml}
        .saving=${this.status === 'saving'}
        @fce-diff-cancel=${this.#onDiffCancel}
        @fce-diff-confirm=${() => void this.#onDiffConfirm()}
      ></frigate-diff-modal>
    `;
  }

  #headingForView(): string {
    if (this.view === 'raw') return 'Raw YAML';
    if (this.view === 'history') return 'History';
    if (this.view === 'record') return 'Record';
    if (this.view === 'objects') return 'Objects';
    if (this.view === 'motion') return 'Motion';
    if (this.view === 'go2rtc') return 'go2rtc';
    return this.selectedCamera || 'Select a camera';
  }

  #saveDisabled(): boolean {
    if (this.status === 'saving' || this.status === 'loading') return true;
    if (this.view === 'raw') return this.rawYaml === this.originalYaml;
    return !this.workingConfig;
  }

  #renderBody(currentCamera: CameraConfig | undefined) {
    if (this.status === 'loading') {
      return html`<div class="placeholder">Loading Frigate configuration…</div>`;
    }
    if (this.instances.length === 0) {
      return html`
        <div class="placeholder">
          No Frigate instances found via the Home Assistant integration. Install the Frigate
          integration first, or support for a manual URL will land in a future release.
        </div>
      `;
    }
    if (this.view === 'raw') {
      return html`
        <frigate-raw-yaml-editor
          .value=${this.rawYaml}
          @fce-yaml-change=${this.#onRawChange}
        ></frigate-raw-yaml-editor>
      `;
    }
    if (this.view === 'history') {
      return html`
        <frigate-history-panel
          .snapshots=${this.snapshots}
          @fce-history-restore=${this.#onHistoryRestore}
        ></frigate-history-panel>
      `;
    }
    if (this.view === 'record') {
      return html`
        <frigate-record-editor
          .record=${this.workingConfig?.record ?? {}}
          @fce-record-change=${this.#onRecordChange}
        ></frigate-record-editor>
      `;
    }
    if (this.view === 'objects') {
      return html`
        <frigate-objects-editor
          .objects=${this.workingConfig?.objects ?? {}}
          @fce-objects-change=${this.#onObjectsChange}
        ></frigate-objects-editor>
      `;
    }
    if (this.view === 'motion') {
      return html`
        <frigate-motion-editor
          .motion=${this.workingConfig?.motion ?? {}}
          @fce-motion-change=${this.#onMotionChange}
        ></frigate-motion-editor>
      `;
    }
    if (this.view === 'go2rtc') {
      return html`
        <frigate-go2rtc-editor
          .go2rtc=${this.workingConfig?.go2rtc ?? {}}
          @fce-go2rtc-change=${this.#onGo2RtcChange}
        ></frigate-go2rtc-editor>
      `;
    }
    if (!currentCamera) {
      return html`<div class="placeholder">
        Select a camera from the sidebar to start editing.
      </div>`;
    }
    return html`
      <frigate-camera-editor
        .cameraId=${this.selectedCamera}
        .camera=${currentCamera}
        @fce-camera-change=${this.#onCameraChange}
      ></frigate-camera-editor>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'frigate-config-editor': FrigateConfigEditor;
  }
}
