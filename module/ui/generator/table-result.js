// A loadout row's description can carry several @UUID links (one per item); trinket and patch
// rows carry none. Parse every link rather than matching a single trailing one.

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
