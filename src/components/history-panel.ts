import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import type { ConfigSnapshot } from '../lib/history-store.js';
import { themeVariables } from '../styles/theme.js';

@customElement('frigate-history-panel')
export class FrigateHistoryPanel extends LitElement {
  @property({ type: Array }) snapshots: ConfigSnapshot[] = [];
  @property() selectedId = '';

  static override styles = [
    themeVariables,
    css`
      :host {
        display: block;
        font-family: var(--fce-font);
        color: var(--fce-text);
      }
      ul {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      li {
        padding: 10px 12px;
        border: 1px solid var(--fce-border);
        border-radius: var(--fce-radius-sm);
        background: var(--fce-surface);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      li.selected {
        border-color: var(--fce-accent);
        box-shadow: 0 0 0 3px rgba(3, 169, 244, 0.15);
      }
      .meta {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .timestamp {
        font-size: 0.8rem;
        color: var(--fce-text-muted);
      }
      .summary {
        font-size: 0.9rem;
      }
      .empty {
        color: var(--fce-text-muted);
        font-size: 0.85rem;
        font-style: italic;
        padding: 16px 0;
      }
      button {
        font-family: inherit;
        font-size: 0.8rem;
        padding: 6px 10px;
        border-radius: var(--fce-radius-sm);
        border: 1px solid var(--fce-border);
        background: var(--fce-surface);
        color: var(--fce-text);
        cursor: pointer;
      }
      button:hover {
        filter: brightness(0.97);
      }
    `,
  ];

  override render() {
    if (this.snapshots.length === 0) {
      return html`<div class="empty">No history yet. Every successful save is recorded here.</div>`;
    }
    return html`
      <ul>
        ${this.snapshots.map(
          (s) => html`
            <li class=${s.id === this.selectedId ? 'selected' : ''}>
              <div class="meta">
                <span class="summary">${s.summary}</span>
                <span class="timestamp">${this.#formatTimestamp(s.timestamp)}</span>
              </div>
              <button type="button" @click=${() => this.#onRestore(s)}>Restore</button>
            </li>
          `,
        )}
      </ul>
    `;
  }

  #formatTimestamp(ts: number): string {
    try {
      return new Date(ts).toLocaleString();
    } catch {
      return String(ts);
    }
  }

  #onRestore(snapshot: ConfigSnapshot) {
    this.dispatchEvent(
      new CustomEvent('fce-history-restore', {
        detail: { snapshot },
        bubbles: true,
        composed: true,
      }),
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'frigate-history-panel': FrigateHistoryPanel;
  }
}
