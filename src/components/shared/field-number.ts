import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { formControlStyles, themeVariables } from '../../styles/theme.js';

@customElement('fce-field-number')
export class FceFieldNumber extends LitElement {
  @property() label = '';
  @property() description = '';
  @property() path = '';
  @property({ type: Number }) value: number | undefined;
  @property({ type: Number }) min: number | undefined;
  @property({ type: Number }) max: number | undefined;
  @property({ type: Number }) step = 1;
  @property({ type: Boolean }) required = false;
  @property() error = '';

  static override styles = [formControlStyles, themeVariables];

  override render() {
    return html`
      <label class="field">
        <span class="field-label ${this.required ? 'required' : ''}">${this.label}</span>
        <input
          class="control"
          type="number"
          .value=${this.value == null ? '' : String(this.value)}
          min=${this.min ?? ''}
          max=${this.max ?? ''}
          step=${this.step}
          aria-invalid=${this.error ? 'true' : 'false'}
          @change=${this.#onChange}
        />
        ${this.description ? html`<span class="field-description">${this.description}</span>` : ''}
        ${this.error ? html`<span class="field-error">${this.error}</span>` : ''}
      </label>
    `;
  }

  #onChange = (event: Event) => {
    const input = event.target as HTMLInputElement;
    const raw = input.value.trim();
    const parsed = raw === '' ? undefined : Number(raw);
    const value = parsed !== undefined && Number.isFinite(parsed) ? parsed : undefined;
    this.value = value;
    this.dispatchEvent(
      new CustomEvent('fce-change', {
        detail: { path: this.path, value },
        bubbles: true,
        composed: true,
      }),
    );
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'fce-field-number': FceFieldNumber;
  }
}
