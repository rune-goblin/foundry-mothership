// Regroups tokens.css's colour tokens by family (ramp, then the surfaces/borders/text derived
// from it) instead of by role. Derived purely from the token names, so a new family appears here
// the moment its ramp does, with nothing to list by hand.
import { themeTokens } from './theme-tokens.js';

const ROLES = [
  { title: 'Palette', prefix: '--color-' },
  { title: 'Surfaces', prefix: '--surface-' },
  { title: 'Borders', prefix: '--border-' },
  { title: 'Text', prefix: '--text-' },
];

const allTokens = themeTokens.flatMap((block) => block.tokens);

/** Identity colours first, then the neutrals they're read against, then status colours last —
 *  tokens.css orders these differently (measured neutrals and status colours first). */
const PALETTE_ORDER = [
  'brand',
  'accent',
  'special',
  'canvas',
  'neutral',
  'alternate',
  'info',
  'success',
  'warning',
  'danger',
];

/** Every family with a ramp, in the palette's order; anything new falls in after, as the file has it. */
const names = [
  ...new Set(
    allTokens
      .map((token) => /^--color-([a-z]+)-/.exec(token.name)?.[1])
      .filter((name) => name !== undefined),
  ),
].sort((a, b) => {
  const rank = (name) => (PALETTE_ORDER.includes(name) ? PALETTE_ORDER.indexOf(name) : Infinity);
  return rank(a) - rank(b);
});

const isFamily = (name) => names.includes(name);

/** `--text-primary` and its siblings name no family — they're the neutral text scale, what the
 *  system writes on paper when nothing else is asked for. */
const familyOf = (name) => {
  const role = ROLES.find((entry) => name.startsWith(entry.prefix));
  if (!role) return undefined;
  const rest = name.slice(role.prefix.length).split('-')[0];
  if (isFamily(rest)) return rest;
  return role.prefix === '--text-' ? 'neutral' : undefined;
};

const scaleFor = (family, role) =>
  allTokens.filter((token) => token.name.startsWith(role.prefix) && familyOf(token.name) === family);

export const families = names.map((name) => {
  const scales = ROLES.map((role) => ({ title: role.title, tokens: scaleFor(name, role) })).filter(
    (scale) => scale.tokens.length,
  );

  // The prose the stylesheet wrote over the ramp belongs to the family, not to the ramp alone.
  const block = themeTokens.find(
    (entry) => entry.tokens.length && entry.tokens[0].name.startsWith(`--color-${name}-`),
  );

  return {
    name,
    id: `f-${name}`,
    title: block?.title ?? name,
    note: block?.note ?? '',
    scales,
    count: scales.reduce((total, scale) => total + scale.tokens.length, 0),
  };
});

/** Every name the family sections account for, so the page can show what is left over exactly once. */
export const claimed = new Set(
  families.flatMap((family) => family.scales.flatMap((scale) => scale.tokens.map((t) => t.name))),
);

export const familyTokenCount = claimed.size;

/** Everything not a colour derived from a ramp, in the file's own order. */
export const remainingBlocks = themeTokens
  .map((block) => ({ ...block, tokens: block.tokens.filter((token) => !claimed.has(token.name)) }))
  .filter((block) => block.tokens.length || block.heading)
  // A heading whose whole run moved into the family sections now titles nothing.
  .filter((block, index, kept) => !block.heading || kept[index + 1]?.tokens.length);
