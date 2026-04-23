import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { setAtPath } from '../lib/path-utils.js';
import { themeVariables } from '../styles/theme.js';
import type { ObjectsConfig } from '../types/frigate.js';

import './shared/field-chips.ts';
import './shared/field-number.js';
import './shared/form-section.js';

/**
 * Editor for the global `objects` section. Per-object filters are
 * listed as a table of (label, min_area, max_area, threshold).
 */
@customElement('frigate-objects-editor')
export class FrigateObjectsEditor extends LitElement {
  @property({ attribute: false }) objects: ObjectsConfig = {};

  static override styles = [
    themeVariables,
    css`
      :host {
        display: block;
      }
      .filters {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .filter-row {
        display: grid;
        grid-template-columns: minmax(160px, 1fr) repeat(3, minmax(120px, 1fr)) auto;
        gap: 8px;
        align-items: end;
        border: 1px solid var(--fce-border);
        border-radius: var(--fce-radius);
        padding: 12px;
        background: var(--fce-surface);
      }
      .filter-row label {
        display: flex;
        flex-direction: column;
        gap: 4px;
        font-size: 0.8rem;
        color: var(--fce-text-muted);
      }
      .filter-row input {
        padding: 6px 8px;
        border: 1px solid var(--fce-border);
        border-radius: var(--fce-radius-sm);
        background: var(--fce-surface);
        color: var(--fce-text);
        font-family: inherit;
        font-size: 0.9rem;
      }
      button.remove {
        align-self: stretch;
        border: 1px solid var(--fce-danger);
        color: var(--fce-danger);
        background: transparent;
        border-radius: var(--fce-radius-sm);
        cursor: pointer;
        font-size: 0.85rem;
        padding: 6px 10px;
      }
      button.add {
        align-self: flex-start;
        border: 1px solid var(--fce-border);
        background: var(--fce-surface);
        color: var(--fce-text);
        padding: 8px 14px;
        border-radius: var(--fce-radius-sm);
        cursor: pointer;
        font-size: 0.9rem;
      }
    `,
  ];

  override render() {
    const o = this.objects ?? {};
    const filters = Object.entries(o.filters ?? {});
    return html`
      <fce-form-section
        heading="Tracked objects"
        description="Object labels Frigate will track. Common values: person, car, dog, cat."
      >
        <fce-field-chips
          label="Track"
          path="track"
          placeholder="person, car, ..."
          .items=${o.track ?? []}
          @fce-change=${this.#onChange}
        ></fce-field-chips>
      </fce-form-section>

      <fce-form-section
        heading="Filters"
        description="Fine-tune detection per object label. Leave empty to keep Frigate defaults."
      >
        <div class="filters">
          ${filters.map(
            ([label, filter]) => html`
              <div class="filter-row">
                <label>
                  Label
                  <input
                    type="text"
                    .value=${label}
                    @change=${(e: Event) =>
                      this.#renameFilter(label, (e.target as HTMLInputElement).value)}
                  />
                </label>
                <label>
                  Min area
                  <input
                    type="number"
                    .value=${String(filter.min_area ?? '')}
                    @change=${(e: Event) =>
                      this.#patchFilter(label, 'min_area', this.#parseNumber(e))}
                  />
                </label>
                <label>
                  Max area
                  <input
                    type="number"
                    .value=${String(filter.max_area ?? '')}
                    @change=${(e: Event) =>
                      this.#patchFilter(label, 'max_area', this.#parseNumber(e))}
                  />
                </label>
                <label>
                  Threshold
                  <input
                    type="number"
                    step="0.01"
                    .value=${String(filter.threshold ?? '')}
                    @change=${(e: Event) =>
                      this.#patchFilter(label, 'threshold', this.#parseNumber(e))}
                  />
                </label>
                <button
                  class="remove"
                  type="button"
                  @click=${() => this.#removeFilter(label)}
                  aria-label=${`Remove filter for ${label}`}
                >
                  Remove
                </button>
              </div>
            `,
          )}
          <button class="add" type="button" @click=${this.#addFilter}>Add filter</button>
        </div>
      </fce-form-section>
    `;
  }

  #onChange = (event: CustomEvent<{ path: string; value: unknown }>) => {
    this.#emit(setAtPath(this.objects, event.detail.path, event.detail.value));
  };

  #patchFilter(label: string, key: string, value: unknown) {
    this.#emit(setAtPath(this.objects, `filters.${label}.${key}`, value));
  }

  #renameFilter(oldLabel: string, newLabel: string) {
    if (!newLabel || newLabel === oldLabel) return;
    const filters = { ...(this.objects.filters ?? {}) };
    const entry = filters[oldLabel];
    delete filters[oldLabel];
    filters[newLabel] = entry ?? {};
    this.#emit({ ...this.objects, filters });
  }

  #removeFilter(label: string) {
    const filters = { ...(this.objects.filters ?? {}) };
    delete filters[label];
    this.#emit({ ...this.objects, filters });
  }

  #addFilter = () => {
    const filters = { ...(this.objects.filters ?? {}) };
    let idx = 1;
    while (`new_${idx}` in filters) idx += 1;
    filters[`new_${idx}`] = {};
    this.#emit({ ...this.objects, filters });
  };

  #parseNumber(event: Event): number | undefined {
    const value = (event.target as HTMLInputElement).value.trim();
    if (!value) return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  #emit(next: ObjectsConfig) {
    this.dispatchEvent(
      new CustomEvent('fce-objects-change', {
        detail: { objects: next },
        bubbles: true,
        composed: true,
      }),
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'frigate-objects-editor': FrigateObjectsEditor;
  }
}
