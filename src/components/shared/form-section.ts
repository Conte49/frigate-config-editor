import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { themeVariables } from '../../styles/theme.js';

/**
 * Simple titled container used by every editor panel to keep visual
 * rhythm consistent. The optional `description` slot renders below the
 * title and is meant for a one-liner explaining the section.
 */
@customElement('fce-form-section')
export class FceFormSection extends LitElement {
  @property() heading = '';
  @property() description = '';

  static override styles = [
    themeVariables,
    css`
      :host {
        display: block;
        margin-bottom: 28px;
      }
      h3 {
        font-size: 1rem;
        font-weight: 500;
        margin: 0 0 4px;
      }
      p {
        margin: 0 0 12px;
        color: var(--fce-text-muted);
        font-size: 0.85rem;
      }
      .header {
        border-bottom: 1px solid var(--fce-border);
        padding-bottom: 8px;
        margin-bottom: 12px;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: var(--fce-gap);
      }
    `,
  ];

  override render() {
    return html`
      <div class="header">
        <h3>${this.heading}</h3>
        ${this.description ? html`<p>${this.description}</p>` : ''}
      </div>
      <slot></slot>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'fce-form-section': FceFormSection;
  }
}
