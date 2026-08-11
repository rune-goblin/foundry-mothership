// @vitest-environment jsdom
//
// The shared primitives are hybrid by decision (MODERNIZATION.md §13): they emit the *global*
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
import { onActivate } from '../module/ui/parts/activate.js';
import { dropTarget } from '../module/ui/parts/drop-target.js';

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
