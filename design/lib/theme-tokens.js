// Layer 1, read out of css/tokens.css itself. The file is the source of truth for the names, the
// values and the grouping alike: its comments are the section headings, so a token added under a
// new heading appears here with that heading and no edit to this file.
import source from '../../css/tokens.css?raw';

const COMMENT_OR_DECLARATION = /\/\*([\s\S]*?)\*\/|(--[\w-]+)\s*:\s*([^;]+);/g;

/** A comment's first sentence is its title, em-dash gloss included; the rest of it is the note. */
function caption(comment) {
  const text = comment.replace(/\s+/g, ' ').trim();
  const stop = text.indexOf('. ');
  const head = stop === -1 ? text : text.slice(0, stop);

  // A heading in this file is a short noun phrase, with or without its gloss. Anything longer is
  // prose under one — the composite type styles have exactly that — and the heading above it is
  // already the title, so the group takes no second one.
  if (!head.includes(' — ') && head.length > 60) return { title: '', note: text };

  return { title: head, note: stop === -1 ? '' : text.slice(stop + 2) };
}

/** Only a comment that opens its own line can title anything; one trailing a value annotates it. */
function ownsItsLine(index) {
  return /^\s*$/.test(source.slice(source.lastIndexOf('\n', index) + 1, index));
}

/** A blank line above it — the file's own separator between one run of declarations and the next. */
function afterABlankLine(index) {
  const lineStart = source.lastIndexOf('\n', index);
  return /^\s*$/.test(source.slice(source.lastIndexOf('\n', lineStart - 1) + 1, lineStart));
}

/**
 * @typedef {{ name: string, value: string, note: string }} Token
 * @typedef {{ title: string, note: string, tokens: Token[] }} Block
 */

/**
 * The file in order. A line-leading comment opens a block; the declarations that follow fill it.
 * A block that never fills was a heading over the ones beneath it, which is what the ramps have.
 *
 * The one line-leading comment that titles nothing is one written *into* a run of declarations,
 * with no blank line above it: the surfaces ladder and the border tiers each break off mid-scale
 * to argue for the step that follows. Those annotate the group they interrupt — splitting on them
 * would file two thirds of Surfaces under a sentence.
 *
 * @returns {Block[]}
 */
function read() {
  /** @type {Block[]} */
  const blocks = [];

  for (const match of source.matchAll(COMMENT_OR_DECLARATION)) {
    const [, comment, name, value] = match;
    const block = blocks[blocks.length - 1];

    if (comment !== undefined) {
      if (!ownsItsLine(match.index)) {
        // The `/* 12px */` beside a rem value: the token's own annotation.
        if (block?.tokens.length) block.tokens[block.tokens.length - 1].note = comment.trim();
      } else if (afterABlankLine(match.index) || !block?.tokens.length) {
        blocks.push({ ...caption(comment), tokens: [] });
      } else {
        const note = comment.replace(/\s+/g, ' ').trim();
        block.note = block.note ? `${block.note} ${note}` : note;
      }
      continue;
    }

    if (block) block.tokens.push({ name, value: value.replace(/\s+/g, ' ').trim(), note: '' });
  }

  // The file opens with its own account of the two layers, above every declaration. That is the
  // stylesheet's preamble, not a section of the token list.
  while (blocks.length && !blocks[0].tokens.length) blocks.shift();

  return blocks;
}

/** A stable anchor for the rail to scroll to, and for the address bar to keep. */
const slug = (title, index) =>
  `t-${index}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32)}`;

export const themeTokens = read().map((block, index) => ({
  ...block,
  id: slug(block.title || 'group', index),
  // A block the file wrote a heading for but declared nothing under is a heading over the blocks
  // beneath it — the colour ramps have one, and so do the composite type styles.
  heading: block.tokens.length === 0,
}));

export const themeTokenCount = themeTokens.reduce((total, block) => total + block.tokens.length, 0);

/** Every Layer 1 name, so the Layer 2 page can tell an alias from a literal. */
export const themeTokenNames = new Set(
  themeTokens.flatMap((block) => block.tokens.map((token) => token.name)),
);

/**
 * The composite type styles are five tokens describing one thing, so the page renders them as one
 * specimen: `--heading-xl-font-size` and its four siblings collapse to the family `--heading-xl`.
 */
/**
 * Where the composite styles live, found by their tokens rather than by their heading's wording:
 * the page draws the type specimen at the top of that group, which is where the file introduces
 * it. Identified structurally so a reworded comment cannot move it.
 */
export const compositeBlockId = themeTokens.find(
  (block) => block.tokens.length && block.tokens.every((token) => /^--(heading|body)-/.test(token.name)),
)?.id;

export const compositeStyles = [
  ...new Set(
    [...themeTokenNames]
      .map((name) =>
        /^(--(?:heading|body)-[a-z0-9]+)-(?:font-family|font-size|font-weight|line-height|letter-spacing)$/.exec(
          name,
        ),
      )
      .filter(Boolean)
      .map((match) => match[1]),
  ),
];
