// Layer 2, read out of the components themselves. Every `--<componentId>-*` lives in a scoped
// <style> block, so the glob below is the whole population: a component that grows a token shows
// up here on the next reload, and one that reads a Layer 1 ramp step directly shows up as a
// literal, which is the thing the two-layer rule exists to prevent.
import { themeTokenNames } from './theme-tokens.js';

const sources = import.meta.glob('../../module/**/*.svelte', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const STYLE_BLOCK = /<style[^>]*>([\s\S]*?)<\/style>/g;
const COMMENT_OR_DECLARATION = /\/\*([\s\S]*?)\*\/|(--[\w-]+)\s*:\s*([^;]+);/g;
const VAR_READ = /var\(\s*(--[\w-]+)/g;

const componentName = (path) => path.split('/').pop().replace('.svelte', '');

/** `module/ui/parts/Field.svelte`, the way the repo refers to it. */
const repoPath = (path) => path.replace('../../', '');

/**
 * The prefixes the naming law allows a component: its own id, in either of the two spellings the
 * system already uses — `ItemCell` owns `--itemcell-*` and `PipTrack` owns `--pip-track-*`. A token
 * under any other prefix is borrowing a neighbour's namespace, and the page says so rather than
 * leaving it to a reader to notice.
 */
const prefixesFor = (name) => [
  `--${name.toLowerCase()}-`,
  `--${name.replace(/(?<=[a-z0-9])(?=[A-Z])/g, '-').toLowerCase()}-`,
];

const COMMENT_ONLY = /\/\*[\s\S]*?\*\//g;

/**
 * The selector a declaration sits under, tracked by walking the block and keeping a stack of
 * preludes. A token is often declared twice on purpose — once for the base and again under a state
 * — and which selector each sits in is the whole difference between them. `@layer system {` is a
 * prelude too, so the innermost non-at-rule one is the answer.
 */
function declarations(block) {
  const found = [];
  const stack = [];
  let prelude = '';
  let statement = '';

  for (const char of block) {
    if (char === '{') {
      stack.push(prelude.trim());
      prelude = '';
      statement = '';
    } else if (char === '}') {
      stack.pop();
      prelude = '';
      statement = '';
    } else if (char === ';') {
      const match = /^\s*(--[\w-]+)\s*:\s*([\s\S]+)$/.exec(statement);
      if (match) {
        const selector = [...stack].reverse().find((entry) => entry && !entry.startsWith('@')) ?? '';
        found.push({ name: match[1], value: match[2], selector });
      }
      statement = '';
      prelude = '';
    } else {
      statement += char;
      prelude += char;
    }
  }

  return found;
}

function read() {
  const components = [];

  for (const [path, source] of Object.entries(sources)) {
    const name = componentName(path);
    const own = prefixesFor(name);
    const tokens = [];
    let note = '';

    for (const [, block] of source.matchAll(STYLE_BLOCK)) {
      // The block's opening comment is the component's account of what it owns and why.
      note ||= block.match(COMMENT_ONLY)?.[0].replace(/\/\*|\*\//g, '').replace(/\s+/g, ' ').trim() ?? '';

      for (const { name: token, value, selector } of declarations(block.replace(COMMENT_ONLY, ''))) {
        const trimmed = value.replace(/\s+/g, ' ').trim();
        const aliases = [...trimmed.matchAll(VAR_READ)]
          .map((read) => read[1])
          .filter((read) => themeTokenNames.has(read));

        tokens.push({
          name: token,
          selector,
          // A token declared twice is a base and a state override; the pair is only legible with
          // the selector beside it, and it is what keeps the two rows distinct.
          key: `${selector} ${token}`,
          value: trimmed,
          aliases,
          // A value naming no Layer 1 token is a measured px or a colour written in place — every
          // one of them is argued for in a comment at the site, and every one is a parked call.
          literal: aliases.length === 0,
          foreign: !own.some((prefix) => token.startsWith(prefix)),
        });
      }
    }

    for (const token of tokens) {
      token.overridden = tokens.filter((other) => other.name === token.name).length > 1;
    }

    if (tokens.length) components.push({ name, path: repoPath(path), note, tokens });
  }

  return components.sort((a, b) => a.path.localeCompare(b.path));
}

export const componentTokens = read();

/** How many components exist at all — the denominator the owner count is only interesting against. */
export const componentCount = Object.keys(sources).length;

export const componentTokenCount = componentTokens.reduce(
  (total, component) => total + component.tokens.length,
  0,
);

export const literalCount = componentTokens.reduce(
  (total, component) => total + component.tokens.filter((token) => token.literal).length,
  0,
);

/** Which components read a given Layer 1 token — the "who breaks if I retheme this" answer. */
export function readersOf(themeToken) {
  return componentTokens
    .filter((component) => component.tokens.some((token) => token.aliases.includes(themeToken)))
    .map((component) => component.name);
}
