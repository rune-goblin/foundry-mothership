// A token's drawing kind is decided from its computed value, not the authored one:
// `--surface-neutral-raised: var(--color-neutral-800)` only reveals it's a colour once resolved.

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

/** The commonest kind in a group wins, so `--space-full` (100%) and `--radius-full` (999px) don't
 *  drag their scales into the wrong table. Genuinely mixed groups (composite type styles;
 *  gradients, which keep angles and stops beside them) answer `mixed` instead. */
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

/** rgb() is converted to hex for display consistency — four danger-ramp steps are authored as
 *  rgb() while every other step is hex. Alpha is left alone: it has no hex equivalent as plain. */
export function computedValue(scope, name) {
  const value = scope ? getComputedStyle(scope).getPropertyValue(name).trim() : '';
  const rgb = RGB.exec(value);
  if (!rgb) return value;
  return `#${rgb.slice(1).map((part) => Number(part).toString(16).padStart(2, '0')).join('')}`;
}

/** A swatch's caption is the part of its name after the group's shared prefix, so a ramp captions
 *  `100…950` and the surfaces caption `neutral-lowest…info-highest` without special-casing either. */
export function stepLabels(names) {
  if (names.length < 2) return new Map(names.map((name) => [name, name.replace(/^--/, '')]));

  const parts = names.map((name) => name.split('-').filter(Boolean));
  let shared = 0;
  while (parts.every((part) => part[shared] !== undefined && part[shared] === parts[0][shared])) {
    shared++;
  }

  // The shared prefix is often itself a token (`--surface-neutral` among the `--surface-neutral-*`
  // scale) — the step the others are named against, captioned 'base' rather than left blank.
  return new Map(
    names.map((name, index) => [name, parts[index].slice(shared).join('-') || 'base']),
  );
}

/** A bar is only legible if the scale it belongs to sets the top of the range. */
export function barScale(tokens, resolve) {
  const widest = Math.max(...tokens.map((token) => parseFloat(resolve(token.name)) || 0), 1);
  return (value) => `${Math.max(1, (parseFloat(value) || 0) / widest * 192)}px`;
}
