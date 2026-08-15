// Which class selectors in css/ still style something? The stylesheet is a contract no compiler
// checks, so a class outlives the markup that wore it silently — 67 were claimed dead by a hand
// audit that also called `sbt-profile` dead while SheetHeader.svelte was still emitting it
// (docs/plans/design-system.md §1.3). Hence a script: it re-runs before any deletion, and
// `--assert-none` makes it a guard once the dead list is empty.
//
// Aliveness is deliberately generous: a class survives on a mention anywhere in the corpus
// below, on a prefix/suffix a template literal could interpolate into it, or on the core
// allowlist — keeping a dead rule costs nothing and deleting a live one costs pixels. Only
// mentions written where a class can actually go count as `used`; the rest are reported as
// `loose` for a human to settle, which is how `dropdown` (prose in three comments) and `white`
// (an item description) were told apart from real markup.
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const REPO = resolve(import.meta.dirname, '..');

// Foundry's own DOM wears these and our stylesheet targets them, so no Mothership source has to
// mention them. Verified against the installed v14 build's templates and client sources.
const CORE_CLASSES = new Set([
  'application', // the ApplicationV2 frame
  'window-header',
  'window-content',
  'dialog',
  'dialog-content',
  'dialog-form',
  'standard-form',
  'form-footer',
  'sheet', // core's DocumentSheet root, with its nav and body furniture
  'sheet-tabs',
  'sheet-body',
  'editor', // ProseMirror host that core's HTMLField enrichment builds
  'editor-content',
  'dice-tooltip', // chat-message roll internals
  'dice-rolls',
  'roll',
  'max',
  'min',
]);

type Selector = { file: string; line: number; prelude: string };

/** Every prelude that opens a block, at any depth — selectors, and at-rules we then ignore. */
function preludes(css: string): Selector[] {
  const found: Selector[] = [];
  let current = '';
  let line = 1;
  let startLine = 1;
  let quote = '';
  let comment = false;

  for (let i = 0; i < css.length; i++) {
    const char = css[i];
    if (char === '\n') line++;

    if (comment) {
      if (char === '*' && css[i + 1] === '/') { comment = false; i++; }
      continue;
    }
    if (quote) {
      if (char === '\\') i++;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === '/' && css[i + 1] === '*') { comment = true; i++; continue; }
    if (char === '"' || char === "'") { quote = char; continue; }

    if (char === '{') {
      if (current.trim()) found.push({ file: '', line: startLine, prelude: current.trim() });
      current = '';
    } else if (char === '}' || char === ';') {
      current = '';
    } else {
      if (!current.trim() && char.trim()) startLine = line;
      current += char;
    }
  }
  return found;
}

const CLASS_IN_SELECTOR = /\.(-?[A-Za-z_][\w-]*)/g;
const TOKEN = /[A-Za-z0-9_-]+/g;

function filesUnder(dir: string, extensions: string[], skip: string[] = []): string[] {
  let entries;
  try {
    entries = readdirSync(dir, { recursive: true, withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((entry) => entry.isFile() && extensions.some((ext) => entry.name.endsWith(ext)))
    .map((entry) => join(entry.parentPath, entry.name))
    .filter((path) => !skip.some((fragment) => path.includes(fragment)))
    .sort();
}

const stylesheets = filesUnder(join(REPO, 'css'), ['.css']);

// e2e locators name classes, macro `command` strings carry HTML, and lang values reach templates
// through localize() — every one of them can be the only thing keeping a rule alive.
const corpus = [
  ...filesUnder(join(REPO, 'module'), ['.js', '.ts', '.svelte']),
  ...filesUnder(join(REPO, 'templates'), ['.html']),
  ...filesUnder(join(REPO, 'test'), ['.js', '.ts'], ['foundry-data']),
  ...filesUnder(join(REPO, 'packs/_source'), ['.json']),
  ...filesUnder(join(REPO, 'content'), ['.ts']),
  ...filesUnder(join(REPO, 'lang'), ['.json']),
  // Pack macros carry HTML inside JSON strings, where every quote arrives escaped.
].map((path) => ({ path, text: readFileSync(path, 'utf8').replace(/\\"/g, '"') }));

/** token → the files that mention it, capped: this is evidence to eyeball, not an index. */
const mentions = new Map<string, string[]>();
/** The subset of those mentions that sit somewhere a class name can actually be written. */
const inClassPosition = new Map<string, string[]>();

function record(index: Map<string, string[]>, token: string, file: string): void {
  const seen = index.get(token);
  if (!seen) index.set(token, [file]);
  else if (seen[seen.length - 1] !== file && seen.length < 5) seen.push(file);
}

/** The value after `class=`, `class:`, `className =`, `classes: [` or any `*Class` prop. */
function classValues(text: string): string[] {
  const values: string[] = [];
  for (const match of text.matchAll(/[\w]*class(?:name|es)?\s*[:=]\s*/gi)) {
    let i = match.index + match[0].length;
    const opener = text[i];
    const closer = { '"': '"', "'": "'", '`': '`', '{': '}', '[': ']' }[opener];
    if (!closer) {
      values.push(/^[\w-]*/.exec(text.slice(i))![0]);
      continue;
    }
    if (opener === '{' || opener === '[') {
      let depth = 0;
      for (let j = i; j < text.length; j++) {
        if (text[j] === opener) depth++;
        else if (text[j] === closer && !--depth) { values.push(text.slice(i + 1, j)); break; }
      }
    } else {
      const end = text.indexOf(closer, ++i);
      if (end > 0) values.push(text.slice(i, end));
    }
  }
  return values;
}

for (const { path, text } of corpus) {
  const short = relative(REPO, path);
  for (const [token] of text.matchAll(TOKEN)) record(mentions, token, short);

  const classy = classValues(text);
  // A selector written in a string — the shape an e2e locator or a querySelector takes.
  for (const [, selector] of text.matchAll(/["'`]([^"'`\n]*\.[\w-]+[^"'`\n]*)["'`]/g)) {
    for (const [, name] of selector.matchAll(CLASS_IN_SELECTOR)) record(inClassPosition, name, short);
  }
  for (const value of classy) {
    for (const [token] of value.matchAll(TOKEN)) record(inClassPosition, token, short);
  }
}

// `class={[`skill-${variant}`, …]}` and `class="grid grid-{n}col"` build names no grep can see.
// Each interpolation contributes the static word on its left and the one on its right; a class
// completes the pair when it starts with the first and ends with the second. Requiring both
// halves of one interpolation is what keeps this from matching every name ending in a common
// syllable — a bare suffix counts only when it opens with a hyphen, the `${x}-col` idiom.
type Pattern = { prefix: string; suffix: string; site: string };
const patterns: Pattern[] = [];

for (const { path, text } of corpus) {
  if (!/\.(svelte|js|ts)$/.test(path)) continue;
  const short = relative(REPO, path);
  const interpolated = [
    ...[...text.matchAll(/`[^`]*`/g)].map(([literal]) => ({ body: literal, hole: /\$\{[^{}]*\}/g })),
    ...[...text.matchAll(/class="[^"]*"/g)].map(([attr]) => ({ body: attr, hole: /\{[^{}]*\}/g })),
  ];

  for (const { body, hole } of interpolated) {
    for (const match of body.matchAll(hole)) {
      const before = body.slice(0, match.index).split(/[\s`"]/).pop() ?? '';
      const after = body.slice(match.index + match[0].length).split(/[\s`"]/)[0] ?? '';
      const prefix = before.includes('}') ? before.slice(before.lastIndexOf('}') + 1) : before;
      const suffix = after.includes('{') ? after.slice(0, after.indexOf('{')) : after;
      if (prefix.length >= 2 || (!prefix && suffix.startsWith('-') && suffix.length >= 3)) {
        patterns.push({ prefix, suffix, site: short });
      }
    }
  }
}

function constructible(name: string): Pattern | undefined {
  return patterns.find(
    ({ prefix, suffix }) =>
      name.startsWith(prefix) &&
      name.endsWith(suffix) &&
      name.length > prefix.length + suffix.length,
  );
}

const declared = new Map<string, Selector[]>();
for (const file of stylesheets) {
  const short = relative(REPO, file);
  for (const selector of preludes(readFileSync(file, 'utf8'))) {
    if (selector.prelude.startsWith('@')) continue;
    for (const [, name] of selector.prelude.matchAll(CLASS_IN_SELECTOR)) {
      const sites = declared.get(name) ?? [];
      sites.push({ ...selector, file: short });
      declared.set(name, sites);
    }
  }
}

type Verdict = { name: string; why: string; where: string; sites: Selector[] };
const alive: Verdict[] = [];
const dead: Verdict[] = [];

for (const name of [...declared.keys()].sort()) {
  const sites = declared.get(name)!;
  const written = inClassPosition.get(name);
  const seen = mentions.get(name);
  const dynamic = seen ? undefined : constructible(name);

  if (written) alive.push({ name, why: 'used', where: written.join(' '), sites });
  else if (CORE_CLASSES.has(name)) alive.push({ name, why: 'core', where: 'Foundry DOM', sites });
  else if (dynamic) {
    alive.push({ name, why: 'dynamic', where: `${dynamic.prefix}…${dynamic.suffix} ${dynamic.site}`, sites });
  }
  // The name occurs, but never where a class is written — a comment, an identifier, prose in a
  // pack description. Too weak to delete on and too weak to trust: a human decides.
  else if (seen) alive.push({ name, why: 'loose', where: seen.join(' '), sites });
  else dead.push({ name, why: 'dead', where: '', sites });
}

const argv = process.argv.slice(2);
const pad = Math.max(0, ...[...dead, ...alive].map((entry) => entry.name.length));

console.log(
  `${declared.size} classes in ${stylesheets.length} stylesheets · ${alive.length} alive · ${dead.length} dead`,
);

if (argv.includes('--verbose')) {
  const width = Math.max(0, ...alive.map((entry) => entry.name.length));
  for (const { name, why, where } of alive) {
    console.log(`  alive ${name.padEnd(width)}  ${why.padEnd(7)} ${where}`);
  }
} else {
  for (const { name, where } of alive.filter((entry) => entry.why === 'loose')) {
    console.log(`  loose ${name.padEnd(pad)}  mentioned, never written as a class: ${where}`);
  }
}

for (const { name, sites } of dead) {
  console.log(`  dead  ${name.padEnd(pad)}  ${sites.map((s) => `${s.file}:${s.line}`).join(' ')}`);
}

if (argv.includes('--assert-none') && dead.length) process.exit(1);
