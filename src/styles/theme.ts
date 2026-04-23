import { css } from 'lit';

/**
 * Shared CSS custom properties and helpers aligned with the Home
 * Assistant design tokens. Components should prefer these variables
 * over hard-coded colours so the panel follows the active HA theme
 * (light / dark / custom).
 */
export const themeVariables = css`
  :host {
    --fce-bg: var(--primary-background-color, #fafafa);
    --fce-surface: var(--card-background-color, #ffffff);
    --fce-surface-muted: var(--secondary-background-color, #f5f5f5);
    --fce-border: var(--divider-color, rgba(0, 0, 0, 0.12));
    --fce-text: var(--primary-text-color, #212121);
    --fce-text-muted: var(--secondary-text-color, #727272);
    --fce-accent: var(--primary-color, #03a9f4);
    --fce-accent-text: var(--text-primary-color, #ffffff);
    --fce-danger: var(--error-color, #db4437);
    --fce-warning: var(--warning-color, #ffa000);
    --fce-success: var(--success-color, #4caf50);
    --fce-radius: 8px;
    --fce-radius-sm: 4px;
    --fce-gap: 12px;
    --fce-font: var(--paper-font-body1_-_font-family, Roboto, -apple-system, sans-serif);
  }
`;

export const formControlStyles = css`
  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: var(--fce-gap);
  }

  .field-label {
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--fce-text);
  }

  .field-description {
    font-size: 0.75rem;
    color: var(--fce-text-muted);
  }

  .field-error {
    font-size: 0.75rem;
    color: var(--fce-danger);
  }

  .control {
    border: 1px solid var(--fce-border);
    border-radius: var(--fce-radius-sm);
    background: var(--fce-surface);
    color: var(--fce-text);
    padding: 8px 10px;
    font-size: 0.95rem;
    font-family: inherit;
    outline: none;
    transition:
      border-color 120ms ease,
      box-shadow 120ms ease;
  }

  .control:focus {
    border-color: var(--fce-accent);
    box-shadow: 0 0 0 3px rgba(3, 169, 244, 0.15);
  }

  .control[aria-invalid='true'] {
    border-color: var(--fce-danger);
  }

  .required::after {
    content: ' *';
    color: var(--fce-danger);
  }
`;
