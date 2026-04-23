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
  @property({ type: Boolean, reflect: true, attribute: 'sidebar-open' }) private sidebarVisible =
    false;

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
  #saveMessageTimer: ReturnType<typeof setTimeout> | undefined;

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
        grid-template-columns: 260px minmax(0, 1fr);
        height: 100%;
        position: relative;
      }
      aside {
        border-right: 1px solid var(--fce-border);
        padding: 16px;
        background: var(--fce-surface);
        overflow-y: auto;
      }
      main {
        padding: 20px 32px 40px;
        overflow-y: auto;
        min-width: 0;
      }
      header.page {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 20px;
        position: sticky;
        top: 0;
        background: var(--fce-bg);
        padding: 10px 0;
        z-index: 2;
      }
      .page-title {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
      }
      .page-title h1 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 500;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .page-title small {
        color: var(--fce-text-muted);
        font-size: 0.75rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      h2 {
        margin: 20px 0 8px;
        font-size: 0.72rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.08em;
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
        flex-shrink: 0;
      }
      .nav {
        display: flex;
        flex-direction: column;
        gap: 2px;
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
      .nav-btn:focus-visible {
        outline: none;
        box-shadow: 0 0 0 3px rgba(3, 169, 244, 0.35);
      }
      .nav-btn.active {
        background: var(--fce-accent);
        color: var(--fce-accent-text);
      }
      .aside-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 8px;
      }
      .aside-header h1 {
        margin: 0;
        font-size: 1.1rem;
        font-weight: 600;
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
      button:focus-visible {
        outline: none;
        box-shadow: 0 0 0 3px rgba(3, 169, 244, 0.35);
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
      .icon-btn {
        display: none;
        width: 40px;
        height: 40px;
        padding: 0;
        justify-content: center;
        align-items: center;
      }
      .banner {
        padding: 12px 14px;
        border-radius: var(--fce-radius);
        margin-bottom: 16px;
        display: flex;
        gap: 10px;
        align-items: flex-start;
        animation: slide-in 180ms ease;
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

      .scrim {
        display: none;
      }

      @keyframes slide-in {
        from {
          opacity: 0;
          transform: translateY(-4px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      /* --- Responsive: below 860px sidebar slides in as a drawer --- */
      @media (max-width: 860px) {
        .shell {
          grid-template-columns: minmax(0, 1fr);
        }
        aside {
          position: fixed;
          inset: 0 auto 0 0;
          width: 280px;
          max-width: 80vw;
          transform: translateX(-100%);
          transition: transform 220ms ease;
          z-index: 100;
          box-shadow: 0 0 24px rgba(0, 0, 0, 0.25);
        }
        :host([sidebar-open]) aside {
          transform: translateX(0);
        }
        :host([sidebar-open]) .scrim {
          display: block;
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.35);
          z-index: 50;
        }
        main {
          padding: 16px 16px 24px;
        }
        .icon-btn {
          display: inline-flex;
        }
        .page-title h1 {
          font-size: 1.05rem;
        }
        header.page {
          padding: 8px 0;
        }
      }
      @media (max-width: 560px) {
        .toolbar {
          width: 100%;
          justify-content: flex-end;
        }
        header.page {
          flex-wrap: wrap;
        }
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

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this.#saveMessageTimer) clearTimeout(this.#saveMessageTimer);
  }

  #scheduleSaveMessageDismiss(): void {
    if (this.#saveMessageTimer) clearTimeout(this.#saveMessageTimer);
    this.#saveMessageTimer = setTimeout(() => {
      this.saveMessage = '';
    }, 6_000);
  }

  #closeSidebar = () => {
    this.sidebarVisible = false;
  };

  #toggleSidebar = () => {
    this.sidebarVisible = !this.sidebarVisible;
  };

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
      this.#scheduleSaveMessageDismiss();
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
      this.#scheduleSaveMessageDismiss();
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
    this.view = 'cameras';
    this.sidebarVisible = false;
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
    this.sidebarVisible = false;
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
          <div class="aside-header">
            <h1>Frigate</h1>
            ${this.frigateVersion
              ? html`<span class="instance-pill">v${this.frigateVersion}</span>`
              : nothing}
          </div>

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
            <button
              class="icon-btn"
              type="button"
              aria-label="Toggle navigation"
              aria-expanded=${this.sidebarVisible}
              @click=${this.#toggleSidebar}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div class="page-title">
              <h1>${this.#headingForView()}</h1>
              ${this.currentInstance
                ? html`<small
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
            ? html`<div class="banner error" role="alert">${this.errorMessage}</div>`
            : nothing}
          ${this.saveMessage && !this.errorMessage
            ? html`<div class="banner success" role="status">${this.saveMessage}</div>`
            : nothing}
          ${this.#renderBody(currentCamera)}
        </main>
        <div class="scrim" @click=${this.#closeSidebar} aria-hidden="true"></div>
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
