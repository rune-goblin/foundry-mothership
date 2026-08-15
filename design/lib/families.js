// The colour half of Layer 1, regrouped the way the Live Tokens palette editor groups it: one
// section per colour family, its ramp on top and the roles derived from it — surfaces, borders,
// text — underneath. tokens.css is written the other way round, all ramps and then all surfaces,
// because that is how a stylesheet reads; this is how a palette reads.
//
// The regrouping is done from the names, which carry the family already
// (`--surface-danger-high`, `--border-danger-subtle`, `--text-danger-muted`), so a new family
// appears here the moment its ramp does, and nothing is listed twice or lost.
import { themeTokens } from './theme-tokens.js';

/** The roles a family has, in the order the palette editor stacks them. */
const ROLES = [
  { title: 'Palette', prefix: '--color-' },
  { title: 'Surfaces', prefix: '--surface-' },
  { title: 'Borders', prefix: '--border-' },
  { title: 'Text', prefix: '--text-' },
];

const allTokens = themeTokens.flatMap((block) => block.tokens);

/**
 * The order the palette editor lists palettes in: the identity colours first, then the neutrals
 * they are read against, then the status colours last (live-tokens `PALETTE_SPECS`). tokens.css
 * declares them in a different order — neutral, then the status colours, then the vendored
 * swatches — because a stylesheet leads with what it measured. A palette leads with the brand.
 */
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

/**
 * The five ink roles that name no family — `--text-primary` and its siblings — are the neutral
 * text scale: they are what the system writes on paper when nothing else is asked for. The palette
 * editor lists exactly one Text scale per family, and this is neutral's.
 */
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

/**
 * What the family sections do not cover: the invariants, the widths, the type scales, the space and
 * radius scales, the gradients and the effects — everything that is not a colour derived from a
 * ramp. Kept in the file's own order, with any block the families emptied dropped.
 */
export const remainingBlocks = themeTokens
  .map((block) => ({ ...block, tokens: block.tokens.filter((token) => !claimed.has(token.name)) }))
  .filter((block) => block.tokens.length || block.heading)
  // A heading whose whole run moved into the family sections now titles nothing.
  .filter((block, index, kept) => !block.heading || kept[index + 1]?.tokens.length);
