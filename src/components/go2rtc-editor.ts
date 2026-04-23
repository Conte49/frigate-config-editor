import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { themeVariables } from '../styles/theme.js';
import type { Go2RtcConfig } from '../types/frigate.js';

import './shared/form-section.js';

interface StreamRow {
  name: string;
  urls: string[];
}

/**
 * Editor for the `go2rtc` section. go2rtc streams are authored as
 * `name: url | [url1, url2]` pairs. For the MVP we expose the stream
 * name plus a list of URLs; everything else stays in the YAML.
 */
@customElement('frigate-go2rtc-editor')
export class FrigateGo2RtcEditor extends LitElement {
  @property({ attribute: false }) go2rtc: Go2RtcConfig = {};

  static override styles = [
    themeVariables,
    css`
      :host {
        display: block;
      }
      .streams {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .stream {
        border: 1px solid var(--fce-border);
        border-radius: var(--fce-radius);
        padding: 12px;
        background: var(--fce-surface);
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .stream-head {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 8px;
        align-items: center;
      }
      input {
        padding: 6px 10px;
        border: 1px solid var(--fce-border);
        border-radius: var(--fce-radius-sm);
        background: var(--fce-surface);
        color: var(--fce-text);
        font-family: inherit;
        font-size: 0.9rem;
        width: 100%;
      }
      .urls {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .url-row {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 8px;
      }
      button {
        font-family: inherit;
        font-size: 0.85rem;
        padding: 6px 10px;
        border-radius: var(--fce-radius-sm);
        border: 1px solid var(--fce-border);
        background: var(--fce-surface);
        color: var(--fce-text);
        cursor: pointer;
      }
      button.danger {
        color: var(--fce-danger);
        border-color: var(--fce-danger);
        background: transparent;
      }
      button.primary {
        background: var(--fce-accent);
        color: var(--fce-accent-text);
        border-color: transparent;
      }
    `,
  ];

  override render() {
    const rows = this.#readStreams();
    return html`
      <fce-form-section
        heading="Streams"
        description="Streams exposed by the built-in go2rtc server. One entry per source."
      >
        <div class="streams">
          ${rows.map(
            (row) => html`
              <div class="stream">
                <div class="stream-head">
                  <input
                    type="text"
                    .value=${row.name}
                    placeholder="Stream name"
                    @change=${(e: Event) =>
                      this.#renameStream(row.name, (e.target as HTMLInputElement).value)}
                  />
                  <button
                    class="danger"
                    type="button"
                    aria-label=${`Remove stream ${row.name}`}
                    @click=${() => this.#removeStream(row.name)}
                  >
                    Remove
                  </button>
                </div>
                <div class="urls">
                  ${row.urls.map(
                    (url, urlIndex) => html`
                      <div class="url-row">
                        <input
                          type="url"
                          .value=${url}
                          placeholder="rtsp://... or ffmpeg:..."
                          @change=${(e: Event) =>
                            this.#updateUrl(
                              row.name,
                              urlIndex,
                              (e.target as HTMLInputElement).value,
                            )}
                        />
                        <button
                          class="danger"
                          type="button"
                          @click=${() => this.#removeUrl(row.name, urlIndex)}
                        >
                          Remove URL
                        </button>
                      </div>
                    `,
                  )}
                  <button type="button" @click=${() => this.#addUrl(row.name)}>Add URL</button>
                </div>
              </div>
            `,
          )}
          <button class="primary" type="button" @click=${this.#addStream}>Add stream</button>
          ${rows.length === 0
            ? html`<p style="color: var(--fce-text-muted); font-size: 0.9rem;">
                No streams yet. Add one to expose it to Frigate and downstream clients.
              </p>`
            : ''}
        </div>
      </fce-form-section>
    `;
  }

  #readStreams(): StreamRow[] {
    const raw = this.go2rtc.streams ?? {};
    return Object.entries(raw).map(([name, value]) => ({
      name,
      urls: Array.isArray(value) ? value : [value],
    }));
  }

  #writeStreams(rows: StreamRow[]) {
    const streams: Record<string, string | string[]> = {};
    for (const row of rows) {
      if (!row.name) continue;
      if (row.urls.length === 1 && row.urls[0] !== undefined) {
        streams[row.name] = row.urls[0];
      } else {
        streams[row.name] = [...row.urls];
      }
    }
    this.#emit({ ...this.go2rtc, streams });
  }

  #addStream = () => {
    const rows = this.#readStreams();
    let idx = rows.length + 1;
    while (rows.some((r) => r.name === `stream_${idx}`)) idx += 1;
    rows.push({ name: `stream_${idx}`, urls: [''] });
    this.#writeStreams(rows);
  };

  #removeStream(name: string) {
    const rows = this.#readStreams().filter((r) => r.name !== name);
    this.#writeStreams(rows);
  }

  #renameStream(oldName: string, newName: string) {
    if (!newName || newName === oldName) return;
    const rows = this.#readStreams().map((r) => (r.name === oldName ? { ...r, name: newName } : r));
    this.#writeStreams(rows);
  }

  #addUrl(name: string) {
    const rows = this.#readStreams().map((r) =>
      r.name === name ? { ...r, urls: [...r.urls, ''] } : r,
    );
    this.#writeStreams(rows);
  }

  #removeUrl(name: string, urlIndex: number) {
    const rows = this.#readStreams().map((r) =>
      r.name === name ? { ...r, urls: r.urls.filter((_, i) => i !== urlIndex) } : r,
    );
    this.#writeStreams(rows);
  }

  #updateUrl(name: string, urlIndex: number, value: string) {
    const rows = this.#readStreams().map((r) => {
      if (r.name !== name) return r;
      const urls = [...r.urls];
      urls[urlIndex] = value;
      return { ...r, urls };
    });
    this.#writeStreams(rows);
  }

  #emit(next: Go2RtcConfig) {
    this.dispatchEvent(
      new CustomEvent('fce-go2rtc-change', {
        detail: { go2rtc: next },
        bubbles: true,
        composed: true,
      }),
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'frigate-go2rtc-editor': FrigateGo2RtcEditor;
  }
}
