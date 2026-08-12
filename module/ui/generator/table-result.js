/**
 * A drawn RollTable reduced to the text to show and the documents to hand out.
 *
 * The emitted loadout rows are `text` results whose description is the printed list followed by
 * one `@UUID` link per item (MODERNIZATION.md §27), so one row yields several documents; trinket
 * and patch rows carry no link at all. The AppV1 generator matched `/(.*)(@UUID.*)/` and kept the
 * last link only, so a three-item loadout arrived as one item — and a linkless row matched
 * nothing, then threw on `match[1]`, which is why rolling a patch stopped working the moment the
 * generated tables shipped.
 */

const LINK = /@UUID\[([^\]]+)\](?:\{([^}]*)\})?/g;
const TRAILING_BREAKS = /(?:<br\s*\/?>\s*)+$/i;

export function parseResults(results = []) {
  const entries = [];
  const labels = [];

  for (const result of results) {
    if (result.type === 'text') {
      const description = result.description ?? '';
      const links = [...description.matchAll(LINK)];
      for (const [, uuid, label] of links) entries.push({ uuid, name: label || uuid });

      const printed = (links.length ? description.slice(0, links[0].index) : description)
        .replace(TRAILING_BREAKS, '')
        .trim();
      if (printed) labels.push(printed);
    } else {
      if (result.documentUuid) entries.push({ uuid: result.documentUuid, name: result.name });
      if (result.name) labels.push(result.name);
    }
  }

  return { text: labels.join('; '), entries };
}

/** The printed row number. Every emitted table is `NdX-1`, so the range start is the row. */
export const drawnRow = (draw) => draw.results[0]?.range?.[0] ?? draw.roll?.total ?? null;
