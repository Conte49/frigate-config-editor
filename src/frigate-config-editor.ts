import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import type { HomeAssistant, PanelInfo } from './types/home-assistant.js';

/**
 * Root component of the Frigate Config Editor panel.
 *
 * At this stage (M0) the component is a placeholder that only verifies the
 * wiring with Home Assistant: it renders a heading and confirms the panel
 * has received a `hass` object.
 */
@customElement('frigate-config-editor')
export class FrigateConfigEditor extends LitElement {
  @property({ attribute: false })
  hass?: HomeAssistant;

  @property({ attribute: false })
  panel?: PanelInfo;

  @property({ type: Boolean, reflect: true })
  narrow = false;

  static override styles = css`
    :host {
      display: block;
      height: 100%;
      background: var(--primary-background-color, #fafafa);
      color: var(--primary-text-color, #212121);
      font-family: var(--paper-font-body1_-_font-family, Roboto, sans-serif);
    }

    .container {
      max-width: 960px;
      margin: 0 auto;
      padding: 24px;
    }

    h1 {
      font-size: 1.5rem;
      font-weight: 500;
      margin: 0 0 8px;
    }

    .hint {
      color: var(--secondary-text-color, #727272);
      font-size: 0.95rem;
    }

    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      background: var(--warning-color, #ffa000);
      color: #fff;
      font-size: 0.75rem;
      font-weight: 500;
      margin-left: 8px;
      vertical-align: middle;
    }
  `;

  override render() {
    const hasHass = Boolean(this.hass);

    return html`
      <div class="container">
        <h1>
          Frigate Config Editor
          <span class="badge">pre-alpha</span>
        </h1>
        <p class="hint">
          Panel scaffolding ready. Home Assistant context:
          <strong>${hasHass ? 'connected' : 'not available'}</strong>.
        </p>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'frigate-config-editor': FrigateConfigEditor;
  }
}
