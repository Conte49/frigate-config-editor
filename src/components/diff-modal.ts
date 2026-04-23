import { LitElement, css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { diffLines, diffStats, type DiffLine } from '../lib/diff.js';
import { themeVariables } from '../styles/theme.js';

/**
 * Full-screen dialog that renders a line-level diff between the
 * currently saved YAML and the pending one. The user can confirm or
 * cancel; the host component subscribes to the `fce-diff-confirm`
 * and `fce-diff-cancel` events.
 */
@customElement('frigate-diff-modal')
export class FrigateDiffModal extends LitElement {
  @property() heading = 'Review changes';
  @property() oldText = '';
  @property() newText = '';
  @property({ type: Boolean, reflect: true }) open = false;
  @property({ type: Boolean }) saving = false;

  static override styles = [
    themeVariables,
    css`
      :host {
        display: none;
      }
      :host([open]) {
        display: block;
      }
      .overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.4);
        display: flex;
        align-items: stretch;
        justify-content: center;
        z-index: 1000;
      }
      .dialog {
        margin: auto;
        background: var(--fce-surface);
        border-radius: var(--fce-radius);
        width: min(960px, 94vw);
        max-height: 88vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 16px 48px rgba(0, 0, 0, 0.25);
        overflow: hidden;
      }
      header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px;
        border-bottom: 1px solid var(--fce-border);
      }
      header h2 {
        margin: 0;
        font-size: 1.05rem;
        font-weight: 500;
      }
      .stats {
        display: flex;
        gap: 10px;
        font-size: 0.8rem;
      }
      .stats .added {
        color: var(--fce-success);
      }
      .stats .removed {
        color: var(--fce-danger);
      }
      pre {
        margin: 0;
        padding: 12px 0;
        overflow: auto;
        flex: 1;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 0.82rem;
        line-height: 1.45;
        background: var(--fce-surface-muted);
      }
      .line {
        display: grid;
        grid-template-columns: 56px 56px 1fr;
        column-gap: 8px;
        padding: 0 16px;
      }
      .line.added {
        background: color-mix(in srgb, var(--fce-success) 14%, transparent);
      }
      .line.removed {
        background: color-mix(in srgb, var(--fce-danger) 14%, transparent);
      }
      .gutter {
        color: var(--fce-text-muted);
        user-select: none;
        text-align: right;
      }
      footer {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        padding: 14px 20px;
        border-top: 1px solid var(--fce-border);
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
    `,
  ];

  override connectedCallback(): void {
    super.connectedCallback();
    this.#keyHandler = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && this.open && !this.saving) {
        event.preventDefault();
        this.#cancel();
      }
    };
    window.addEventListener('keydown', this.#keyHandler);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this.#keyHandler) window.removeEventListener('keydown', this.#keyHandler);
  }

  #keyHandler?: (event: KeyboardEvent) => void;

  override render() {
    if (!this.open) return nothing;
    const lines = diffLines(this.oldText, this.newText);
    const stats = diffStats(lines);

    return html`
      <div class="overlay" @click=${this.#onOverlay}>
        <div class="dialog" @click=${this.#stop}>
          <header>
            <h2>${this.heading}</h2>
            <div class="stats">
              <span class="added">+${stats.added}</span>
              <span class="removed">-${stats.removed}</span>
              <span>${stats.unchanged} unchanged</span>
            </div>
          </header>
          <pre>${lines.map((line) => this.#renderLine(line))}</pre>
          <footer>
            <button type="button" @click=${this.#cancel} ?disabled=${this.saving}>Cancel</button>
            <button
              class="primary"
              type="button"
              @click=${this.#confirm}
              ?disabled=${this.saving || stats.added + stats.removed === 0}
            >
              ${this.saving ? 'Saving…' : 'Save and restart'}
            </button>
          </footer>
        </div>
      </div>
    `;
  }

  #renderLine(line: DiffLine) {
    const prefix = line.status === 'added' ? '+' : line.status === 'removed' ? '-' : ' ';
    return html`
      <div class=${`line ${line.status}`}>
        <span class="gutter">${line.oldNumber ?? ''}</span>
        <span class="gutter">${line.newNumber ?? ''}</span>
        <span>${prefix} ${line.text}</span>
      </div>
    `;
  }

  #confirm = () => {
    this.dispatchEvent(new CustomEvent('fce-diff-confirm', { bubbles: true, composed: true }));
  };

  #cancel = () => {
    this.dispatchEvent(new CustomEvent('fce-diff-cancel', { bubbles: true, composed: true }));
  };

  #onOverlay = () => {
    if (!this.saving) this.#cancel();
  };

  #stop = (event: Event) => event.stopPropagation();
}

declare global {
  interface HTMLElementTagNameMap {
    'frigate-diff-modal': FrigateDiffModal;
  }
}
