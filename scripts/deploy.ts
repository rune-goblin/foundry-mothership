// Build, then copy a clean, link-free system into Foundry's systems/ — the same shape the
// release zip ships. Unlike `npm run setup`, which symlinks back to the repo for live editing,
// this leaves a real directory that works without the repo present, so it is what to test a
// release against. Override the target with FOUNDRY_DATA.
//
// The file list mirrors .github/workflows/release.yml deliberately: if the two drift, `deploy`
// stops being a rehearsal of what ships.
import {
  existsSync, lstatSync, unlinkSync, rmSync, mkdirSync, cpSync, copyFileSync,
} from 'node:fs';
import { join, basename, dirname, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { detectFoundryData, SYSTEM_ID, warnIfWorldsPresent } from './foundry-data.ts';

const REPO = resolve(import.meta.dirname, '..');

const FILES = ['system.json', 'template.json', 'LICENSE.txt', 'README.md'];
const DIRS = ['dist', 'packs', 'lang', 'templates', 'images', 'data'];

const data = detectFoundryData();
if (!data) {
  console.error('No Foundry data directory found — set FOUNDRY_DATA.');
  process.exit(1);
}

console.log('Building…');
execFileSync('npm', ['run', 'build'], { stdio: 'inherit', cwd: REPO });

if (!existsSync(join(REPO, 'packs'))) {
  console.error('packs/ is missing — run `./scripts/packs.sh pack` first.');
  process.exit(1);
}

const dest = join(data, 'systems', SYSTEM_ID);
const existing = lstatSync(dest, { throwIfNoEntry: false });
if (existing?.isSymbolicLink()) {
  unlinkSync(dest); // a dev symlink → replace with a real copy
} else if (existing && !existing.isDirectory()) {
  console.error(`Refusing to deploy: ${dest} exists and is not a directory.`);
  process.exit(1);
}
mkdirSync(dest, { recursive: true });

// LevelDB lock/journal files and macOS cruft never belong in a deployed copy; _source is the
// tracked JSON that packs/ is built from, not a compendium.
function keep(src: string): boolean {
  const name = basename(src);
  if (name === '_source' || name === '.DS_Store') return false;
  if (name === 'LOCK' || name === 'LOG' || name === 'LOG.old') return false;
  return !name.endsWith('.log');
}

for (const file of FILES) {
  const from = join(REPO, file);
  if (!existsSync(from)) {
    console.log(`  skip ${file} (not in repo)`);
    continue;
  }
  const to = join(dest, file);
  // Deploying over a `setup` install would otherwise copy *through* its symlink and back into
  // the repo, leaving the "link-free" copy still pointing at the working tree. rmSync drops
  // the link itself, not its target.
  rmSync(to, { force: true });
  copyFileSync(from, to);
  console.log(`  ${file}`);
}

for (const dir of DIRS) {
  const from = join(REPO, dir);
  if (!existsSync(from)) {
    console.log(`  skip ${dir}/ (not in repo)`);
    continue;
  }
  const to = join(dest, dir);
  rmSync(to, { recursive: true, force: true });
  mkdirSync(dirname(to), { recursive: true });
  cpSync(from, to, { recursive: true, filter: keep });
  console.log(`  ${dir}/`);
}

warnIfWorldsPresent(data);
console.log(`\nDeployed ${SYSTEM_ID} -> ${dest}`);
console.log('A real directory, no symlinks: it survives the repo being moved or deleted.');
