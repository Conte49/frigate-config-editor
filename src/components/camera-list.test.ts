import { beforeEach, describe, expect, it } from 'vitest';

import './camera-list.js';
import type { FrigateCameraList } from './camera-list.js';

describe('frigate-camera-list', () => {
  let el: FrigateCameraList;

  beforeEach(async () => {
    el = document.createElement('frigate-camera-list');
    document.body.appendChild(el);
    await el.updateComplete;
  });

  it('renders a placeholder when the list is empty', () => {
    const text = el.shadowRoot?.textContent ?? '';
    expect(text).toContain('No cameras configured');
  });

  it('marks the selected camera as active', async () => {
    el.cameras = ['ingresso', 'garage'];
    el.selected = 'garage';
    await el.updateComplete;
    const buttons = Array.from(el.shadowRoot?.querySelectorAll('button') ?? []);
    const activeLabels = buttons
      .filter((b) => b.classList.contains('selected'))
      .map((b) => b.textContent?.trim());
    expect(activeLabels).toEqual(['garage']);
  });

  it('emits fce-camera-select with the clicked id', async () => {
    el.cameras = ['alpha', 'beta'];
    await el.updateComplete;

    const events: Array<{ id: string }> = [];
    el.addEventListener('fce-camera-select', (e) => events.push((e as CustomEvent).detail));

    const betaButton = Array.from(el.shadowRoot?.querySelectorAll('button') ?? []).find(
      (b) => b.textContent?.trim() === 'beta',
    ) as HTMLButtonElement;
    betaButton.click();

    expect(events).toEqual([{ id: 'beta' }]);
  });
});
