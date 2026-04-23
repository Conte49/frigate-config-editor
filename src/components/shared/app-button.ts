import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { themeVariables } from '../../styles/theme.js';

/**
 * Small button wrapper that keeps the visual style consistent across
 * every view and provides accessible focus rings and disabled states.
 */
@customElement('fce-button')
export class FceButton extends LitElement {
  @property() variant: 'default' | 'primary' | 'danger' | 'ghost' = 'default';
  @property() size: 'sm' | 'md' = 'md';
  @property({ type: Boolean }) disabled = false;
  @property() type: 'button' | 'submit' = 'button';

  static override styles = [
    themeVariables,
    css`
      :host {
        display: inline-flex;
      }
      button {
        font-family: var(--fce-font);
        font-size: 0.9rem;
        padding: 8px 14px;
        border-radius: var(--fce-radius-sm);
        border: 1px solid var(--fce-border);
        background: var(--fce-surface);
        color: var(--fce-text);
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        transition:
          filter 120ms ease,
          box-shadow 120ms ease,
          background 120ms ease;
      }
      button.sm {
        padding: 6px 10px;
        font-size: 0.8rem;
      }
      button:hover:not([disabled]) {
        filter: brightness(0.97);
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
      button.danger {
        color: var(--fce-danger);
        border-color: var(--fce-danger);
        background: transparent;
      }
      button.ghost {
        background: transparent;
        border-color: transparent;
      }
      button.ghost:hover:not([disabled]) {
        background: var(--fce-surface-muted);
      }
      button[disabled] {
        opacity: 0.5;
        cursor: not-allowed;
      }
    `,
  ];

  override render() {
    return html`
      <button
        type=${this.type}
        class=${`${this.variant} ${this.size}`}
        ?disabled=${this.disabled}
        @click=${this.#relay}
      >
        <slot></slot>
      </button>
    `;
  }

  #relay = (event: MouseEvent) => {
    if (this.disabled) event.stopImmediatePropagation();
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'fce-button': FceButton;
  }
}
