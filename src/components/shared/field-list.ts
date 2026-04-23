import { LitElement, css, html, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { themeVariables } from '../../styles/theme.js';

/**
 * Generic dynamic list renderer. The parent supplies a `renderItem`
 * function that returns a Lit template for each entry; this component
 * adds the "add" / "remove" affordances and emits `fce-list-change`
 * when the array shape changes.
 */
@customElement('fce-field-list')
export class FceFieldList<T = unknown> extends LitElement {
  @property() label = '';
  @property() path = '';
  @property({ type: Array }) items: T[] = [];
  @property({ attribute: false }) renderItem: (item: T, index: number) => TemplateResult = () =>
    html``;
  @property({ attribute: false }) createItem: () => T = () => ({}) as T;
  @property() addLabel = 'Add item';
  @property() emptyLabel = 'No entries';

  static override styles = [
    themeVariables,
    css`
      .list {
        display: flex;
        flex-direction: column;
        gap: var(--fce-gap);
      }
      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }
      .title {
        font-size: 0.85rem;
        font-weight: 500;
        color: var(--fce-text);
      }
      .empty {
        color: var(--fce-text-muted);
        font-size: 0.85rem;
        font-style: italic;
        padding: 8px 0;
      }
      .row {
        border: 1px solid var(--fce-border);
        border-radius: var(--fce-radius);
        background: var(--fce-surface);
        padding: 12px;
        display: flex;
        gap: 8px;
        align-items: flex-start;
      }
      .row-body {
        flex: 1;
      }
      button {
        font-family: inherit;
        font-size: 0.85rem;
        border-radius: var(--fce-radius-sm);
        border: 1px solid var(--fce-border);
        background: var(--fce-surface);
        color: var(--fce-text);
        padding: 6px 10px;
        cursor: pointer;
      }
      button.primary {
        background: var(--fce-accent);
        color: var(--fce-accent-text);
        border-color: transparent;
      }
      button.danger {
        color: var(--fce-danger);
        border-color: var(--fce-danger);
        background: transparent;
      }
      button:hover {
        filter: brightness(0.95);
      }
    `,
  ];

  override render() {
    return html`
      <div class="list">
        <div class="header">
          <span class="title">${this.label}</span>
          <button class="primary" type="button" @click=${this.#addItem}>${this.addLabel}</button>
        </div>
        ${this.items.length === 0
          ? html`<div class="empty">${this.emptyLabel}</div>`
          : this.items.map(
              (item, index) => html`
                <div class="row">
                  <div class="row-body">${this.renderItem(item, index)}</div>
                  <button
                    class="danger"
                    type="button"
                    aria-label="Remove"
                    @click=${() => this.#removeItem(index)}
                  >
                    Remove
                  </button>
                </div>
              `,
            )}
      </div>
    `;
  }

  #addItem = () => {
    const next = [...this.items, this.createItem()];
    this.items = next;
    this.#emit(next);
  };

  #removeItem = (index: number) => {
    const next = this.items.filter((_, i) => i !== index);
    this.items = next;
    this.#emit(next);
  };

  #emit(items: T[]) {
    this.dispatchEvent(
      new CustomEvent('fce-list-change', {
        detail: { path: this.path, value: items },
        bubbles: true,
        composed: true,
      }),
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'fce-field-list': FceFieldList;
  }
}
