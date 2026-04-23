import { LitElement, css, html } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';

import { themeVariables } from '../styles/theme.js';

/**
 * Lightweight raw YAML editor based on a textarea with line numbers.
 *
 * We deliberately avoid Monaco for the MVP: embedding it in a single-
 * file ES module for a Home Assistant custom panel requires bundling
 * web workers and a multi-megabyte asset tree, which conflicts with
 * the HACS packaging model. See ADR-008.
 *
 * The editor supports:
 * - live line numbers synced with wrap behaviour (gutter mirrors the
 *   textarea via shared line-height and scroll position);
 * - tab key inserts two spaces instead of focus-shifting;
 * - emits `fce-yaml-change` on each edit.
 */
@customElement('frigate-raw-yaml-editor')
export class FrigateRawYamlEditor extends LitElement {
  @property() value = '';
  @property() placeholder = 'Paste or edit the YAML configuration here.';
  @property({ type: Boolean }) readonly = false;

  @query('textarea') private textarea?: HTMLTextAreaElement;
  @query('.gutter') private gutter?: HTMLElement;

  static override styles = [
    themeVariables,
    css`
      :host {
        display: block;
        border: 1px solid var(--fce-border);
        border-radius: var(--fce-radius);
        background: var(--fce-surface);
        overflow: hidden;
      }
      .wrap {
        display: grid;
        grid-template-columns: 56px 1fr;
        align-items: stretch;
      }
      .gutter {
        background: var(--fce-surface-muted);
        color: var(--fce-text-muted);
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 0.82rem;
        line-height: 1.5;
        padding: 12px 10px 12px 0;
        text-align: right;
        user-select: none;
        overflow: hidden;
        white-space: pre;
      }
      textarea {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 0.82rem;
        line-height: 1.5;
        padding: 12px 14px;
        border: none;
        outline: none;
        resize: vertical;
        min-height: 340px;
        background: transparent;
        color: var(--fce-text);
        white-space: pre;
        tab-size: 2;
      }
      textarea:focus {
        background: var(--fce-surface);
      }
    `,
  ];

  override render() {
    const lines = (this.value.match(/\n/g)?.length ?? 0) + 1;
    const gutterContent = Array.from({ length: lines }, (_, i) => i + 1).join('\n');
    return html`
      <div class="wrap">
        <div class="gutter" aria-hidden="true">${gutterContent}</div>
        <textarea
          spellcheck="false"
          autocomplete="off"
          autocapitalize="off"
          autocorrect="off"
          ?readonly=${this.readonly}
          placeholder=${this.placeholder}
          .value=${this.value}
          @input=${this.#onInput}
          @scroll=${this.#syncScroll}
          @keydown=${this.#onKeyDown}
        ></textarea>
      </div>
    `;
  }

  #onInput = (event: Event) => {
    const ta = event.target as HTMLTextAreaElement;
    this.value = ta.value;
    this.dispatchEvent(
      new CustomEvent('fce-yaml-change', {
        detail: { value: ta.value },
        bubbles: true,
        composed: true,
      }),
    );
  };

  #syncScroll = () => {
    if (!this.textarea || !this.gutter) return;
    this.gutter.scrollTop = this.textarea.scrollTop;
  };

  #onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Tab' || event.metaKey || event.ctrlKey) return;
    event.preventDefault();
    const ta = event.target as HTMLTextAreaElement;
    const { selectionStart: start, selectionEnd: end, value } = ta;
    const indent = '  ';
    const next = `${value.slice(0, start)}${indent}${value.slice(end)}`;
    ta.value = next;
    ta.selectionStart = ta.selectionEnd = start + indent.length;
    this.value = next;
    this.dispatchEvent(
      new CustomEvent('fce-yaml-change', {
        detail: { value: next },
        bubbles: true,
        composed: true,
      }),
    );
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'frigate-raw-yaml-editor': FrigateRawYamlEditor;
  }
}
