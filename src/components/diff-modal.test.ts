import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import './diff-modal.js';
import type { FrigateDiffModal } from './diff-modal.js';

describe('frigate-diff-modal', () => {
  let el: FrigateDiffModal;

  beforeEach(async () => {
    el = document.createElement('frigate-diff-modal');
    el.oldText = 'a\nb\nc';
    el.newText = 'a\nX\nc';
    el.open = true;
    document.body.appendChild(el);
    await el.updateComplete;
  });

  afterEach(() => {
    el.remove();
  });

  it('renders nothing when closed', async () => {
    el.open = false;
    await el.updateComplete;
    expect(el.shadowRoot?.querySelector('.dialog')).toBeNull();
  });

  it('renders diff stats for the pending changes', () => {
    const text = el.shadowRoot?.textContent ?? '';
    expect(text).toContain('+1');
    expect(text).toContain('-1');
  });

  it('emits fce-diff-confirm when the primary button is clicked', async () => {
    const events: Event[] = [];
    el.addEventListener('fce-diff-confirm', (e) => events.push(e));
    const confirm = el.shadowRoot?.querySelector('button.primary') as HTMLButtonElement;
    confirm.click();
    expect(events).toHaveLength(1);
  });

  it('emits fce-diff-cancel when pressing Escape', async () => {
    const events: Event[] = [];
    el.addEventListener('fce-diff-cancel', (e) => events.push(e));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(events).toHaveLength(1);
  });

  it('does not emit on Escape while saving', async () => {
    el.saving = true;
    await el.updateComplete;
    const events: Event[] = [];
    el.addEventListener('fce-diff-cancel', (e) => events.push(e));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(events).toHaveLength(0);
  });

  it('disables Save when there are no changes', async () => {
    el.oldText = 'same';
    el.newText = 'same';
    await el.updateComplete;
    const confirm = el.shadowRoot?.querySelector('button.primary') as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
  });
});
