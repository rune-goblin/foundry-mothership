import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const REPO = join(import.meta.dirname, '..');
const CSS_DIR = join(REPO, 'css');
// 3 theme-defence declarations on the dialog radios need !important: module CSS outranks
// layer(system) in normal order, and !important is what inverts that.
const IMPORTANT_CEILING = 3;

const stylesheets = readdirSync(CSS_DIR)
  .filter((file) => file.endsWith('.css'))
  .map((file) => ({ file, css: readFileSync(join(CSS_DIR, file), 'utf8') }));

const withoutComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');

/** Every `--name:` sitting where a declaration starts — definitions only, never `var()` reads. */
function definedCustomProperties(css: string): Set<string> {
  const names = new Set<string>();
  let statement = '';
  let parens = 0;

  for (const char of withoutComments(css)) {
    if (char === '(') parens++;
    else if (char === ')') parens--;

    if (parens === 0 && (char === ';' || char === '{' || char === '}')) {
      const declaration = /^\s*(--[\w-]+)\s*:/.exec(statement);
      if (declaration) names.add(declaration[1]);
      statement = '';
    } else {
      statement += char;
    }
  }
  return names;
}

/** The prelude of every statement at brace depth 0 — a selector, or an at-rule's name and query. */
function topLevelPreludes(css: string): string[] {
  const preludes: string[] = [];
  let depth = 0;
  let current = '';

  for (const char of withoutComments(css)) {
    if (char === '{') {
      if (depth === 0) preludes.push(current.trim());
      current = '';
      depth++;
    } else if (char === '}') {
      depth--;
      current = '';
    } else if (depth === 0) {
      if (char === ';') {
        if (current.trim()) preludes.push(current.trim());
        current = '';
      } else current += char;
    }
  }
  if (current.trim()) preludes.push(current.trim());
  return preludes;
}

const layered = (prelude: string) => /^@(layer|font-face|import|charset)\b/.test(prelude);

describe('css guards', () => {
  it(`keeps !important at or under ${IMPORTANT_CEILING} across css/`, () => {
    const total = stylesheets.reduce(
      (count, { css }) => count + (withoutComments(css).match(/!\s*important/gi)?.length ?? 0),
      0,
    );

    expect(stylesheets.map(({ file }) => file)).toContain('tokens.css');
    expect(total).toBeLessThanOrEqual(IMPORTANT_CEILING);
  });

  it('puts every top-level statement in tokens.css inside a layer', () => {
    const tokens = stylesheets.find((s) => s.file === 'tokens.css')!.css;
    const preludes = topLevelPreludes(tokens);

    expect(preludes.length).toBeGreaterThan(0);
    expect(preludes.filter((prelude) => !layered(prelude))).toEqual([]);
  });

  it('puts every top-level statement in mothership.css inside a layer', () => {
    const sheet = stylesheets.find((s) => s.file === 'mothership.css')!.css;
    const preludes = topLevelPreludes(sheet);

    expect(preludes.length).toBeGreaterThan(0);
    expect(preludes.filter((prelude) => !layered(prelude))).toEqual([]);
  });
});

// Svelte emits a component's <style> block unlayered, so a scoped block missing its own
// `@layer system` wrapper leaves css/ green while still outranking every layered rule. Skipped
// without a build; `npm run build` arms it.
const distCss = join(REPO, 'dist', 'mothershiprpg.css');
const noDist = !existsSync(distCss);

describe('the built stylesheet', () => {
  const spec = noDist
    ? 'skipped: no dist/mothershiprpg.css to read — run npm run build'
    : 'puts every top-level statement in dist/mothershiprpg.css inside a layer';

  it.skipIf(noDist)(spec, () => {
    const preludes = topLevelPreludes(readFileSync(distCss, 'utf8'));

    expect(preludes.length).toBeGreaterThan(0);
    expect(preludes.filter((prelude) => !layered(prelude))).toEqual([]);
  });
});

// Resolved the way scripts/start-test-env.sh resolves it, so the guard reads the same build the
// e2e tier boots.
const foundryApp =
  process.env.FOUNDRY_APP ??
  ['', ' v14']
    .map((suffix) => `/Applications/Foundry Virtual Tabletop${suffix}.app/Contents/Resources/app`)
    .find((path) => existsSync(join(path, 'public/css/foundry2.css'))) ??
  '';
const foundryCss = join(foundryApp, 'public/css/foundry2.css');
const noFoundry = !existsSync(foundryCss);

describe('token collisions with Foundry', () => {
  const spec = noFoundry
    ? 'skipped: no installed Foundry build to compare against — set FOUNDRY_APP to run it'
    : 'defines no custom property the installed Foundry build defines';

  it.skipIf(noFoundry)(spec, () => {
    const theirs = definedCustomProperties(readFileSync(foundryCss, 'utf8'));
    const ours = new Set(stylesheets.flatMap(({ css }) => [...definedCustomProperties(css)]));
    // The component tokens (--tabs-*, --charactersheet-*, …) exist only in Svelte <style>
    // blocks, which never pass through css/. The bundle is the one place they all land.
    const bundle = join(REPO, 'dist/mothershiprpg.css');
    if (existsSync(bundle)) {
      for (const name of definedCustomProperties(readFileSync(bundle, 'utf8'))) ours.add(name);
    }

    // A parser that returns nothing would pass an intersection test in silence.
    expect(ours.size).toBeGreaterThan(350);
    expect(theirs.size).toBeGreaterThan(300);
    expect([...ours].filter((name) => theirs.has(name))).toEqual([]);
  });
});

// The generator is the one window that is almost all label — the rest of the system still
// carries `sm`/`xs` sites this sweep did not review.
const GENERATOR = join(REPO, 'module/ui/generator');

const generatorFiles = readdirSync(GENERATOR, { withFileTypes: true, recursive: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith('.svelte'))
  .map((entry) => ({
    file: entry.name,
    css: withoutComments(readFileSync(join(entry.parentPath, entry.name), 'utf8')),
  }));

/** The prelude of the block a match sits in — the selector that owns the declaration. */
function ownerOf(css: string, at: number): string {
  const open = css.lastIndexOf('{', at);
  return css.slice(css.lastIndexOf('}', open) + 1, open).replace(/\s+/g, ' ').trim();
}

// Reviewed 2026-08-21: `sm` prints only where the text is genuinely subordinate to something
// beside it. Everything else in this window is `md` or larger. A new entry here means a new
// small-print decision, not a formatting detail.
const SUBTEXT = [
  '.skill-selector-note', // the warning beside the hovered skill's name
  '.skill-selector-chip', // prerequisite badges
  '.skill-selector-bonus', // the picks-left counter beside its rank heading
  '.character-wizard :global(.wizard-reference)', // "See Loadouts on pg. 7."
  '.wizard-rail-number', // a numeral inside a 1.6rem marker
  '.wizard-choice-delta', // the delta under the standing total it explains
];

describe("the character generator's typography", () => {
  it('sets nothing below the small step', () => {
    const literals = generatorFiles.flatMap(({ file, css }) =>
      [...css.matchAll(/font-size:\s*([\d.]+)(px|rem)/g)]
        .filter(([, size, unit]) => (unit === 'px' ? Number(size) : Number(size) * 16) < 13.6)
        .map((match) => `${file}: ${match[0]}`),
    );

    expect(generatorFiles.length).toBeGreaterThan(5);
    expect(literals).toEqual([]);
    expect(generatorFiles.filter(({ css }) => css.includes('--font-size-xs')).map((f) => f.file)).toEqual([]);
  });

  it('reaches for the small step only where the text is subtext', () => {
    const owners = generatorFiles.flatMap(({ css }) =>
      [...css.matchAll(/font-size:\s*var\(--font-size-sm\)/g)].map((match) => ownerOf(css, match.index)),
    );

    expect([...owners].sort()).toEqual([...SUBTEXT].sort());
  });
});

describe("the character generator's ink", () => {
  const tokens = stylesheets.find((s) => s.file === 'tokens.css')!.css;

  const resolve = (name: string, depth = 0): string => {
    const value = new RegExp(`${name}:\\s*([^;]+);`).exec(tokens)?.[1]?.trim() ?? '';
    const alias = /^var\((--[\w-]+)\)$/.exec(value);
    if (alias && depth < 12) return resolve(alias[1], depth + 1);
    const rgb = /^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/.exec(value);
    if (rgb) return `#${rgb.slice(1).map((part) => Number(part).toString(16).padStart(2, '0')).join('')}`;
    expect(value, name).toMatch(/^#[0-9a-f]{6}$/i);
    return value.toLowerCase();
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

  // Two grounds: the paper the pane is printed on, and the black the rail and a picked skill wear.
  // `--wizard-ink-disabled` is absent on purpose — only disabled controls wear it, which WCAG
  // 1.4.3 exempts.
  const ON_PAPER = ['--text-primary', '--text-secondary', '--text-warning-muted', '--text-danger-secondary', '--text-accent-tertiary'];
  const ON_BLACK = ['--text-inverted', '--text-tertiary'];

  it('clears 4.5:1 for every ink on the ground it is printed on', () => {
    const measured = [
      ...ON_PAPER.map((ink) => ({ ink, ground: resolve('--surface-neutral-paper') })),
      ...ON_BLACK.map((ink) => ({ ink, ground: resolve('--surface-neutral-lowest') })),
    ].map((pair) => ({ ...pair, ratio: contrast(resolve(pair.ink), pair.ground) }));

    expect(measured.filter((pair) => pair.ratio < 4.5).map((pair) => `${pair.ink}: ${pair.ratio.toFixed(2)}:1`)).toEqual([]);
  });

  // 2.68:1 on paper. It is a fill for disabled chrome, and the window prints no text in it.
  it('inks no text in the muted step', () => {
    expect(generatorFiles.filter(({ css }) => /[^-]color:\s*var\(--text-muted\)/.test(css)).map((f) => f.file)).toEqual([]);
  });
});
