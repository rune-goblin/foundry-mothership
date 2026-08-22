// @vitest-environment jsdom
//
// The card is a popover, which jsdom has no implementation of; `is-open` is the class the
// component paints it with, so the state it drives is assertable here and the top layer is not.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount, unmount, flushSync, type Component } from 'svelte';

import SkillSelector from '../module/ui/generator/SkillSelector.svelte';

// en.json nests some keys and spells others out dotted, so it is flattened rather than walked.
function flatten(value: unknown, prefix = '', into = new Map<string, string>()): Map<string, string> {
  if (typeof value === 'string') into.set(prefix, value);
  else for (const [key, child] of Object.entries(value as object)) flatten(child, prefix ? `${prefix}.${key}` : key, into);
  return into;
}

const en = flatten(JSON.parse(readFileSync(join(import.meta.dirname, '../lang/en.json'), 'utf8')));
const english = (key: string): string => en.get(key) ?? key;

(globalThis as any).game = {
  i18n: {
    localize: english,
    format: (key: string, data: Record<string, string>) =>
      english(key).replace(/\{(\w+)\}/g, (whole, name) => data?.[name] ?? whole),
  },
};

const mounted: Array<Record<string, unknown>> = [];

afterEach(() => {
  while (mounted.length) unmount(mounted.pop()!);
  document.body.replaceChildren();
});

const SKILLS = [
  { uuid: 'botany', name: 'Botany', rank: 'Trained', summary: 'The study of plants.', prerequisites: [], state: 'picked', reason: null },
  { uuid: 'geology', name: 'Geology', rank: 'Trained', summary: 'The study of rock.', prerequisites: [], state: 'available', reason: null },
  { uuid: 'ecology', name: 'Ecology', rank: 'Expert', summary: 'The study of organisms and how they relate to their environment.', prerequisites: ['botany', 'geology'], state: 'available', reason: null },
  { uuid: 'planetology', name: 'Planetology', rank: 'Master', summary: 'The study of planets.', prerequisites: ['ecology'], state: 'unavailable', reason: 'gated' },
];

const PICKS = [
  { key: 'set:Trained', set: 'set', rank: 'Trained', gated: false, chosen: 'botany', name: 'Botany' },
  { key: 'set:Expert', set: 'set', rank: 'Expert', gated: true, chosen: null, name: null },
  { key: 'set:Master', set: 'set', rank: 'Master', gated: true, chosen: null, name: null },
];

const render = (props: Record<string, unknown>) => {
  const target = document.createElement('div');
  document.body.append(target);
  mounted.push(mount(SkillSelector as Component<any>, { target, props }) as Record<string, unknown>);
  flushSync();
  return target;
};

const selector = (props: Record<string, unknown> = {}) =>
  render({ skills: SKILLS, budget: { Trained: 0, Expert: 1, Master: 1 }, picks: PICKS, onchoose: vi.fn(), ...props });

const hover = (node: Element) => {
  node.dispatchEvent(new window.MouseEvent('mouseenter'));
  flushSync();
};

const texts = (root: Element, css: string) =>
  [...root.querySelectorAll(css)].map((node) => node.textContent!.trim());

describe('the picks a class promised', () => {
  it('says the rank it wants until something fills it', () => {
    const el = selector();

    expect(texts(el, '.skill-selector-pick-rank')).toEqual(['Trained', 'Expert', 'Master']);
    expect(texts(el, '.skill-selector-pick-name')).toEqual(['Botany', 'Choose one', 'Choose one']);
  });

  it('frees a filled pick, and offers nothing to click on an empty one', () => {
    const onchoose = vi.fn();
    const el = selector({ onchoose });
    const [filled, empty] = [...el.querySelectorAll<HTMLElement>('.skill-selector-pick')];

    empty.click();
    expect(onchoose).not.toHaveBeenCalled();

    filled.click();
    expect(onchoose).toHaveBeenCalledWith('botany');
  });

  it('prints nothing at all for a draft with no picks to make', () => {
    expect(selector({ picks: [] }).querySelector('.skill-selector-picks')).toBeNull();
  });
});

describe("the hovered skill's card", () => {
  it('carries the description and both routes, and leaves the name to the row', () => {
    const el = selector();
    const card = el.querySelector('.skill-selector-card')!;
    expect(card.classList.contains('is-open')).toBe(false);

    hover(el.querySelector('[data-skill="ecology"]')!);

    expect(card.classList.contains('is-open')).toBe(true);
    expect(card.textContent).toContain('The study of organisms');
    expect(card.textContent).not.toContain('Ecology');
    expect(texts(card, '.skill-selector-chip')).toEqual(['Botany', 'Geology', 'Planetology']);
    // Botany is held and Geology is not, and the card inks the difference.
    expect(texts(card, '.skill-selector-chip.met')).toEqual(['Botany', 'Planetology']);
  });

  it('says why a skill is out of reach, which greying it out alone does not', () => {
    const el = selector({
      skills: SKILLS.map((skill) =>
        skill.uuid === 'geology' ? { ...skill, state: 'unavailable', reason: 'spent' } : skill),
    });

    hover(el.querySelector('[data-skill="geology"]')!);

    expect(el.querySelector('.skill-selector-note')!.textContent).toContain('No Trained picks left');
  });
});
