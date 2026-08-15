// Nothing else proves the committed packs/_source/** still matches what the catalogs would
// emit today — editing a catalog and forgetting `npm run content` ships stale output past every
// other gate (audit C4). canonical()'s determinism makes byte equality the right assertion.
import { expect, it } from 'vitest';
import { mkdtempSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { BOOKS } from '../scripts/content/books.ts';
import { build } from '../scripts/content/pipeline.ts';

const ROOT = join(import.meta.dirname, '..');
const SOURCE = join(ROOT, 'packs/_source');

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(relative(SOURCE, full));
  }
  return out;
}

it('packs/_source is exactly what a fresh build emits, byte for byte', () => {
  const built = build({
    root: ROOT,
    books: BOOKS,
    registryPath: join(ROOT, 'content/ids.json'),
    outDir: mkdtempSync(join(tmpdir(), 'mothership-freshness-')),
  });

  const committed = walk(SOURCE).sort();
  const freshlyBuilt = [...built.files.keys()].sort();
  expect(freshlyBuilt).toEqual(committed);

  for (const rel of freshlyBuilt) {
    expect(built.files.get(rel)).toBe(readFileSync(join(SOURCE, rel), 'utf8'));
  }
});
