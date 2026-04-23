import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { formControlStyles, themeVariables } from '../../styles/theme.js';

/**
 * Single-line text field bound to a schema path. Emits a `fce-change`
 * custom event with `{ path, value }` when the user finishes editing.
 */
@customElement('fce-field-text')
export class FceFieldText extends LitElement {
  @property() label = '';
  @property() description = '';
  @property() path = '';
  @property() value = '';
  @property() placeholder = '';
  @property({ type: Boolean }) required = false;
  @property() error = '';
  @property() type: 'text' | 'url' | 'password' = 'text';

  static override styles = [themeVariables, formControlStyles];

  override render() {
    return html`
      <label class="field">
        <span class="field-label ${this.required ? 'required' : ''}">${this.label}</span>
        <input
          class="control"
          type=${this.type}
          .value=${this.value}
          placeholder=${this.placeholder}
          aria-invalid=${this.error ? 'true' : 'false'}
          @change=${this.#onChange}
          @input=${this.#onInput}
        />
        ${this.description ? html`<span class="field-description">${this.description}</span>` : ''}
        ${this.error ? html`<span class="field-error">${this.error}</span>` : ''}
      </label>
    `;
  }

  #onInput = (event: Event) => {
    const input = event.target as HTMLInputElement;
    this.value = input.value;
  };

  #onChange = (event: Event) => {
    const input = event.target as HTMLInputElement;
    this.dispatchEvent(
      new CustomEvent('fce-change', {
        detail: { path: this.path, value: input.value },
        bubbles: true,
        composed: true,
      }),
    );
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'fce-field-text': FceFieldText;
  }
}
