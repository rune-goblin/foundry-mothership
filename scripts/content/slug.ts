// The sign must survive. Macros come in pairs — "+1 Stress" vs "-1 Stress", "Panic Check [+]"
// vs "[-]" — and a naive slug collapses each pair onto one string, losing which is which. A
// mid-word hyphen is not a sign, so "Well-Rested" stays "well-rested". These are the rules
// scripts/packs.sh already applies to filenames, in the `[a-z0-9-]` idiom mothership-data uses
// for its record ids.
export function slug(name: string): string {
  const s = name
    .trim()
    .replace(/^\[?\+\]?/, 'plus ')
    .replace(/^\[?-\]?/, 'minus ')
    .replace(/\[?\+\]?\s*$/, ' plus')
    .replace(/\[?-\]?\s*$/, ' minus')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return s || 'unnamed';
}

export const CONTENT_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** The filename convention `scripts/packs.sh` applies after an unpack, so the two agree. */
export function fileSlug(name: string): string {
  const s = name
    .trim()
    .replace(/^\[?\+\]?/, 'plus ')
    .replace(/^\[?-\]?/, 'minus ')
    .replace(/\[?\+\]?\s*$/, ' plus')
    .replace(/\[?-\]?\s*$/, ' minus')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return s || 'unnamed';
}
