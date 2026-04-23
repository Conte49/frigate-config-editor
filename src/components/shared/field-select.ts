import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { formControlStyles, themeVariables } from '../../styles/theme.js';

export interface SelectOption {
  label: string;
  value: string;
}

@customElement('fce-field-select')
export class FceFieldSelect extends LitElement {
  @property() label = '';
  @property() description = '';
  @property() path = '';
  @property() value = '';
  @property({ type: Array }) options: SelectOption[] = [];
  @property({ type: Boolean }) required = false;
  @property() error = '';

  static override styles = [themeVariables, formControlStyles];

  override render() {
    return html`
      <label class="field">
        <span class="field-label ${this.required ? 'required' : ''}">${this.label}</span>
        <select
          class="control"
          .value=${this.value}
          aria-invalid=${this.error ? 'true' : 'false'}
          @change=${this.#onChange}
        >
          ${this.required ? '' : html`<option value=""></option>`}
          ${this.options.map(
            (opt) =>
              html`<option value=${opt.value} ?selected=${opt.value === this.value}>
                ${opt.label}
              </option>`,
          )}
        </select>
        ${this.description ? html`<span class="field-description">${this.description}</span>` : ''}
        ${this.error ? html`<span class="field-error">${this.error}</span>` : ''}
      </label>
    `;
  }

  #onChange = (event: Event) => {
    const input = event.target as HTMLSelectElement;
    this.value = input.value;
    this.dispatchEvent(
      new CustomEvent('fce-change', {
        detail: { path: this.path, value: input.value || undefined },
        bubbles: true,
        composed: true,
      }),
    );
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'fce-field-select': FceFieldSelect;
  }
}
