// Scaffolds Data/systems/mosh as a real directory whose entries symlink back to this
// repo, so edits are live in Foundry. Deliberately NOT a whole-repo symlink: that would
// expose node_modules/ and .git to the server.
//
// packs/ is rebuilt entry-by-entry from the LevelDB directories only. The repo also
// carries legacy NeDB .db files, and Foundry runs with deleteNEDB:true — exposing them
// would let it delete tracked files out of the working tree.

import { existsSync, lstatSync, mkdirSync, readdirSync, rmSync, symlinkSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

const REPO = resolve(import.meta.dirname, '..');
const ID = 'mosh';

const DATA = process.env.FOUNDRY_DATA
  ?? join(homedir(), 'Library/Application Support/FoundryVTT/Data');
const TARGET = join(DATA, 'systems', ID);

const LINKED = ['system.json', 'template.json', 'dist', 'templates', 'images', 'lang', 'data'];

if (!existsSync(join(REPO, 'dist'))) {
  console.error('dist/ is missing — run `npm run build` first.');
  process.exit(1);
}
if (!existsSync(join(DATA, 'systems'))) {
  console.error(`No Foundry data directory at ${DATA}\nSet FOUNDRY_DATA to override.`);
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
const leveldb = readdirSync(join(REPO, 'packs'), { withFileTypes: true })
  .filter((e) => e.isDirectory());
for (const pack of leveldb) {
  symlinkSync(join(REPO, 'packs', pack.name), join(packsOut, pack.name));
}
console.log(`  packs/ -> ${leveldb.length} LevelDB packs (legacy .db files withheld)`);

console.log(`\nLinked ${ID} at ${TARGET}`);
console.log('Rerun after changing which top-level directories the system ships.');
