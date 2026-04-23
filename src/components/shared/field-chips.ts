import { LitElement, css, html } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';

import { themeVariables } from '../../styles/theme.js';

/**
 * Multi-value chip input. Bound to a list of strings; items are added
 * with Enter / comma and removed by clicking the "×" button.
 * Used for tag-like fields such as `objects.track` or camera masks.
 */
@customElement('fce-field-chips')
export class FceFieldChips extends LitElement {
  @property() label = '';
  @property() description = '';
  @property() path = '';
  @property() placeholder = 'Add entry and press Enter';
  @property({ type: Array }) items: string[] = [];

  @query('input') private input?: HTMLInputElement;

  static override styles = [
    themeVariables,
    css`
      :host {
        display: block;
      }
      .field {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-bottom: var(--fce-gap);
      }
      .label {
        font-size: 0.85rem;
        font-weight: 500;
        color: var(--fce-text);
      }
      .description {
        font-size: 0.75rem;
        color: var(--fce-text-muted);
      }
      .wrap {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        padding: 6px;
        border: 1px solid var(--fce-border);
        border-radius: var(--fce-radius-sm);
        background: var(--fce-surface);
      }
      .wrap:focus-within {
        border-color: var(--fce-accent);
        box-shadow: 0 0 0 3px rgba(3, 169, 244, 0.15);
      }
      .chip {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 3px 4px 3px 10px;
        border-radius: 999px;
        background: var(--fce-surface-muted);
        color: var(--fce-text);
        font-size: 0.8rem;
      }
      .chip button {
        all: unset;
        cursor: pointer;
        padding: 0 6px;
        border-radius: 999px;
        color: var(--fce-text-muted);
        font-size: 0.95rem;
        line-height: 1;
      }
      .chip button:hover {
        color: var(--fce-danger);
      }
      input {
        flex: 1;
        min-width: 120px;
        border: none;
        outline: none;
        background: transparent;
        color: var(--fce-text);
        font-family: inherit;
        font-size: 0.9rem;
        padding: 4px 6px;
      }
    `,
  ];

  override render() {
    return html`
      <div class="field">
        ${this.label ? html`<span class="label">${this.label}</span>` : ''}
        <div class="wrap" @click=${this.#focusInput}>
          ${this.items.map(
            (item, index) => html`
              <span class="chip">
                ${item}
                <button
                  type="button"
                  aria-label=${`Remove ${item}`}
                  @click=${() => this.#remove(index)}
                >
                  ×
                </button>
              </span>
            `,
          )}
          <input
            type="text"
            placeholder=${this.items.length === 0 ? this.placeholder : ''}
            @keydown=${this.#onKeyDown}
            @blur=${this.#commitPending}
          />
        </div>
        ${this.description ? html`<span class="description">${this.description}</span>` : ''}
      </div>
    `;
  }

  #focusInput = () => {
    this.input?.focus();
  };

  #onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      this.#commitPending();
      return;
    }
    if (event.key === 'Backspace') {
      const input = event.target as HTMLInputElement;
      if (input.value.length === 0 && this.items.length > 0) {
        event.preventDefault();
        this.#remove(this.items.length - 1);
      }
    }
  };

  #commitPending = () => {
    const input = this.input;
    if (!input) return;
    const trimmed = input.value.trim();
    if (!trimmed) return;
    input.value = '';
    const next = [...this.items, trimmed];
    this.#emit(next);
  };

  #remove(index: number) {
    const next = this.items.filter((_, i) => i !== index);
    this.#emit(next);
  }

  #emit(items: string[]) {
    this.items = items;
    this.dispatchEvent(
      new CustomEvent('fce-change', {
        detail: { path: this.path, value: items },
        bubbles: true,
        composed: true,
      }),
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'fce-field-chips': FceFieldChips;
  }
}
