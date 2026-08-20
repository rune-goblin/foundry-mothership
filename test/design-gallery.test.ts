// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { mount, unmount, flushSync, type Component } from 'svelte';

import '../design/stand-in/foundry.js';
import { cases, uncovered } from '../design/lib/catalog.js';
import { themeTokens, themeTokenCount } from '../design/lib/theme-tokens.js';
import { families, familyTokenCount, remainingBlocks } from '../design/lib/families.js';
import { componentTokens, componentTokenCount } from '../design/lib/component-tokens.js';
import { clipboard } from '../design/lib/copy.svelte.js';
import ThemeTokens from '../design/pages/ThemeTokens.svelte';
import ComponentTokens from '../design/pages/ComponentTokens.svelte';
import Components from '../design/pages/Components.svelte';

const mounted: Array<Record<string, unknown>> = [];

afterEach(() => {
  while (mounted.length) unmount(mounted.pop()!);
  vi.restoreAllMocks();
});

function render(component: Component, props: Record<string, unknown> = {}): HTMLElement {
  const target = document.createElement('div');
  document.body.append(target);
  mounted.push(mount(component, { target, props }) as Record<string, unknown>);
  flushSync();
  return target;
}

describe('the gallery catalog', () => {
  it('registers a specimen for every component under module/ui', () => {
    expect(uncovered).toEqual([]);
  });

  it('gives every specimen a title, a path and a group', () => {
    for (const entry of cases) {
      expect(entry.title, entry.id).toBeTruthy();
      expect(entry.path, entry.id).toMatch(/^module\//);
      expect(entry.group, entry.id).toBeTruthy();
    }
  });
});

describe('every specimen mounts', () => {
  for (const entry of cases) {
    it(`${entry.group} — ${entry.title}`, () => {
      // Svelte reports a failed prop read by throwing, so markup at all is the assertion.
      const target = render(entry.component as Component);
      expect(target.innerHTML.length, entry.path).toBeGreaterThan(0);
    });
  }
});

describe('the skill selector specimen', () => {
  it('flags granted, picked, available and unavailable skills distinctly', () => {
    const entry = cases.find((candidate) => candidate.title === 'SkillSelector')!;
    const target = render(entry.component as Component);
    const stateOf = (uuid: string) => target.querySelector<HTMLElement>(`[data-skill="${uuid}"]`)?.dataset.state;

    expect(stateOf('sk-linguistics')).toBe('granted');
    expect(stateOf('sk-mathematics')).toBe('picked');
    expect(stateOf('sk-zoology')).toBe('available');
    expect(stateOf('sk-pathology')).toBe('unavailable');
  });

  it('separates a skill blocked by its prerequisite from one blocked by a spent rank', () => {
    const entry = cases.find((candidate) => candidate.title === 'SkillSelector')!;
    const target = render(entry.component as Component);
    const reasonOf = (uuid: string) => target.querySelector<HTMLElement>(`[data-skill="${uuid}"]`)?.dataset.reason;

    expect(reasonOf('sk-pathology')).toBe('gated');
    expect(reasonOf('sk-sophontology')).toBe('spent');
    expect(reasonOf('sk-zoology')).toBe(undefined);
  });

  // A focus ring left on a row that can't be taken would read as a selection never made.
  it('refuses the press that would focus a skill it will not let you choose', () => {
    const entry = cases.find((candidate) => candidate.title === 'SkillSelector')!;
    const target = render(entry.component as Component);
    const press = (uuid: string) => {
      const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
      target.querySelector(`[data-skill="${uuid}"]`)!.dispatchEvent(event);
      return event.defaultPrevented;
    };

    expect(press('sk-pathology')).toBe(true);
    expect(press('sk-linguistics')).toBe(true);
    expect(press('sk-zoology')).toBe(false);
    expect(press('sk-mathematics')).toBe(false);
  });

  // The prerequisite graph is walked transitively, not one hop at a time: hovering a Master skill
  // should light the Trained skill two tiers beneath it, not only its direct Expert prerequisite.
  it('lights a hovered skill’s whole route, not just its direct neighbour', () => {
    const entry = cases.find((candidate) => candidate.title === 'SkillSelector')!;
    const target = render(entry.component as Component);

    target.querySelector<HTMLElement>('[data-skill="sk-sophontology"]')!.dispatchEvent(new Event('mouseenter'));
    flushSync();

    for (const uuid of ['sk-psychology', 'sk-linguistics', 'sk-zoology']) {
      expect(target.querySelector(`[data-skill="${uuid}"]`)?.classList.contains('is-hover-lit')).toBe(true);
    }
  });
});

describe('the three pages render', () => {
  // jsdom computes nothing from a stylesheet it never loaded, so this proves the pages
  // survive empty values — same as a browser before the stylesheet arrives.
  const scope = () => document.createElement('div');

  // A token is one of six row shapes; a kind with no branch here would drop its whole group silently.
  const ROW = '.ds-swatch-col, .ds-bar-row, .ds-radius-item, .ds-specimen-row, .ds-card, .ds-row';

  it('theme tokens — every token drawn exactly once', () => {
    const page = render(ThemeTokens as Component, { scope: scope(), clip: clipboard() });
    const groups = remainingBlocks.filter((block) => !block.heading);

    expect(page.querySelectorAll(ROW).length).toBe(themeTokenCount);
    expect(page.querySelectorAll('.ds-family').length).toBe(families.length);
    expect(page.querySelectorAll('.ds-group').length).toBe(groups.length);
  });

  it('component tokens — one row per token, grouped by owner', () => {
    const page = render(ComponentTokens as Component, { scope: scope(), clip: clipboard() });
    expect(page.querySelectorAll('.ds-alias').length).toBe(componentTokenCount);
    expect(page.querySelectorAll('.ds-owner').length).toBe(componentTokens.length);

    // A note prints behind the info button, never inline above the card.
    const noted = componentTokens.filter((component) => component.note).length;
    expect(page.querySelectorAll('.ds-info-btn').length).toBe(noted);
    expect(page.querySelector('.ds-info-panel')).toBeNull();
  });

  it('components — one case per specimen, each on a stage', () => {
    const page = render(Components as Component, { clip: clipboard() });
    expect(page.querySelectorAll('.ds-case').length).toBe(cases.length);
    expect(page.querySelectorAll('.ds-stage .application.mothership').length).toBe(cases.length);
  });
});

describe('the chrome typography', () => {
  const shell = readFileSync(join(import.meta.dirname, '..', 'design', 'shell.css'), 'utf8');

  it('sets no font-size below the 14px floor', () => {
    const tooSmall = [...shell.matchAll(/font-size:\s*([\d.]+)(px|rem)/g)].filter(([, size, unit]) =>
      unit === 'px' ? Number(size) < 14 : Number(size) * 16 < 14,
    );
    expect(tooSmall.map((match) => match[0])).toEqual([]);
  });

  it('writes no uppercase and no tracked-out label', () => {
    expect(shell).not.toMatch(/text-transform:\s*uppercase/);
    expect(shell).not.toMatch(/letter-spacing:\s*0?\.\d+em/);
  });

  // shell.css states its contrast measurements in a comment; this recomputes them so
  // that comment can never quietly stop being true.
  it('clears 4.5:1 for every ink on every ground it is printed on', () => {
    const value = (name: string) => {
      const hit = new RegExp(`${name}:\\s*(#[0-9a-f]{6})`, 'i').exec(shell);
      expect(hit, name).not.toBeNull();
      return hit![1];
    };

    const channel = (part: number) =>
      part / 255 <= 0.03928 ? part / 255 / 12.92 : ((part / 255 + 0.055) / 1.055) ** 2.4;
    const luminance = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map((at) => channel(parseInt(hex.slice(at, at + 2), 16)));
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const contrast = (a: string, b: string) => {
      const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
      return (light + 0.05) / (dark + 0.05);
    };

    // `--ui-gray-350` is the lightest thing text is ever set on: the shadow well and the
    // active-nav fill. Black is the page.
    const grounds = ['#000000', value('--ui-gray-150'), value('--ui-gray-300'), value('--ui-gray-350')];
    const inks = ['--ui-text-primary', '--ui-text-secondary', '--ui-text-tertiary', '--ui-text-muted', '--ui-highlight'];

    const failures = inks.flatMap((ink) =>
      grounds
        .map((ground) => ({ ink, ground, ratio: contrast(value(ink), ground) }))
        .filter((pair) => pair.ratio < 4.5)
        .map((pair) => `${pair.ink} on ${pair.ground}: ${pair.ratio.toFixed(2)}:1`),
    );

    expect(failures).toEqual([]);
  });
});

describe('the token readers', () => {
  it('parses css/tokens.css into groups with tokens in them', () => {
    expect(themeTokenCount).toBeGreaterThan(300);
    expect(themeTokens.filter((block) => block.tokens.length).length).toBeGreaterThan(10);
    for (const block of themeTokens) {
      for (const token of block.tokens) expect(token.name, token.name).toMatch(/^--[\w-]+$/);
    }
  });

  it('finds the Layer 2 tokens in the components own style blocks', () => {
    expect(componentTokenCount).toBeGreaterThan(100);
    expect(componentTokens.length).toBeGreaterThan(5);
    for (const component of componentTokens) {
      expect(component.path, component.name).toMatch(/^module\/.*\.svelte$/);
    }
  });

  // A component's tokens carry its own id, squashed (`--itemcell-*`) or kebab (`--pip-track-*`).
  it('regroups the colour half by family, losing and duplicating nothing', () => {
    const inFamilies = families.flatMap((f) => f.scales.flatMap((s) => s.tokens.map((t) => t.name)));
    const inRest = remainingBlocks.flatMap((b) => b.tokens.map((t) => t.name));

    expect(new Set(inFamilies).size).toBe(inFamilies.length);
    expect(inFamilies.length).toBe(familyTokenCount);
    expect(inFamilies.length + inRest.length).toBe(themeTokenCount);
    expect(inFamilies.filter((name) => inRest.includes(name))).toEqual([]);

    for (const family of families) {
      expect(family.scales[0].title, family.name).toBe('Palette');
      expect(family.scales.map((s) => s.title), family.name).toEqual(
        ['Palette', 'Surfaces', 'Borders', 'Text'].filter((title) =>
          family.scales.some((s) => s.title === title),
        ),
      );
    }
  });

  it('finds no token under another component prefix', () => {
    const borrowed = componentTokens.flatMap((component) =>
      component.tokens.filter((token) => token.foreign).map((token) => `${component.name} ${token.name}`),
    );
    expect(borrowed).toEqual([]);
  });
});
