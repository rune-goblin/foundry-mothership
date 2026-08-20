// @vitest-environment jsdom
//
// The one item sheet that edits a list: its rows carry no `name`, so the writes are the
// component's own rather than Foundry's form handling. The e2e baseline shows the block empty.
import { describe, it, expect, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';

import { installFoundryFieldStubs } from '../scripts/model-schema.ts';

installFoundryFieldStubs();
(globalThis as any).game = { i18n: { localize: (key: string) => key } };

const Weapon = (await import('../module/ui/item/types/Weapon.svelte')).default;

const mounted: Array<Record<string, unknown>> = [];

afterEach(() => {
  while (mounted.length) unmount(mounted.pop()!);
  document.body.replaceChildren();
});

const system = (damageModes: unknown[] = []) => ({
  damage: '4d10',
  critDmg: '',
  antiArmor: false,
  range: 'close',
  ammoType: '',
  useAmmo: true,
  woundEffect: 'Gunshot',
  shots: 4,
  curShots: 4,
  shotsPerFire: 1,
  ammo: 0,
  damageModes,
});

function render(damageModes: unknown[] = []) {
  const update = vi.fn(async () => undefined);
  const stored = system(damageModes);
  const store = { document: { system: stored, update } };

  const target = document.createElement('div');
  document.body.append(target);
  mounted.push(mount(Weapon as never, { target, props: { system: stored, store } }) as never);
  flushSync();

  return { target, update };
}

const rows = (target: HTMLElement) => [...target.querySelectorAll('.damage-mode')];

describe('the weapon body’s damage modes', () => {
  it('shows one row per stored damage, label and formula', () => {
    const { target } = render([{ label: 'Long Range', formula: '1d10' }]);
    const inputs = rows(target)[0].querySelectorAll('input');

    expect(rows(target)).toHaveLength(1);
    expect([...inputs].map((input) => (input as HTMLInputElement).value)).toEqual(['Long Range', '1d10']);
  });

  it('offers the add control even when the weapon has none, and adds an empty row', () => {
    const { target, update } = render();

    expect(rows(target)).toHaveLength(0);
    target.querySelector<HTMLButtonElement>('.damage-mode-add')!.click();

    expect(update).toHaveBeenCalledWith({ 'system.damageModes': [{ label: '', formula: '' }] });
  });

  it('removes the row that was clicked, leaving the rest', () => {
    const { target, update } = render([
      { label: 'Long Range', formula: '1d10' },
      { label: 'Point Blank', formula: '5d10' },
    ]);

    rows(target)[0].querySelector<HTMLButtonElement>('.damage-mode-remove')!.click();

    expect(update).toHaveBeenCalledWith({ 'system.damageModes': [{ label: 'Point Blank', formula: '5d10' }] });
  });

  it('writes an edited field and leaves the other alone', () => {
    const { target, update } = render([{ label: 'Long Range', formula: '1d10' }]);
    const formula = rows(target)[0].querySelectorAll('input')[1] as HTMLInputElement;

    formula.value = '2d10';
    formula.dispatchEvent(new window.Event('change', { bubbles: true }));

    expect(update).toHaveBeenCalledWith({ 'system.damageModes': [{ label: 'Long Range', formula: '2d10' }] });
  });

  // Foundry submits the whole sheet on any change inside it, which would persist nothing here and
  // re-render the row out from under the edit.
  it('keeps its change event from reaching the form around it', () => {
    const { target } = render([{ label: 'Long Range', formula: '1d10' }]);
    const form = document.createElement('form');
    const onSubmitTrigger = vi.fn();
    form.addEventListener('change', onSubmitTrigger);
    form.append(target);

    const input = rows(target)[0].querySelector('input') as HTMLInputElement;
    input.dispatchEvent(new window.Event('change', { bubbles: true }));

    expect(onSubmitTrigger).not.toHaveBeenCalled();
  });

  // The design gallery mounts every item body from a plain system object, with no document.
  it('renders without a store, and writes nothing', () => {
    const target = document.createElement('div');
    document.body.append(target);
    mounted.push(
      mount(Weapon as never, {
        target,
        props: { system: system([{ label: 'Long Range', formula: '1d10' }]) },
      }) as never,
    );
    flushSync();

    expect(rows(target)).toHaveLength(1);
    expect(() => target.querySelector<HTMLButtonElement>('.damage-mode-add')!.click()).not.toThrow();
  });
});
