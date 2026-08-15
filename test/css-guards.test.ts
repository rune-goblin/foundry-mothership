// The two green numbers from the CSS audit — five `!important` (six until DS5 deleted the
// invalid `color: none !important`) and, for tokens.css, zero rules outside `@layer` — rot
// silently: nothing else in any tier notices a sixth `!important` or a stray unlayered rule, and
// both decide what beats Foundry core. The ceiling only ever ratchets down. The third guard is
// the price of keeping live-tokens' shared vocabulary (decision 1): a Foundry upgrade that mints
// a token name we already define would silently retheme either the VTT or our sheets, so the
// overlap is asserted empty against the installed build rather than trusted.
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const REPO = join(import.meta.dirname, '..');
const CSS_DIR = join(REPO, 'css');
const IMPORTANT_CEILING = 5;

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
      (count, { css }) => count + (css.match(/!\s*important/gi)?.length ?? 0),
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

  // DS7 wraps the sheet and renames the file; it flips this on by dropping the `.skip`.
  it.skip('puts every top-level statement in mosh.css inside a layer', () => {
    const sheet = stylesheets.find((s) => s.file === 'mosh.css')!.css;

    expect(topLevelPreludes(sheet).filter((prelude) => !layered(prelude))).toEqual([]);
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

    // A parser that returns nothing would pass an intersection test in silence.
    expect(ours.size).toBeGreaterThan(350);
    expect(theirs.size).toBeGreaterThan(300);
    expect([...ours].filter((name) => theirs.has(name))).toEqual([]);
  });
});
