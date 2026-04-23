import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { formControlStyles, themeVariables } from '../../styles/theme.js';

@customElement('fce-field-boolean')
export class FceFieldBoolean extends LitElement {
  @property() label = '';
  @property() description = '';
  @property() path = '';
  @property({ type: Boolean }) value = false;

  static override styles = [
    themeVariables,
    formControlStyles,
    css`
      .row {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 4px 0;
      }
      input[type='checkbox'] {
        width: 18px;
        height: 18px;
        accent-color: var(--fce-accent);
      }
    `,
  ];

  override render() {
    return html`
      <div class="field">
        <label class="row">
          <input type="checkbox" .checked=${this.value} @change=${this.#onChange} />
          <span class="field-label">${this.label}</span>
        </label>
        ${this.description ? html`<span class="field-description">${this.description}</span>` : ''}
      </div>
    `;
  }

  #onChange = (event: Event) => {
    const input = event.target as HTMLInputElement;
    this.value = input.checked;
    this.dispatchEvent(
      new CustomEvent('fce-change', {
        detail: { path: this.path, value: input.checked },
        bubbles: true,
        composed: true,
      }),
    );
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'fce-field-boolean': FceFieldBoolean;
  }
}
