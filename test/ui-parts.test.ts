// @vitest-environment jsdom
//
// The shared primitives are hybrid by decision: they emit the *global*
// class names from the hand-authored css/mosh.css rather than owning their styling. That makes
// every class name below a contract with a stylesheet the compiler never sees -- rename one in a
// component and the sheet silently loses its styling with every tier still green.
//
// These specs mount each primitive and assert the selector the stylesheet actually keys off,
// plus the behaviour of the interactive ones. CircleStat has no converted consumer until
// ship-sheet-sbt, so this is the only thing holding it to its shape.
import { describe, it, expect, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync, createRawSnippet, type Component } from 'svelte';

import ItemList from '../module/ui/parts/ItemList.svelte';
import ItemRow from '../module/ui/parts/ItemRow.svelte';
import ItemImage from '../module/ui/parts/ItemImage.svelte';
import ItemCell from '../module/ui/parts/ItemCell.svelte';
import ItemControls from '../module/ui/parts/ItemControls.svelte';
import ItemControl from '../module/ui/parts/ItemControl.svelte';
import Tabs from '../module/ui/parts/Tabs.svelte';
import TabPanel from '../module/ui/parts/TabPanel.svelte';
import CircleStats from '../module/ui/parts/CircleStats.svelte';
import CircleStat from '../module/ui/parts/CircleStat.svelte';
import Field from '../module/ui/parts/Field.svelte';
import MainStat from '../module/ui/parts/MainStat.svelte';
import MinMaxField from '../module/ui/parts/MinMaxField.svelte';
import PipTrack from '../module/ui/parts/PipTrack.svelte';
import RollableStat from '../module/ui/parts/RollableStat.svelte';
import ArmorBlock from '../module/ui/parts/sections/ArmorBlock.svelte';
import HealthBlock from '../module/ui/parts/sections/HealthBlock.svelte';
import ItemPanel from '../module/ui/parts/sections/ItemPanel.svelte';
import { onActivate } from '../module/ui/parts/activate.js';
import { dropTarget } from '../module/ui/parts/drop-target.js';

// The sections caption themselves; the primitives take their labels as props. `i18n.ts` reads
// game.i18n, which jsdom has no reason to provide -- echo the key back.
(globalThis as any).game = { i18n: { localize: (key: string) => key } };

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

describe('ItemList', () => {
  it('is the ol the stylesheet targets', () => {
    const el = render(ItemList, { children: text('x'), style: 'margin-bottom: 10px;' })
      .firstElementChild!;
    expect(el.tagName).toBe('OL');
    expect(el.className).toBe('items-list');
    expect(el.getAttribute('style')).toBe('margin-bottom: 10px;');
  });
});

describe('ItemRow', () => {
  it('a header row is not draggable and carries no item id', () => {
    const el = render(ItemRow, { children: text('x'), header: true }).firstElementChild!;
    expect(el.tagName).toBe('LI');
    expect([...el.classList]).toEqual(['item', 'flexrow', 'item-header']);
    expect(el.hasAttribute('draggable')).toBe(false);
    expect(el.hasAttribute('data-item-id')).toBe(false);
  });

  it('an item row is draggable by the selector ActorSheetV2 drags from', () => {
    const el = render(ItemRow, { children: text('x'), itemId: 'abc123' }).firstElementChild!;
    expect([...el.classList]).toEqual(['item', 'flexrow', 'draggable']);
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
    expect([...el.classList]).toEqual(['item', 'flexrow']);
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

    expect(wrapper.className).toBe('mainstatwrapper');
    const stat = wrapper.firstElementChild!;
    expect([...stat.classList]).toEqual(['resource', 'mainstat']);

    const span = stat.querySelector('.mainstatlabel span')!;
    expect(span.className).toBe('mainstattext');
    expect((span as HTMLElement).dataset).toMatchObject({ key: 'combat', label: 'Combat' });
    expect(span.textContent).toBe('Combat');

    const input = stat.querySelector('input')!;
    expect(input.className).toBe('circle-input');
    expect(input.getAttribute('name')).toBe('system.base_adjustment.combat');
    expect(input.getAttribute('type')).toBe('text');
    expect(input.getAttribute('data-dtype')).toBe('Number');
    expect(input.value).toBe('10');
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

    expect(input.className).toBe('circle-input');
    expect(input.type).toBe('checkbox');
    expect(input.checked).toBe(true);
    expect(input.getAttribute('data-dtype')).toBe('Boolean');
  });

  // The generator swaps a clickable die for the rolled value and hangs the class bonus beside it,
  // so it drives the circle and the wrapper's second slot itself.
  it('lets a caller replace the circle and add beside it', () => {
    const wrapper = render(MainStat, {
      label: 'Strength',
      key: 'strength',
      control: text('die'),
      after: text('bonus'),
    }).firstElementChild!;

    expect(wrapper.className).toBe('mainstatwrapper');
    expect(wrapper.querySelector('.resource.mainstat')!.textContent).toContain('die');
    expect(wrapper.querySelector('input')).toBeNull();
    expect(wrapper.lastElementChild!.textContent).toBe('bonus');
  });

  // The character sheet's four stats are clicked to roll them, so the caption becomes the
  // RollableStat the creature sheet builds by hand -- same classes, same data attributes.
  it('makes the caption rollable when given a handler', () => {
    const rolled: string[] = [];
    const span = render(MainStat, {
      label: 'Strength',
      key: 'strength',
      onroll: () => rolled.push('strength'),
    }).querySelector('.mainstatlabel span')!;

    expect([...span.classList]).toEqual([
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

    expect([...stat.classList]).toEqual(['resource', 'mainstat']);
    expect([...stat.querySelector('div')!.classList]).toEqual(['fulllabel', 'mainstatlabel']);
  });
});

describe('ItemImage', () => {
  it('renders the 24px thumbnail when given a source', () => {
    const el = render(ItemImage, { src: 'icons/svg/item.svg', title: 'Wrench' })
      .firstElementChild!;
    expect(el.className).toBe('item-image');
    const img = el.querySelector('img')!;
    expect(img.getAttribute('src')).toBe('icons/svg/item.svg');
    expect(img.getAttribute('alt')).toBe('Wrench');
    expect([img.getAttribute('width'), img.getAttribute('height')]).toEqual(['24', '24']);
  });

  it('stays an empty spacer cell without one', () => {
    const el = render(ItemImage, {}).firstElementChild!;
    expect(el.className).toBe('item-image');
    expect(el.children).toHaveLength(0);
  });
});

describe('ItemCell', () => {
  it('is a plain skill-stat with no tab stop when it has no handler', () => {
    const el = render(ItemCell, { children: text('9'), grow: 2.5 }).firstElementChild!;
    expect([...el.classList]).toContain('skill-stat');
    expect(el.getAttribute('style')).toBe('flex-grow: 2.5;');
    expect(el.hasAttribute('role')).toBe(false);
    expect(el.hasAttribute('tabindex')).toBe(false);
  });

  it('becomes a keyboard-reachable button when it does', () => {
    const onclick = vi.fn();
    const el = render(ItemCell, { children: text('9'), class: 'armor-ap list-roll', onclick })
      .firstElementChild!;
    expect([...el.classList]).toEqual(['skill-stat', 'armor-ap', 'list-roll']);
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
    expect([...el.classList]).toEqual(['skill-name', 'list-roll']);
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

    expect([...el.classList]).toEqual(['resource', 'healthspread', 'minmaxtopstat', 'flex-center']);
    expect(el.querySelector('label')!.className).toBe('resource-label minmaxtext');

    const wrapper = el.querySelector('.textvaluewrapper')! as HTMLElement;
    expect(wrapper.style.width).toBe('180px');
    const input = wrapper.querySelector('input')!;
    expect(input.className).toBe('textvaluewrapper-input darkGreyText');
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
    expect(select.className).toBe('textvaluewrapper-input darkGreyText');
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
    expect([...el.classList]).toEqual([
      'ability-mod',
      'stat-roll',
      'rollable',
      'creaturestat',
    ]);
    expect((el as HTMLElement).dataset).toMatchObject({ key: 'combat', label: 'Combat' });
    expect(el.textContent!.trim()).toBe('Combat');

    (el as HTMLElement).click();
    press(el, 'Enter');
    expect(onroll).toHaveBeenCalledTimes(2);
  });
});

describe('PipTrack', () => {
  it('fills the first `value` circles and leaves the rest empty', () => {
    const target = render(PipTrack, { count: 5, value: 2 });
    expect([...target.children].map((n) => n.className)).toEqual([
      'circle-f',
      'circle-f',
      'circle',
      'circle',
      'circle',
    ]);
  });

  it('captions a milestone pip and darkens its text once filled', () => {
    const target = render(PipTrack, {
      count: 5,
      value: 5,
      milestones: { 5: { label: 'Trained', left: -54 } },
    });
    const caption = target.querySelector('.skill_training_text')! as HTMLElement;

    expect(caption.textContent!.trim()).toBe('Trained');
    expect(caption.getAttribute('style')).toContain('left: -54px');
    expect(caption.getAttribute('style')).toContain('color: black');
    expect(caption.parentElement!.getAttribute('style')).toContain('background: black');
  });

  // The condition treatment track is three Font Awesome circles, not divs.
  it('renders the icon variant as solid and outline glyphs', () => {
    const target = render(PipTrack, { count: 3, value: 1, variant: 'icon' });
    expect([...target.children].map((n) => n.className)).toEqual([
      'fas fa-circle',
      'far fa-circle',
      'far fa-circle',
    ]);
  });
});

describe('ItemControls and ItemControl', () => {
  it('the container is the flex-basis cell at the end of a row', () => {
    const el = render(ItemControls, { children: text('x') }).firstElementChild!;
    expect(el.className).toBe('item-controls');
  });

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
    expect([...el.classList]).toEqual(['mosh', 'sheet-tabs', 'tabs']);
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

describe('CircleStat', () => {
  it('is a circle input plus a sibling label, not a nested pair', () => {
    const target = render(CircleStat, {
      name: 'system.stats.battle.value',
      value: 35,
      label: 'Battle',
    });

    const [stat, label] = [...target.children];
    expect([...stat.classList]).toEqual(['resource', 'circle-stat']);
    expect([...label.classList]).toEqual(['circlestatlabel']);

    const input = stat.querySelector('input')!;
    expect(input.className).toBe('circle-input');
    expect(input.getAttribute('name')).toBe('system.stats.battle.value');
    expect(input.getAttribute('data-dtype')).toBe('Number');
    expect(input.value).toBe('35');

    const span = label.querySelector('span')!;
    expect([...span.classList]).toEqual(['circlestattext']);
    expect(span.hasAttribute('role')).toBe(false);
  });

  it('a rollable label carries the roll dataset and activates', () => {
    const onroll = vi.fn();
    const target = render(CircleStat, {
      name: 'system.stats.battle.value',
      value: 35,
      label: 'Battle',
      key: 'battle',
      roll: 'd100',
      onroll,
    });

    const span = target.querySelector('.circlestatlabel span')! as HTMLElement;
    expect([...span.classList]).toEqual([
      'circlestattext',
      'ability-mod',
      'stat-roll',
      'rollable',
    ]);
    expect(span.dataset).toMatchObject({ key: 'battle', roll: 'd100', label: 'Battle' });
    expect(span.getAttribute('role')).toBe('button');

    span.click();
    press(span, 'Enter');
    expect(onroll).toHaveBeenCalledTimes(2);
  });

  it('renders no label block at all when unlabelled', () => {
    const target = render(CircleStat, { name: 'system.supplies.oxygen.value', value: 4 });
    expect(target.children).toHaveLength(1);
    expect(target.querySelector('.circlestatlabel')).toBeNull();
  });
});

// The sections are the tier above the primitives: shared between the two actor sheets, composed
// out of the parts above, and captioned from lang/. Decision 1's falsifier is the prop count --
// a section needing more than about three divergence props should be split back apart.
describe('ItemPanel', () => {
  const items = [
    { id: 'aaa', name: 'Wrench' },
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
    expect(list.className).toBe('items-list');
    expect(list.getAttribute('style')).toBe('margin-bottom: 10px;');

    const [header, ...rows] = [...list.children];
    expect([...header.classList]).toEqual(['item', 'flexrow', 'item-header']);
    expect([...header.querySelectorAll('.skill-stat')].map((n) => n.textContent!.trim())).toEqual([
      'Mothership.ItemName',
      'Mothership.Quantity',
    ]);
    expect(header.querySelector('.skill-stat')!.getAttribute('style')).toBe('flex-grow: 1.5;');
    // The spacer under the thumbnail column keeps the header's cells aligned with the rows'.
    expect(header.querySelector('.item-image')!.children).toHaveLength(0);

    expect(rows.map((r) => r.getAttribute('data-item-id'))).toEqual(['aaa', 'bbb']);
    expect(rows.map((r) => r.getAttribute('draggable'))).toEqual(['true', 'true']);
    expect(rows.map((r) => r.textContent!.trim())).toEqual(['Wrench', 'Crowbar']);
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

describe('ArmorBlock', () => {
  const block = (armor: Record<string, unknown>, onroll = () => {}) =>
    render(ArmorBlock, { armor, onroll }).firstElementChild!;

  it('reads out the derived points and reduction, and rolls from its caption', () => {
    const onroll = vi.fn();
    const el = block({ mod: 4, damageReduction: 2, cover: 'none' }, onroll);

    expect([...el.querySelectorAll('.whiteText')].map((n) => n.textContent)).toEqual(['4', '2']);
    expect(el.querySelector('.highlightText')).toBeNull();

    const caption = el.querySelector('label')!;
    caption.click();
    press(caption, 'Enter');
    expect(onroll).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['insignificant', [' 5']],
    ['light', [' 10']],
    ['heavy', [' 20', ' 5']],
  ])('cover %s adds its bonuses beside the readouts', (cover, expected) => {
    const el = block({ mod: 0, damageReduction: 0, cover });
    expect([...el.querySelectorAll('.highlightText')].map((n) => n.textContent)).toEqual(expected);
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
