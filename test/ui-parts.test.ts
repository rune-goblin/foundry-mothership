// @vitest-environment jsdom
//
// The shared primitives emit global class names from the hand-authored css/mothership.css
// rather than owning their styling, so each class asserted below is a stylesheet contract the
// compiler cannot check — rename one in a component and the sheet silently loses its styling.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync, createRawSnippet, type Component } from 'svelte';

import ItemList from '../module/ui/parts/ItemList.svelte';
import ItemRow from '../module/ui/parts/ItemRow.svelte';
import ItemImage from '../module/ui/parts/ItemImage.svelte';
import ItemDisclosure from '../module/ui/parts/ItemDisclosure.svelte';
import ItemCell from '../module/ui/parts/ItemCell.svelte';
import ItemControl from '../module/ui/parts/ItemControl.svelte';
import Tabs from '../module/ui/parts/Tabs.svelte';
import TabPanel from '../module/ui/parts/TabPanel.svelte';
import CircleStats from '../module/ui/parts/CircleStats.svelte';
import Field from '../module/ui/parts/Field.svelte';
import MainStat from '../module/ui/parts/MainStat.svelte';
import MinMaxField from '../module/ui/parts/MinMaxField.svelte';
import PipTrack from '../module/ui/parts/PipTrack.svelte';
import Stepper from '../module/ui/parts/Stepper.svelte';
import RollableStat from '../module/ui/parts/RollableStat.svelte';
import RollDie from '../module/ui/parts/RollDie.svelte';
import RollButton from '../module/ui/parts/RollButton.svelte';
import ArmorBar from '../module/ui/parts/ArmorBar.svelte';
import ArmorBlock from '../module/ui/parts/sections/ArmorBlock.svelte';
import StatModifier from '../module/ui/parts/StatModifier.svelte';
import HealthBlock from '../module/ui/parts/sections/HealthBlock.svelte';
import ItemPanel from '../module/ui/parts/sections/ItemPanel.svelte';
import { onActivate } from '../module/ui/parts/activate.js';
import { dropTarget } from '../module/ui/parts/drop-target.js';

// i18n.ts reads game.i18n, which jsdom has no reason to provide -- echo the key back. `format`
// resolves the real English instead, because an echoed key carries no {placeholder} to fill.
const en = JSON.parse(readFileSync(join(import.meta.dirname, '../lang/en.json'), 'utf8'));
const english = (key: string): string =>
  key.split('.').reduce((node, step) => node?.[step], en) ?? key;

(globalThis as any).game = {
  i18n: {
    localize: (key: string) => key,
    format: (key: string, data: Record<string, string>) =>
      english(key).replace(/\{(\w+)\}/g, (whole, name) => data?.[name] ?? whole),
  },
};

const mounted: Array<Record<string, unknown>> = [];

afterEach(() => {
  while (mounted.length) unmount(mounted.pop()!);
  document.body.replaceChildren();
});

const render = (component: Component<any>, props: Record<string, unknown> = {}) => {
  const target = document.createElement('div');
  document.body.append(target);
  mounted.push(mount(component, { target, props }) as Record<string, unknown>);
  flushSync();
  return target;
};

const text = (content: string) =>
  createRawSnippet(() => ({ render: () => `<span>${content}</span>` }));

const press = (node: Element, key: string) =>
  node.dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true }));

// Svelte stamps a svelte-<hash> class on styled elements; strip it before asserting the exact set.
const classes = (node: Element) => [...node.classList].filter((c) => !c.startsWith('svelte-'));

describe('ItemList', () => {
  it('is the ol the stylesheet targets', () => {
    const el = render(ItemList, { children: text('x'), style: 'margin-bottom: 10px;' })
      .firstElementChild!;
    expect(el.tagName).toBe('OL');
    expect(classes(el)).toEqual(['items-list']);
    expect(el.getAttribute('style')).toBe('margin-bottom: 10px;');
  });
});

describe('ItemRow', () => {
  it('a header row is not draggable and carries no item id', () => {
    const el = render(ItemRow, { children: text('x'), header: true }).firstElementChild!;
    expect(el.tagName).toBe('LI');
    expect(classes(el)).toEqual(['item', 'flexrow', 'item-header']);
    expect(el.hasAttribute('draggable')).toBe(false);
    expect(el.hasAttribute('data-item-id')).toBe(false);
  });

  it('an item row is draggable by the selector ActorSheetV2 drags from', () => {
    const el = render(ItemRow, { children: text('x'), itemId: 'abc123' }).firstElementChild!;
    expect(classes(el)).toEqual(['item', 'flexrow', 'draggable']);
    expect(el.getAttribute('draggable')).toBe('true');
    expect(el.getAttribute('data-item-id')).toBe('abc123');
  });

  it('keeps its id but offers no drag when the list only receives drops', () => {
    // The skill sheet's prerequisites are a DocumentSheetV2 with no dragstart handler, so a
    // draggable row would offer a drag nothing listens for.
    const el = render(ItemRow, {
      children: text('x'),
      itemId: 'Item.abc',
      draggable: false,
    }).firstElementChild!;
    expect(classes(el)).toEqual(['item', 'flexrow']);
    expect(el.hasAttribute('draggable')).toBe(false);
    expect(el.getAttribute('data-item-id')).toBe('Item.abc');
  });

  it('applies an attachment when one is passed, and copes when none is', () => {
    // The class sheet's choose_skill_or options each receive drops on their own row.
    const attached: Element[] = [];
    const el = render(ItemRow, {
      children: text('x'),
      itemId: 0,
      draggable: false,
      attach: (node: Element) => void attached.push(node),
    }).firstElementChild!;

    expect(attached).toEqual([el]);
    expect(() => render(ItemRow, { children: text('x') })).not.toThrow();
  });
});

describe('MainStat', () => {
  it('is the label bar plus circle input the stat blocks are built from', () => {
    const wrapper = render(MainStat, {
      name: 'system.base_adjustment.combat',
      value: 10,
      label: 'Combat',
      key: 'combat',
    }).firstElementChild!;

    expect(classes(wrapper)).toEqual(['mainstatwrapper']);
    const stat = wrapper.firstElementChild!;
    expect(classes(stat)).toEqual(['resource', 'mainstat']);

    const span = stat.querySelector('.mainstatlabel span')!;
    expect(span.className).toBe('mainstattext');
    expect((span as HTMLElement).dataset).toMatchObject({ key: 'combat', label: 'Combat' });
    expect(span.textContent).toBe('Combat');

    const input = stat.querySelector('input')!;
    expect(classes(input)).toEqual(['circle-input']);
    expect(input.getAttribute('name')).toBe('system.base_adjustment.combat');
    expect(input.getAttribute('type')).toBe('text');
    expect(input.getAttribute('data-dtype')).toBe('Number');
    expect(input.value).toBe('10');
  });

  it('rolls from its label, and the die on the black pill is solid', () => {
    const label = render(MainStat, {
      label: 'Combat',
      key: 'combat',
      name: 'system.stats.combat.value',
      value: 30,
      onroll: vi.fn(),
    }).querySelector('.mainstatlabel span')!;

    expect(classes(label)).toContain('stat-roll');
    expect(classes(label.querySelector('i')!)).toContain('is-solid');
  });

  it('renders a checked box for a boolean stat', () => {
    const input = render(MainStat, {
      name: 'system.robotic',
      type: 'checkbox',
      checked: true,
      dtype: 'Boolean',
      label: 'Robotic',
      key: 'robotic',
    }).querySelector('input')!;

    expect(classes(input)).toEqual(['circle-input']);
    expect(input.type).toBe('checkbox');
    expect(input.checked).toBe(true);
    expect(input.getAttribute('data-dtype')).toBe('Boolean');
  });

  // RollBox swaps a clickable die for the rolled value, so the generator drives the circle itself.
  it('lets a caller replace the circle', () => {
    const wrapper = render(MainStat, {
      label: 'Strength',
      key: 'strength',
      control: text('die'),
    }).firstElementChild!;

    expect(classes(wrapper)).toEqual(['mainstatwrapper']);
    expect(wrapper.querySelector('.resource.mainstat')!.textContent).toContain('die');
    expect(wrapper.querySelector('input')).toBeNull();
  });

  // The modifier sits inside the label pill rather than orbiting the circle as a second, smaller
  // one. The sign is the caller's glyph so a negative modifier can print its own.
  it('hangs a modifier on the right end of the pill', () => {
    const wrapper = render(MainStat, {
      label: 'Body',
      key: 'body',
      name: 'system.stats.body.value',
      value: 40,
      modifier: text('+5'),
    }).firstElementChild!;

    // On the circle, not in the pill: the pill ends with its die, as every other stat's does.
    const slot = wrapper.querySelector('.circle-slot')!;
    expect(slot.textContent).toContain('+5');
    expect(wrapper.querySelector('.mainstatlabel')!.textContent).not.toContain('+5');
    expect(wrapper.querySelector('.circle-input')).not.toBeNull();
  });

  // The number the player rolls under, once the modifier is in. It covers the circle's face and
  // carries no name, so a form harvest can never write the total back over the base.
  it('shows an adjusted value over the circle, leaving the stored base in the input', () => {
    const wrapper = render(MainStat, {
      label: 'Body',
      key: 'body',
      name: 'system.stats.body.value',
      value: 40,
      adjusted: 45,
    }).firstElementChild!;

    const input = wrapper.querySelector('.circle-input') as HTMLInputElement;
    const shown = wrapper.querySelector('.circle-adjusted')!;

    expect(input.value).toBe('40');
    expect(input.name).toBe('system.stats.body.value');
    expect(shown.textContent).toBe('45');
    expect(shown.hasAttribute('name')).toBe(false);
  });

  it('leaves the circle bare when nothing adjusts it', () => {
    const wrapper = render(MainStat, {
      label: 'Body',
      key: 'body',
      name: 'system.stats.body.value',
      value: 40,
    }).firstElementChild!;

    expect(wrapper.querySelector('.circle-adjusted')).toBeNull();
  });

  // The character sheet's four stats are clicked to roll them, so the caption becomes a
  // RollableStat wearing MainStat's own pill class.
  it('makes the caption rollable when given a handler', () => {
    const rolled: string[] = [];
    const span = render(MainStat, {
      label: 'Strength',
      key: 'strength',
      onroll: () => rolled.push('strength'),
    }).querySelector('.mainstatlabel span')!;

    expect(classes(span)).toEqual([
      'ability-mod',
      'stat-roll',
      'rollable',
      'mainstattext',
    ]);
    expect((span as HTMLElement).dataset).toMatchObject({ key: 'strength', label: 'Strength' });

    (span as HTMLElement).click();
    press(span, 'Enter');
    expect(rolled).toEqual(['strength', 'strength']);
  });

  // The generator's patch, trinket and loadout rows sit straight in a grid column; wrapping them
  // in .mainstatwrapper would flex them to 95% width.
  it('drops the wrapper on request, and takes an extra label class', () => {
    const stat = render(MainStat, {
      label: 'Skills',
      key: 'skills',
      labelClass: 'fulllabel',
      wrapper: false,
    }).firstElementChild!;

    expect(classes(stat)).toEqual(['resource', 'mainstat']);
    expect(classes(stat.querySelector('div')!)).toEqual(['fulllabel', 'mainstatlabel']);
  });
});

describe('ItemImage', () => {
  it('renders the 24px thumbnail when given a source', () => {
    const el = render(ItemImage, { src: 'icons/svg/item.svg', title: 'Wrench' })
      .firstElementChild!;
    const img = el.querySelector('img')!;
    expect(img.getAttribute('src')).toBe('icons/svg/item.svg');
    expect(img.getAttribute('alt')).toBe('Wrench');
    expect([img.getAttribute('width'), img.getAttribute('height')]).toEqual(['24', '24']);
  });

  it('stays an empty spacer cell without one', () => {
    const el = render(ItemImage, {}).firstElementChild!;
    expect(el.children).toHaveLength(0);
  });
});

describe('ItemDisclosure', () => {
  it('is an empty spacer without a handler, so a header still lines up with its rows', () => {
    const el = render(ItemDisclosure, {}).firstElementChild!;
    expect(classes(el)).toEqual(['item-disclosure']);
    expect(el.children).toHaveLength(0);
  });

  it('is a labelled button reporting whether it is open', () => {
    const onclick = vi.fn();
    const el = render(ItemDisclosure, { onclick, label: 'Show Description' }).firstElementChild!;
    const toggle = el.querySelector('a')!;

    expect(classes(toggle)).toEqual(['item-disclosure-toggle']);
    expect(toggle.getAttribute('role')).toBe('button');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(toggle.getAttribute('aria-label')).toBe('Show Description');
    expect(classes(toggle.querySelector('i')!)).toEqual(['fas', 'fa-chevron-right']);

    press(toggle, 'Enter');
    (toggle as HTMLElement).click();
    expect(onclick).toHaveBeenCalledTimes(2);
  });

  it('marks the open state on the toggle, which is what turns the chevron', () => {
    const el = render(ItemDisclosure, { onclick: () => {}, open: true }).firstElementChild!;
    const toggle = el.querySelector('a')!;
    expect(classes(toggle)).toEqual(['item-disclosure-toggle', 'is-open']);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
  });
});

describe('ItemCell', () => {
  it('is a plain skill-stat with no tab stop when it has no handler', () => {
    const el = render(ItemCell, { children: text('9'), grow: 2.5 }).firstElementChild!;
    expect(classes(el)).toContain('skill-stat');
    expect(el.getAttribute('style')).toBe('flex-grow: 2.5;');
    expect(el.hasAttribute('role')).toBe(false);
    expect(el.hasAttribute('tabindex')).toBe(false);
  });

  it('becomes a keyboard-reachable button when it does', () => {
    const onclick = vi.fn();
    const el = render(ItemCell, { children: text('9'), class: 'armor-ap list-roll', onclick })
      .firstElementChild!;
    expect(classes(el)).toEqual(['skill-stat', 'armor-ap', 'list-roll']);
    expect(el.getAttribute('role')).toBe('button');
    expect(el.getAttribute('tabindex')).toBe('0');

    (el as HTMLElement).click();
    press(el, 'Enter');
    press(el, 'Escape');
    expect(onclick).toHaveBeenCalledTimes(2);
  });

  it('is the black name pill on request, and wears the roll hover cue', () => {
    const el = render(ItemCell, { children: text('Wrench'), variant: 'name', roll: true })
      .firstElementChild!;
    expect(classes(el)).toEqual(['skill-name', 'list-roll']);
  });

  // The badge the skill, weapon and attack rows all wear: the name reads from the pill's left
  // edge and the die rides its right, so no call site hand-writes a die of its own.
  it('lays a badge out as name then die, and prints the die solid on the black pill', () => {
    const el = render(ItemCell, { children: text('Talons'), variant: 'name', die: true, roll: true })
      .firstElementChild!;

    expect(classes(el)).toEqual(['skill-name', 'list-roll', 'has-die']);
    const [label, die] = Array.from(el.children);
    expect(label.textContent).toBe('Talons');
    expect(classes(label)).toContain('cell-label');
    expect(classes(die)).toContain('is-solid');
  });

  // A stat cell is printed on paper, where a solid die shouts over the number beside it.
  it('mutes a badge die outside the pill', () => {
    const el = render(ItemCell, { children: text('2d10'), die: true, roll: true }).firstElementChild!;

    expect(classes(el)).toEqual(['skill-stat', 'list-roll', 'has-die']);
    expect(classes(el.children[1])).not.toContain('is-solid');
  });

  // The +/- cells: left click adds, right click removes. Enter is the left click's twin; a
  // right click has none, so the key handler must not fire it twice.
  it('takes a right-click handler beside the left one', () => {
    const onclick = vi.fn();
    const oncontextmenu = vi.fn();
    const el = render(ItemCell, { children: text('3'), onclick, oncontextmenu }).firstElementChild!;

    (el as HTMLElement).click();
    el.dispatchEvent(new window.MouseEvent('contextmenu', { bubbles: true }));
    press(el, 'Enter');

    expect(onclick).toHaveBeenCalledTimes(2);
    expect(oncontextmenu).toHaveBeenCalledTimes(1);
  });
});

describe('Field', () => {
  it('is the caption plus the wrapped text input the item sheets repeat', () => {
    const el = render(Field, {
      name: 'system.damage',
      label: 'Damage',
      value: '2d10',
      wrapper: 'text',
      width: '180px',
    }).firstElementChild!;

    expect(classes(el)).toEqual(['resource', 'healthspread', 'minmaxtopstat', 'flex-center']);
    expect(el.querySelector('label')!.className).toBe('resource-label minmaxtext');

    const wrapper = el.querySelector('.textvaluewrapper')! as HTMLElement;
    expect(wrapper.style.width).toBe('180px');
    const input = wrapper.querySelector('input')!;
    expect(classes(input)).toEqual(['textvaluewrapper-input', 'darkGreyText']);
    expect([input.getAttribute('name'), input.value]).toEqual(['system.damage', '2d10']);
  });

  // An enumerated field is picked, not typed: free text would be discarded by validation on load.
  it('becomes a select when given choices, with the stored one selected', () => {
    const el = render(Field, {
      name: 'system.range',
      label: 'Range',
      value: 'long',
      wrapper: 'text',
      choices: [
        { value: '', label: '' },
        { value: 'close', label: 'Close' },
        { value: 'long', label: 'Long' },
      ],
    }).firstElementChild!;

    const select = el.querySelector('select')!;
    // The class is the input's, so the enum reads as the field it replaced.
    expect(classes(select)).toEqual(['textvaluewrapper-input', 'darkGreyText']);
    expect(select.getAttribute('name')).toBe('system.range');
    expect(el.querySelector('input')).toBeNull();
    expect([...select.options].map((o) => o.value)).toEqual(['', 'close', 'long']);
    expect(select.value).toBe('long');
  });
});

describe('MinMaxField', () => {
  it('is the label, the two inputs either side of the slant, and their captions', () => {
    const el = render(MinMaxField, {
      label: 'Health',
      name: 'system.health.value',
      value: 7,
      rightName: 'system.health.max',
      rightValue: 10,
      leftLabel: 'Current',
      rightLabel: 'Maximum',
    }).firstElementChild!;

    expect([...el.classList]).toEqual(['resource', 'healthspread', 'minmaxtopstat']);

    const caption = el.querySelector('label')!;
    expect([...caption.classList]).toEqual(['resource-label', 'minmaxtext']);
    expect(caption.hasAttribute('role')).toBe(false);
    expect(caption.querySelector('i')).toBeNull();

    const wrapper = el.querySelector('.minmaxwrapper')!;
    const [left, right] = [...wrapper.querySelectorAll('input')];
    expect(left.className).toBe('maxhealth-input darkGreyText');
    expect([left.getAttribute('name'), left.value]).toEqual(['system.health.value', '7']);
    expect([right.getAttribute('name'), right.value]).toEqual(['system.health.max', '10']);
    expect(wrapper.querySelector('.slant')).not.toBeNull();

    expect([...el.querySelectorAll('.healthmaxtext')].map((n) => n.textContent)).toEqual([
      'Current',
      'Maximum',
    ]);
  });

  it('a rollable caption activates, and takes the class that names the roll', () => {
    const onroll = vi.fn();
    const caption = render(MinMaxField, {
      label: 'Stress',
      labelClass: 'rollable stress-roll',
      onroll,
    }).querySelector('label')!;

    expect([...caption.classList]).toEqual([
      'resource-label',
      'minmaxtext',
      'rollable',
      'stress-roll',
    ]);
    expect(caption.querySelector('i.fa-dice-d20')).not.toBeNull();
    caption.click();
    press(caption, ' ');
    expect(onroll).toHaveBeenCalledTimes(2);
  });
});

describe('RollableStat', () => {
  it('is the .rollable label, keyed and activatable', () => {
    const onroll = vi.fn();
    const el = render(RollableStat, {
      label: 'Combat',
      key: 'combat',
      class: 'creaturestat',
      onroll,
    }).firstElementChild!;

    expect(el.tagName).toBe('SPAN');
    expect(classes(el)).toEqual([
      'ability-mod',
      'stat-roll',
      'rollable',
      'creaturestat',
    ]);
    expect((el as HTMLElement).dataset).toMatchObject({ key: 'combat', label: 'Combat' });
    expect(el.textContent!.trim()).toBe('Combat');
    // The cue follows the word, and adds nothing a screen reader has to read.
    expect(classes(el.querySelector('i')!)).toContain('fa-dice-d20');

    (el as HTMLElement).click();
    press(el, 'Enter');
    expect(onroll).toHaveBeenCalledTimes(2);
  });

  it('hands the die its tone and its scale', () => {
    const die = render(RollableStat, {
      label: 'Sanity',
      key: 'sanity',
      dieTone: 'solid',
      dieScale: 1,
    }).querySelector('i') as HTMLElement;

    expect(classes(die)).toContain('is-solid');
    expect(die.style.getPropertyValue('--rolldie-scale')).toBe('1');
  });
});

describe('RollDie', () => {
  it('is a decorative die glyph', () => {
    const el = render(RollDie).firstElementChild!;

    expect(el.tagName).toBe('I');
    expect(classes(el)).toEqual(expect.arrayContaining(['fas', 'fa-dice-d20', 'roll-die']));
    expect(el.getAttribute('aria-hidden')).toBe('true');
    expect(el.textContent).toBe('');
  });

  // The muted grey silts up on a black ground, so the pill asks for the solid tone.
  it('takes a solid tone for labels printed on black', () => {
    expect(classes(render(RollDie, { tone: 'solid' }).firstElementChild!)).toContain('is-solid');
    expect(classes(render(RollDie).firstElementChild!)).not.toContain('is-solid');
  });

  // One number, because the rise divides by the same scale to stay on the label's centre.
  it('takes a scale from the caller, and carries none of its own without one', () => {
    const scaled = render(RollDie, { scale: 1 }).firstElementChild as HTMLElement;

    expect(scaled.style.getPropertyValue('--rolldie-scale')).toBe('1');
    expect((render(RollDie).firstElementChild as HTMLElement).getAttribute('style')).toBeNull();
  });
});

describe('RollButton', () => {
  // The generator's e2e specs click `img[data-roll="<key>"]`, and the pane swaps the button for
  // a `circle-input` once the value lands — so both classes and the hook are the contract.
  it('is a keyboard-answering die that fills a number circle', () => {
    const onroll = vi.fn();
    const el = render(RollButton, { key: 'health', title: 'Health', onroll })
      .firstElementChild as HTMLImageElement;

    expect(el.tagName).toBe('IMG');
    expect(classes(el)).toEqual(['roll-button', 'circle-input']);
    expect(el.dataset.roll).toBe('health');
    expect(el.title).toBe('Health');
    expect(el.getAttribute('role')).toBe('button');

    el.click();
    press(el, 'Enter');
    expect(onroll).toHaveBeenCalledTimes(2);
  });

  it('carries no title when the caller gives it none', () => {
    const el = render(RollButton, { key: 'credits' }).firstElementChild!;

    expect(el.hasAttribute('title')).toBe(false);
  });
});

describe('PipTrack', () => {
  // The track carries its own row, so the pips are its children rather than the caller's.
  it('fills the first `value` pips and leaves the rest empty', () => {
    const target = render(PipTrack, { count: 3, value: 1 });

    expect([...target.querySelector('.pip-track')!.children].map((n) => classes(n).join(' '))).toEqual([
      'fas fa-circle',
      'far fa-circle',
      'far fa-circle',
    ]);
  });
});

describe('Stepper', () => {
  const parts = (target: Element) => [...target.querySelector('.stepper')!.children];

  it('puts a minus and a plus on either side of the count', () => {
    const target = render(Stepper, { value: 7, label: 'Clips', onstep: () => {} });

    expect(parts(target).map((node) => node.tagName)).toEqual(['BUTTON', 'SPAN', 'BUTTON']);
    expect(parts(target).map((node) => node.querySelector('i')?.className ?? node.textContent)).toEqual([
      'fas fa-minus',
      '7',
      'fas fa-plus',
    ]);
  });

  // The control has no visible words, so the title is the only thing that names what it counts.
  it('names what it steps in both titles', () => {
    const [less, , more] = parts(render(Stepper, { value: 7, label: 'Clips', onstep: () => {} }));

    expect(less.getAttribute('title')).toBe('Decrease Clips');
    expect(less.getAttribute('aria-label')).toBe('Decrease Clips');
    expect(more.getAttribute('title')).toBe('Increase Clips');
  });

  it('hands the delta to onstep', () => {
    const onstep = vi.fn();
    const [less, , more] = parts(render(Stepper, { value: 7, label: 'Clips', onstep }));

    (less as HTMLElement).click();
    (more as HTMLElement).click();
    expect(onstep.mock.calls).toEqual([[-1], [1]]);
  });

  // A form submit would re-render the sheet mid-step; type="button" is what stops it.
  it('steps without submitting the sheet', () => {
    const [less] = parts(render(Stepper, { value: 7, label: 'Clips', onstep: () => {} }));

    expect(less.getAttribute('type')).toBe('button');
  });

  it('switches off the button that would pass the bound', () => {
    const floor = parts(render(Stepper, { value: 0, label: 'Clips', min: 0, onstep: () => {} }));
    expect([floor[0], floor[2]].map((node) => (node as HTMLButtonElement).disabled)).toEqual([true, false]);

    const ceiling = parts(render(Stepper, { value: 6, label: 'Shots', max: 6, onstep: () => {} }));
    expect([ceiling[0], ceiling[2]].map((node) => (node as HTMLButtonElement).disabled)).toEqual([false, true]);
  });

  it('steps freely when no bound is given', () => {
    const unbounded = parts(render(Stepper, { value: 0, label: 'Clips', onstep: () => {} }));

    expect([unbounded[0], unbounded[2]].map((node) => (node as HTMLButtonElement).disabled)).toEqual([
      false,
      false,
    ]);
  });
});

describe('ItemControl', () => {
  it('a control is an href-less anchor with a Font Awesome glyph', () => {
    const onclick = vi.fn();
    const el = render(ItemControl, {
      icon: 'plus',
      title: 'Create Item',
      label: 'Add',
      class: 'item-create',
      onclick,
      'data-type': 'item',
    }).firstElementChild!;

    expect(el.tagName).toBe('A');
    expect([...el.classList]).toEqual(['item-control', 'item-create']);
    // AppV1 rendered a bare <a>; an href would make Foundry treat it as a navigable link.
    expect(el.hasAttribute('href')).toBe(false);
    expect(el.getAttribute('title')).toBe('Create Item');
    expect(el.getAttribute('data-type')).toBe('item');
    expect(el.querySelector('i')!.className).toBe('fas fa-plus');
    // The templates render "<i/> Add" -- losing the space runs the glyph into the label.
    expect(el.textContent).toBe(' Add');

    (el as HTMLElement).click();
    press(el, ' ');
    expect(onclick).toHaveBeenCalledTimes(2);
  });

  it('an icon-only control renders no label text', () => {
    const el = render(ItemControl, { icon: 'trash', onclick: () => {} }).firstElementChild!;
    expect(el.textContent).toBe('');
    expect(el.querySelector('i')!.className).toBe('fas fa-trash');
  });
});

describe('Tabs', () => {
  const tabs = [
    { id: 'description', label: 'Description' },
    { id: 'skills.prerequisite', label: 'Prerequisites' },
  ];

  it('renders the nav and the a.tab-select[data-tab] the e2e specs click', () => {
    const el = render(Tabs, { tabs, active: 'description' }).firstElementChild!;
    expect(el.tagName).toBe('NAV');
    expect(el.getAttribute('data-group')).toBe('primary');

    const links = [...el.querySelectorAll('a.tab-select')];
    expect(links.map((a) => a.getAttribute('data-tab'))).toEqual([
      'description',
      'skills.prerequisite',
    ]);
    expect(links[0].classList.contains('active')).toBe(true);
    expect(links[0].getAttribute('aria-selected')).toBe('true');
    expect(links[1].classList.contains('active')).toBe(false);
  });

  it('moves the active class on click and on keyboard activation', () => {
    const el = render(Tabs, { tabs, active: 'description' }).firstElementChild!;
    const links = [...el.querySelectorAll('a.tab-select')] as HTMLElement[];

    links[1].click();
    flushSync();
    expect(links[1].classList.contains('active')).toBe(true);
    expect(links[0].classList.contains('active')).toBe(false);

    press(links[0], 'Enter');
    flushSync();
    expect(links[0].classList.contains('active')).toBe(true);
  });
});

describe('TabPanel', () => {
  it('renders only the active panel', () => {
    const target = render(TabPanel, { children: text('body'), tab: 'ranges', active: 'ranges' });
    const el = target.firstElementChild!;
    expect([...el.classList]).toEqual(['tab', 'active']);
    expect(el.getAttribute('data-tab')).toBe('ranges');
    expect(el.getAttribute('data-group')).toBe('primary');

    expect(
      render(TabPanel, { children: text('body'), tab: 'ranges', active: 'description' }).children,
    ).toHaveLength(0);
  });

  it('applies an attachment when one is passed, and copes when none is', () => {
    const attached: Element[] = [];
    const el = render(TabPanel, {
      children: text('body'),
      tab: 'drop',
      active: 'drop',
      class: 'items',
      attach: (node: Element) => void attached.push(node),
    }).firstElementChild!;

    expect([...el.classList]).toEqual(['tab', 'items', 'active']);
    expect(attached).toEqual([el]);

    // `{@attach undefined}` must be inert -- every panel that is not a drop zone passes nothing.
    expect(() => render(TabPanel, { children: text('x'), tab: 'a', active: 'a' })).not.toThrow();
  });
});

describe('CircleStats', () => {
  it.each([
    ['', 'circle-statwrapper'],
    ['horizontal', 'circle-statwrapper-horizontal'],
    ['vertical', 'circle-statwrapper-vertical'],
  ])('variant %o selects .%s', (variant, expected) => {
    const el = render(CircleStats, { children: text('x'), variant }).firstElementChild!;
    expect([...el.classList]).toContain(expected);
  });
});

describe('ItemPanel', () => {
  const items = [
    { id: 'aaa', name: 'Wrench', description: '<p>Turns things.</p>' },
    { id: 'bbb', name: 'Crowbar' },
  ];
  const row = createRawSnippet((item: () => { name: string }) => ({
    render: () => `<div class="skill-name">${item().name}</div>`,
  }));

  const panel = (onclick = () => {}) =>
    render(ItemPanel, {
      headers: [{ label: 'Mothership.ItemName', grow: 1.5 }, { label: 'Mothership.Quantity' }],
      items,
      row,
      create: { title: 'Mothership.CreateItem', onclick },
      style: 'margin-bottom: 10px;',
    }).firstElementChild!;

  it('is a header row of captions plus one identified row per item', () => {
    const list = panel();
    expect(classes(list)).toEqual(['items-list']);
    expect(list.getAttribute('style')).toBe('margin-bottom: 10px;');

    const [header, ...rows] = [...list.children];
    expect(classes(header)).toEqual(['item', 'flexrow', 'item-header']);
    expect([...header.querySelectorAll('.skill-stat')].map((n) => n.textContent!.trim())).toEqual([
      'Mothership.ItemName',
      'Mothership.Quantity',
    ]);
    expect(header.querySelector('.skill-stat')!.getAttribute('style')).toBe('flex-grow: 1.5;');
    // The spacer under the disclosure column keeps the header's cells aligned with the rows'.
    expect(header.querySelector('.item-disclosure')!.children).toHaveLength(0);

    expect(rows.map((r) => r.getAttribute('data-item-id'))).toEqual(['aaa', 'bbb']);
    expect(rows.map((r) => r.getAttribute('draggable'))).toEqual(['true', 'true']);
    expect(rows.map((r) => r.textContent!.trim())).toEqual(['Wrench', 'Crowbar']);
  });

  it('opens one row\'s description under it and closes it again', () => {
    const list = panel();
    const chevron = list.querySelector<HTMLElement>('li[data-item-id="aaa"] .item-disclosure a')!;

    expect(list.querySelector('.item-description')).toBeNull();

    chevron.click();
    flushSync();
    const shown = list.querySelector('.item-description')!;
    expect(shown.innerHTML).toBe('<p>Turns things.</p>');
    expect(shown.previousElementSibling!.getAttribute('data-item-id')).toBe('aaa');

    chevron.click();
    flushSync();
    expect(list.querySelector('.item-description')).toBeNull();
  });

  it('offers no chevron for an item with nothing to say', () => {
    const list = panel();
    expect(list.querySelector('li[data-item-id="bbb"] .item-disclosure')!.children).toHaveLength(0);
  });

  it('the create control is the header row\'s only item-control', () => {
    const onclick = vi.fn();
    const controls = [...panel(onclick).querySelectorAll('.item-controls a.item-control')];

    expect(controls).toHaveLength(1);
    expect(controls[0].getAttribute('title')).toBe('Mothership.CreateItem');
    expect(controls[0].querySelector('i')!.className).toBe('fas fa-plus');
    expect(controls[0].textContent).toBe(' Mothership.Add');

    (controls[0] as HTMLElement).click();
    expect(onclick).toHaveBeenCalledOnce();
  });
});

describe('HealthBlock', () => {
  it('is the health and wounds pair, in that order', () => {
    const target = render(HealthBlock, {
      health: { value: 7, max: 10 },
      hits: { value: 1, max: 2 },
    });

    expect([...target.querySelectorAll('input')].map((i) => i.getAttribute('name'))).toEqual([
      'system.health.value',
      'system.health.max',
      'system.hits.value',
      'system.hits.max',
    ]);
    expect([...target.querySelectorAll('label')].map((l) => l.textContent!.trim())).toEqual([
      'Mothership.Health',
      'Mothership.Wounds',
    ]);
  });
});

describe('StatModifier', () => {
  const badge = (value: number) =>
    render(StatModifier, { name: 'system.stats.body.mod', value, label: 'Body' })
      .firstElementChild!;

  it.each([
    [0, []],
    [9, ['is-up']],
    [-10, ['is-down']],
  ])('reads %s as the tone that fills it', (value, expected) => {
    expect(classes(badge(value)).filter((c) => c !== 'stat-modifier')).toEqual(expected);
  });

  it('carries the stored modifier under the schema path', () => {
    const field = badge(9).querySelector('input') as HTMLInputElement;

    expect(field.name).toBe('system.stats.body.mod');
    expect(field.value).toBe('9');
    expect(field.getAttribute('data-dtype')).toBe('Number');
  });

  // Without this it stays open under a pointer that never left it.
  it('shuts on Enter until the pointer leaves', () => {
    const el = badge(0);
    const field = el.querySelector('input')!;

    field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    flushSync();
    expect(classes(el)).toContain('is-dismissed');

    el.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }));
    flushSync();
    expect(classes(el)).not.toContain('is-dismissed');
  });
});

describe('ArmorBlock', () => {
  const block = (armor: Record<string, unknown>, oncover = (_key: string) => {}) =>
    render(ArmorBlock, { armor, oncover }).firstElementChild!;

  it('reads out the derived points and reduction', () => {
    const el = block({ mod: 4, damageReduction: 2, cover: 'none' });

    expect([...el.querySelectorAll('.whiteText')].map((n) => n.textContent)).toEqual(['4', '2']);
    // The worn row never carries the borrowed numbers now; they have a row of their own.
    expect(el.querySelector('.highlightText')).toBeNull();
    // Without a write path the points are a reading, not a field.
    expect(el.querySelector('input')).toBeNull();
  });

  // A horror wears nothing, so `mod` is always nought for one: given the path, the cell becomes
  // the field that sets `value`, and the character sheet passing no path stays read-only.
  it('turns the points into a field for the caller that hands it a write path', () => {
    const el = render(ArmorBlock, {
      armor: { value: 5, mod: 0, damageReduction: 0, cover: 'none' },
      onchoose: () => {},
      name: 'system.stats.armor.value',
    }).firstElementChild!;

    const field = el.querySelector('input')!;
    expect(field.getAttribute('name')).toBe('system.stats.armor.value');
    expect(field.value).toBe('5');
    expect(field.dataset.dtype).toBe('Number');
    // The reduction beside it stays derived either way.
    expect(el.querySelectorAll('input')).toHaveLength(1);
  });

  // The block used to carry a die on its caption; the only thing it can do is name the cover.
  it('names the cover on the chip that opens the menu, and nothing here rolls', () => {
    const el = block({ mod: 4, damageReduction: 2, cover: 'heavy' });

    const chip = el.querySelector('.cover-choice')!;
    expect(chip.textContent!.trim()).toBe('Mothership.HeavyCover');
    expect(el.querySelector('i.fa-dice-d20')).toBeNull();
    // Closed until asked: the four options are not in the document yet.
    expect(el.querySelector('[role="listbox"]')).toBeNull();
  });

  // The prompt it used to open lived a window away and asked the same four-way question; the
  // menu answers it in place, and each row carries what the cover looks like and what it is worth.
  it('opens a menu of every cover, each with its examples and its bonuses', () => {
    const el = block({ mod: 4, damageReduction: 2, cover: 'light' });
    (el.querySelector('.cover-choice') as HTMLElement).click();
    flushSync();

    const options = [...el.querySelectorAll('.cover-option')];
    expect(options.map((o) => o.querySelector('.cover-option-name')!.textContent)).toEqual([
      'Mothership.NoCover',
      'Mothership.InsignificantCover',
      'Mothership.LightCover',
      'Mothership.HeavyCover',
    ]);
    expect(options[3].querySelector('.cover-option-detail')!.textContent!.replace(/\s+/g, ' ').trim())
      .toBe('Mothership.AirlockDoorsCementBeamsShips +20 Mothership.AP · +5 Mothership.DR');
    expect(el.querySelector('[aria-selected="true"] .cover-option-name')!.textContent)
      .toBe('Mothership.LightCover');
  });

  it('answers with the cover chosen and shuts itself', () => {
    const oncover = vi.fn();
    const el = block({ mod: 4, damageReduction: 2, cover: 'none' }, oncover);
    (el.querySelector('.cover-choice') as HTMLElement).click();
    flushSync();

    (el.querySelectorAll('.cover-option')[3] as HTMLElement).click();
    flushSync();

    expect(oncover).toHaveBeenCalledWith('heavy');
    expect(el.querySelector('[role="listbox"]')).toBeNull();
  });

  it.each([
    ['none', ['+0', '+0']],
    ['insignificant', ['+5', '+0']],
    ['light', ['+10', '+0']],
    ['heavy', ['+20', '+5']],
  ])('cover %s fills the second row of the table', (cover, expected) => {
    const el = block({ mod: 0, damageReduction: 0, cover });
    expect([...el.querySelectorAll('.cover-cell')].map((n) => n.textContent)).toEqual(expected);
  });

  // A zero reads as "this is doing nothing", not as a number to compare with the row above.
  it('greys the cells a cover leaves at zero', () => {
    const el = block({ mod: 0, damageReduction: 0, cover: 'light' });
    expect(
      [...el.querySelectorAll('.cover-cell')].map((n) => n.classList.contains('is-zero')),
    ).toEqual([false, true]);
  });
});

describe('ArmorBar', () => {
  const bar = (props: Record<string, unknown>) => render(ArmorBar, props).firstElementChild!;

  it('is two values either side of the slant, each dropping an absent bonus', () => {
    const el = bar({ left: 4, right: 2, leftBonus: 20 });

    expect([...el.querySelectorAll('.whiteText')].map((n) => n.textContent)).toEqual(['4', '2']);
    expect([...el.querySelectorAll('.highlightText')].map((n) => n.textContent)).toEqual([' 20']);
    expect(el.querySelector('.slant')).not.toBeNull();
  });

  // `spread` puts maxhealth-input on the value div too, whose margin: auto pushes the value and
  // its bonus to opposite cell ends — a pinned pixel difference, not a bug.
  it('spreads a value from its bonus only when asked', () => {
    expect(bar({ left: 4, right: 2 }).querySelector('.whiteText.maxhealth-input')).toBeNull();
    expect(bar({ left: 4, right: 2, spread: true }).querySelectorAll('.whiteText.maxhealth-input')).toHaveLength(2);
  });

  it('writes the left cell as a field only when named', () => {
    expect(bar({ left: 4, right: 2 }).querySelector('input')).toBeNull();

    const named = bar({ left: 4, right: 2, leftName: 'system.stats.armor.value' });
    expect(named.querySelectorAll('input')).toHaveLength(1);
    expect(named.querySelector('input')!.getAttribute('name')).toBe('system.stats.armor.value');
  });
});

describe('onActivate', () => {
  it('fires on Enter and Space only, and suppresses the default scroll', () => {
    const handler = vi.fn();
    const activate = onActivate(handler);

    for (const key of ['Enter', ' ', 'a', 'Tab', 'Escape']) {
      const event = new window.KeyboardEvent('keydown', { key, cancelable: true });
      activate(event);
      if (key === 'Enter' || key === ' ') expect(event.defaultPrevented).toBe(true);
    }
    expect(handler).toHaveBeenCalledTimes(2);
  });
});

describe('dropTarget', () => {
  it('parses the drag payload, cancels the browser default, and unbinds', () => {
    const payload = { type: 'Item', uuid: 'Item.abc' };
    (globalThis as any).foundry = {
      applications: {
        ux: { TextEditor: { implementation: { getDragEventData: () => payload } } },
      },
    };

    const onDrop = vi.fn();
    const node = document.createElement('div');
    const teardown = dropTarget(onDrop)(node)!;

    const over = new window.Event('dragover', { cancelable: true, bubbles: true });
    node.dispatchEvent(over);
    expect(over.defaultPrevented).toBe(true);

    const drop = new window.Event('drop', { cancelable: true, bubbles: true });
    node.dispatchEvent(drop);
    expect(drop.defaultPrevented).toBe(true);
    expect(onDrop).toHaveBeenCalledWith(payload, drop);

    teardown();
    node.dispatchEvent(new window.Event('drop', { cancelable: true, bubbles: true }));
    expect(onDrop).toHaveBeenCalledTimes(1);

    delete (globalThis as any).foundry;
  });
});
