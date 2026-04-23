import { beforeEach, describe, expect, it } from 'vitest';

import './history-panel.js';
import type { FrigateHistoryPanel } from './history-panel.js';

describe('frigate-history-panel', () => {
  let el: FrigateHistoryPanel;

  beforeEach(async () => {
    el = document.createElement('frigate-history-panel');
    document.body.appendChild(el);
    await el.updateComplete;
  });

  it('renders the empty state when no snapshots are present', () => {
    const text = el.shadowRoot?.textContent ?? '';
    expect(text).toContain('No history yet');
  });

  it('renders one row per snapshot with summary and Restore button', async () => {
    el.snapshots = [
      { id: '1', timestamp: Date.now(), instanceId: 'A', yaml: 'x', summary: 'first' },
      { id: '2', timestamp: Date.now() + 1, instanceId: 'A', yaml: 'y', summary: 'second' },
    ];
    await el.updateComplete;
    const rows = el.shadowRoot?.querySelectorAll('li') ?? [];
    expect(rows).toHaveLength(2);
    const restoreButtons = el.shadowRoot?.querySelectorAll('button') ?? [];
    expect(restoreButtons).toHaveLength(2);
  });

  it('emits fce-history-restore when the Restore button is clicked', async () => {
    const snapshot = {
      id: '1',
      timestamp: Date.now(),
      instanceId: 'A',
      yaml: 'hello',
      summary: 'once',
    };
    el.snapshots = [snapshot];
    await el.updateComplete;

    const events: Array<{ snapshot: typeof snapshot }> = [];
    el.addEventListener('fce-history-restore', (e) => events.push((e as CustomEvent).detail));
    const button = el.shadowRoot?.querySelector('button') as HTMLButtonElement;
    button.click();

    expect(events).toHaveLength(1);
    expect(events[0]?.snapshot.id).toBe('1');
  });
});
