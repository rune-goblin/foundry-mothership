// Scaffolds Data/systems/mothership as a real directory whose entries symlink back to this
// repo, so edits are live in Foundry. Deliberately NOT a whole-repo symlink: that would
// expose node_modules/ and .git to the server.
//
// packs/ is the exception: it is COPIED, not linked. Foundry takes an exclusive LevelDB lock
// on every pack it can see and compacts them in place, and a system cannot be disabled the way
// a module can. Linking therefore let a running Foundry mutate gitignored build output and
// block `packs.sh` while it was open. Copying costs a `npm run setup` after each
// `packs.sh pack`, and buys back the ability to rebuild packs without closing Foundry.
//
// For a link-free install matching the release zip, use `npm run deploy`.

import { existsSync, lstatSync, mkdirSync, readdirSync, rmSync, symlinkSync, cpSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { detectFoundryData, SYSTEM_ID, warnIfWorldsPresent } from './foundry-data.ts';

const REPO = resolve(import.meta.dirname, '..');

const DATA = detectFoundryData();
if (!DATA) {
  console.error('No Foundry data directory found — set FOUNDRY_DATA.');
  process.exit(1);
}
const TARGET = join(DATA, 'systems', SYSTEM_ID);

const LINKED = ['system.json', 'template.json', 'dist', 'templates', 'images', 'lang', 'data'];

if (!existsSync(join(REPO, 'dist'))) {
  console.error('dist/ is missing — run `npm run build` first.');
  process.exit(1);
}
if (!existsSync(join(DATA, 'systems'))) {
  console.error(`No systems/ under ${DATA}\nSet FOUNDRY_DATA to override.`);
  process.exit(1);
}

if (existsSync(TARGET) || lstatSync(TARGET, { throwIfNoEntry: false })) {
  rmSync(TARGET, { recursive: true, force: true });
  console.log(`removed existing ${TARGET}`);
}

mkdirSync(TARGET, { recursive: true });
for (const entry of LINKED) {
  const src = join(REPO, entry);
  if (!existsSync(src)) {
    console.warn(`  skip ${entry} (not in repo)`);
    continue;
  }
  symlinkSync(src, join(TARGET, entry));
  console.log(`  ${entry} -> ${src}`);
}

const packsOut = join(TARGET, 'packs');
mkdirSync(packsOut);
// _source holds the tracked JSON that packs/ is built from — it is not a compendium.
const leveldb = existsSync(join(REPO, 'packs'))
  ? readdirSync(join(REPO, 'packs'), { withFileTypes: true }).filter(
      (e) => e.isDirectory() && e.name !== '_source',
    )
  : [];
for (const pack of leveldb) {
  cpSync(join(REPO, 'packs', pack.name), join(packsOut, pack.name), {
    recursive: true,
    filter: (src) => !['LOCK', 'LOG', 'LOG.old'].includes(basename(src)) && !src.endsWith('.log'),
  });
}
console.log(`  packs/ -- ${leveldb.length} LevelDB packs COPIED (re-run after packs.sh pack)`);
if (!leveldb.length) console.warn('  ! no packs found — run `./scripts/packs.sh pack`');

warnIfWorldsPresent(DATA);
console.log(`\nLinked ${SYSTEM_ID} at ${TARGET}`);
console.log('Rerun after changing which top-level directories the system ships, or after packing.');
