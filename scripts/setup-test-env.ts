// systems/worlds are CLONED, not symlinked — Foundry takes an exclusive LevelDB lock on every
// world db and compendium pack it can see, so a linked test instance would block your own
// Foundry from booting. CoW (APFS/reflink) makes cloning nearly free.
import {
  existsSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, unlinkSync, lstatSync, rmSync,
  readdirSync, readlinkSync, renameSync,
} from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname, resolve } from 'node:path';
import { homedir } from 'node:os';

const repo = process.cwd();
const TEST_DATA = join(repo, 'test', 'foundry-data');
const PORT = Number(process.env.TEST_FOUNDRY_PORT ?? 30005);
const TEST_WORLD = process.env.TEST_WORLD ?? 'motherrpg';
const RESET_WORLD = process.argv.includes('--reset-world');
const SYSTEM_ID = 'mothershiprpg';

function resolveFoundryData(): string {
  const candidates = [
    process.env.FOUNDRY_DATA,
    join(homedir(), 'Library', 'Application Support', 'FoundryVTT-v14', 'Data'),
    join(homedir(), 'Library', 'Application Support', 'FoundryVTT', 'Data'),
    join(homedir(), 'FoundryVTT', 'Data'),
  ].filter((p): p is string => Boolean(p));

  const found = candidates.find((p) => existsSync(p));
  if (!found) {
    console.error('❌ Could not find a Foundry Data dir to mirror. Set FOUNDRY_DATA. Looked in:');
    for (const p of candidates) console.error(`     - ${p}`);
    process.exit(1);
  }
  return found;
}

// `cp -R` keeps symlinks as symlinks, which declinkSystemPacks below relies on.
function cloneArgs(): string[] {
  if (process.platform === 'darwin') return ['-c', '-R', '-p'];
  if (process.platform === 'linux') return ['--reflink=auto', '-R', '-p'];
  return ['-R', '-p'];
}

// A recursive delete must never follow a link out of the isolated tree.
function removePath(p: string): void {
  const st = lstatSync(p, { throwIfNoEntry: false });
  if (!st) return;
  if (st.isSymbolicLink()) unlinkSync(p);
  else rmSync(p, { recursive: true, force: true });
}

// Stage into a sibling then swap, so an interrupted clone can't leave a half-populated tree.
function cloneTree(src: string, dest: string): void {
  const staging = `${dest}.staging`;
  removePath(staging);
  try {
    execFileSync('cp', [...cloneArgs(), src, staging], { stdio: 'pipe' });
  } catch {
    execFileSync('cp', ['-R', '-p', src, staging], { stdio: 'pipe' });
  }
  removePath(dest);
  renameSync(staging, dest);
}

function humanSize(dir: string): string {
  try {
    return execFileSync('du', ['-sh', dir], { encoding: 'utf8' }).split('\t')[0]?.trim() ?? '?';
  } catch {
    return '?';
  }
}

// npm run setup links each pack directory individually, so there's no single `packs` symlink to
// swap — left alone the test instance locks the repo's LevelDB, blocking packs.sh and your own
// Foundry. Everything else stays linked, so a Vite rebuild reaches the harness with no re-clone.
function declinkSystemPacks(systemsDir: string): void {
  const packsDir = join(systemsDir, SYSTEM_ID, 'packs');
  const st = lstatSync(packsDir, { throwIfNoEntry: false });
  if (!st) return;

  if (st.isSymbolicLink()) {
    const target = resolve(dirname(packsDir), readlinkSync(packsDir));
    unlinkSync(packsDir);
    if (existsSync(target)) cloneTree(target, packsDir);
    console.log(`   📦 ${SYSTEM_ID}/packs cloned (was → ${target})`);
    return;
  }

  let cloned = 0;
  for (const entry of readdirSync(packsDir)) {
    const p = join(packsDir, entry);
    const est = lstatSync(p, { throwIfNoEntry: false });
    if (!est?.isSymbolicLink()) continue;
    const target = resolve(packsDir, readlinkSync(p));
    unlinkSync(p);
    if (!existsSync(target)) {
      console.log(`   ✂️  ${entry} — dangling link dropped (packs not built?)`);
      continue;
    }
    cloneTree(target, p);
    cloned += 1;
  }
  if (cloned) console.log(`   📦 ${SYSTEM_ID}/packs — ${cloned} compendium(s) cloned off the repo`);
}

const foundryData = resolveFoundryData();
const configSource = join(dirname(foundryData), 'Config');

console.log(`📁 Data source:   ${foundryData}`);
console.log(`📁 Config source: ${configSource}\n`);

const configDir = join(TEST_DATA, 'Config');
const dataDir = join(TEST_DATA, 'Data');
mkdirSync(configDir, { recursive: true });
mkdirSync(join(dataDir, 'assets'), { recursive: true });
mkdirSync(join(TEST_DATA, 'Logs'), { recursive: true });

const licenseSrc = join(configSource, 'license.json');
if (existsSync(licenseSrc)) {
  copyFileSync(licenseSrc, join(configDir, 'license.json'));
  console.log('📋 copied license.json');
} else {
  console.warn(`⚠️  license.json not found at ${licenseSrc} — the test instance won't boot without it.`);
}
// A lingering admin.txt would reinstate an admin password we can't recover the plaintext for.
const adminTxt = join(configDir, 'admin.txt');
if (existsSync(adminTxt)) unlinkSync(adminTxt);

writeFileSync(
  join(configDir, 'options.json'),
  `${JSON.stringify({
    dataPath: `${TEST_DATA}/`,
    port: PORT,
    upnp: false,
    hostname: null,
    routePrefix: null,
    sslCert: null,
    sslKey: null,
    proxyPort: null,
    proxySSL: false,
    updateChannel: 'stable',
    language: 'en.core',
    world: null,
    telemetry: false,
  }, null, 2)}\n`,
);
console.log(`✅ wrote Config/options.json (port ${PORT}, upnp off)`);

// Refreshed every run — cheap enough (CoW) that "always" beats a staleness heuristic. `modules`
// comes along because a world may reference installed modules, and Foundry warns if any are missing.
for (const name of ['systems', 'modules'] as const) {
  const src = join(foundryData, name);
  if (!existsSync(src)) continue;
  const dest = join(dataDir, name);
  const started = process.hrtime.bigint();
  cloneTree(src, dest);
  console.log(`🧬 cloned ${name} (${humanSize(dest)}) in ${(Number(process.hrtime.bigint() - started) / 1e9).toFixed(1)}s`);
}
declinkSystemPacks(join(dataDir, 'systems'));

// Not refreshed: the world accumulates harness state. `--reset-world` for a clean slate.
const worldsDir = join(dataDir, 'worlds');
const worldsSt = lstatSync(worldsDir, { throwIfNoEntry: false });
if (worldsSt?.isSymbolicLink()) unlinkSync(worldsDir);
mkdirSync(worldsDir, { recursive: true });

const worldDest = join(worldsDir, TEST_WORLD);
if (RESET_WORLD) removePath(worldDest);

if (existsSync(worldDest)) {
  console.log(`🌍 world "${TEST_WORLD}" already cloned — left as is (--reset-world to refresh)`);
} else {
  const worldSrc = join(foundryData, 'worlds', TEST_WORLD);
  if (!existsSync(worldSrc)) {
    const available = readdirSync(join(foundryData, 'worlds'))
      .filter((n) => existsSync(join(foundryData, 'worlds', n, 'world.json')));
    console.error(`❌ World "${TEST_WORLD}" not found at ${worldSrc}`);
    console.error(`   Set TEST_WORLD to one of: ${available.join(', ') || '(none installed)'}`);
    process.exit(1);
  }
  cloneTree(worldSrc, worldDest);
  console.log(`🌍 cloned world "${TEST_WORLD}" (${humanSize(worldDest)}) — independent of the original`);
}

// Foundry won't auto-launch a world whose recorded systemVersion is newer than the installed
// one — and the mothershiprpg rename reset the installed version to 0.0.0 — so repoint the
// clone's system/systemVersion rather than requiring a hand-migrated world.
//
// safeMode strips every module from the clone on launch (Foundry's own flag, one-shot — it
// writes itself back to false after boot, so re-arm it every run): keeps a stray enabled
// module's CSS or overlay from bleeding into a visual baseline.
const worldManifest = join(worldDest, 'world.json');
if (existsSync(worldManifest)) {
  const world = JSON.parse(readFileSync(worldManifest, 'utf8')) as Record<string, unknown>;
  const { version } = JSON.parse(readFileSync(join(repo, "system.json"), 'utf8')) as { version: string };
  const was = { system: world.system, systemVersion: world.systemVersion };
  const repoint = was.system !== SYSTEM_ID || was.systemVersion !== version;
  if (repoint) {
    world.system = SYSTEM_ID;
    world.systemVersion = version;
  }
  if (repoint || world.safeMode !== true) {
    world.safeMode = true;
    writeFileSync(worldManifest, `${JSON.stringify(world, null, 2)}\n`);
  }
  if (repoint) {
    console.log(
      `   ↳ world.json ${was.system}@${was.systemVersion} → ${SYSTEM_ID}@${version} ` +
        '(clone only; the original is untouched)',
    );
  }
  console.log('   ↳ safeMode armed — Foundry drops every module from this clone on launch');
}

console.log('\n✨ Test data path ready at test/foundry-data (no shared LevelDBs — run your own Foundry freely)');
console.log('   Boot it with:  npm run test:foundry');
console.log('   Run e2e with:  npm run test:e2e');
