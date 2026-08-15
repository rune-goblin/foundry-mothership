// How a token should be drawn, decided from the value the browser computed rather than the one the
// file authored: `--surface-neutral-raised: var(--color-neutral-800)` is a colour, and only the
// computed side of it says so.
//
// The kinds are the Live Tokens editor's (TokenScaleTable's `ScaleKind`), minus the two scales Mothership
// has no tokens for and plus the two it does — gradients and shadows, which that editor gives their
// own sections rather than the table.

const COLOR = /^(#|rgba?\(|hsla?\(|oklch\(|oklab\(|lab\(|lch\(|color\(|transparent$|currentColor$)/i;
const LENGTH = /^-?[\d.]+(px|rem|em)$/;
const NUMBER = /^-?[\d.]+$/;

export function kindOf(name, computed) {
  if (name.startsWith('--gradient-') && computed.includes('gradient')) return 'gradient';
  if (name.startsWith('--shadow-') || name.startsWith('--ring-')) return 'shadow';
  if (name.startsWith('--font-weight-')) return 'weight';
  if (name.startsWith('--font-size-')) return 'font-size';
  if (name.startsWith('--letter-spacing-')) return 'letter-spacing';
  if (name.startsWith('--line-height-')) return 'plain';
  if (name.startsWith('--font-') || name.includes('font-family')) return 'family';
  if (COLOR.test(computed)) return 'color';
  if (name.startsWith('--radius-')) return 'radius';
  if (name.includes('border-width')) return 'border-width';
  if (name.startsWith('--space-') || LENGTH.test(computed) || NUMBER.test(computed)) return 'space';
  return 'plain';
}

/** Below this share, the group is several scales at once and no single layout tells the truth. */
const DOMINANT = 0.6;

/**
 * One layout per group, because a group is usually one scale. The commonest kind wins, so
 * `--space-full` at `100%` and `--radius-full` at `999px` do not drag their scales into a
 * different table.
 *
 * Two groups are genuinely mixed — the composite type styles are five scales interleaved, and the
 * gradients keep their angles and stops beside them — and those answer `mixed`, which is a row per
 * token carrying its own preview.
 */
export function groupKind(tokens, resolve) {
  const tally = new Map();
  for (const token of tokens) {
    const kind = kindOf(token.name, resolve(token.name));
    tally.set(kind, (tally.get(kind) ?? 0) + 1);
  }

  const [kind, count] = [...tally].sort((a, b) => b[1] - a[1])[0] ?? ['plain', 0];
  return count / tokens.length < DOMINANT ? 'mixed' : kind;
}

const RGB = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)\s*\)$/;

/**
 * The value the cascade actually produced on the surface the system is scoped to.
 *
 * An opaque `rgb()` is printed as its hex, because four steps of the danger ramp are authored that
 * way and every other step in the file is a hex — a column that alternates notation reads as though
 * the values differ in kind when only the spelling does. Alpha is left alone: `rgb(0 0 0 / 40%)`
 * has no hex that says the same thing as plainly.
 */
export function computedValue(scope, name) {
  const value = scope ? getComputedStyle(scope).getPropertyValue(name).trim() : '';
  const rgb = RGB.exec(value);
  if (!rgb) return value;
  return `#${rgb.slice(1).map((part) => Number(part).toString(16).padStart(2, '0')).join('')}`;
}

/**
 * What a swatch's caption says. A group's names share a prefix — `--color-neutral-` across a ramp,
 * `--surface-` across the surfaces — and the part after it is the whole distinction between one
 * swatch and its neighbour. Taken from the group rather than assumed, so a ramp captions `100…950`
 * and the surfaces caption `neutral-lowest…info-highest` without either being special-cased.
 */
export function stepLabels(names) {
  if (names.length < 2) return new Map(names.map((name) => [name, name.replace(/^--/, '')]));

  const parts = names.map((name) => name.split('-').filter(Boolean));
  let shared = 0;
  while (parts.every((part) => part[shared] !== undefined && part[shared] === parts[0][shared])) {
    shared++;
  }

  // A scale usually carries its unqualified role beside the qualified ones — `--surface-neutral`
  // among the seven `--surface-neutral-*` — and the shared prefix is that name entire. It is the
  // step the others are named against, so it is captioned as one rather than left blank.
  return new Map(
    names.map((name, index) => [name, parts[index].slice(shared).join('-') || 'base']),
  );
}

/** A bar is only legible if the scale it belongs to sets the top of the range. */
export function barScale(tokens, resolve) {
  const widest = Math.max(...tokens.map((token) => parseFloat(resolve(token.name)) || 0), 1);
  return (value) => `${Math.max(1, (parseFloat(value) || 0) / widest * 192)}px`;
}
