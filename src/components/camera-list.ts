import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { themeVariables } from '../styles/theme.js';

@customElement('frigate-camera-list')
export class FrigateCameraList extends LitElement {
  @property({ type: Array }) cameras: string[] = [];
  @property() selected = '';

  static override styles = [
    themeVariables,
    css`
      :host {
        display: block;
      }
      ul {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      button {
        width: 100%;
        text-align: left;
        font-family: var(--fce-font);
        font-size: 0.9rem;
        background: transparent;
        border: 1px solid transparent;
        border-radius: var(--fce-radius-sm);
        padding: 8px 10px;
        color: var(--fce-text);
        cursor: pointer;
      }
      button:hover {
        background: var(--fce-surface-muted);
      }
      button.selected {
        background: var(--fce-accent);
        color: var(--fce-accent-text);
      }
      .empty {
        padding: 8px 0;
        color: var(--fce-text-muted);
        font-size: 0.85rem;
        font-style: italic;
      }
    `,
  ];

  override render() {
    if (this.cameras.length === 0) {
      return html`<div class="empty">No cameras configured.</div>`;
    }
    return html`
      <ul>
        ${this.cameras.map(
          (id) => html`
            <li>
              <button
                class=${id === this.selected ? 'selected' : ''}
                @click=${() => this.#select(id)}
              >
                ${id}
              </button>
            </li>
          `,
        )}
      </ul>
    `;
  }

  #select(id: string) {
    this.dispatchEvent(
      new CustomEvent('fce-camera-select', {
        detail: { id },
        bubbles: true,
        composed: true,
      }),
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'frigate-camera-list': FrigateCameraList;
  }
}
