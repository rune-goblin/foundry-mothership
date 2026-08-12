// Refresh content/data/ from a mothership-data checkout.
//
//   node scripts/sync-content.ts [--from PATH] [--check] [--force]
//
// Never needed by CI or by a fresh clone: content/data is vendored and committed precisely so the
// build depends on nothing outside this repo. This script exists to make the update deliberate.
import { copyFileSync, existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';

const root = process.cwd();
const VENDORED = join(root, 'content/data');
const CHECKSUMS = join(VENDORED, 'CHECKSUMS');

const args = process.argv.slice(2);
const fromArg = args.indexOf('--from');
const check = args.includes('--check');
const force = args.includes('--force');

function fail(message: string): never {
  console.error(`❌ ${message}`);
  process.exit(1);
}

function digest(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function tracked(dir: string): string[] {
  const files = readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
  const schema = join(dir, 'schema');
  const schemas = existsSync(schema)
    ? readdirSync(schema).filter((f) => f.endsWith('.json')).sort().map((f) => `schema/${f}`)
    : [];
  return [...files, ...schemas];
}

function readChecksums(): Map<string, string> {
  const map = new Map<string, string>();
  for (const line of readFileSync(CHECKSUMS, 'utf8').split('\n')) {
    const [sha, rel] = line.split('  ');
    if (sha && rel) map.set(rel, sha);
  }
  return map;
}

const upstream = resolve(
  fromArg === -1 ? process.env.MOTHERSHIP_DATA ?? join(root, '../mothership-data') : args[fromArg + 1]!,
);
if (!existsSync(join(upstream, 'data')) || !existsSync(join(upstream, 'schema'))) {
  fail(`${upstream} has no data/ and schema/ — pass --from PATH or set MOTHERSHIP_DATA.`);
}
if (!statSync(join(upstream, 'data')).isDirectory()) fail(`${upstream}/data is not a directory.`);

// Drift this script cannot explain: someone hand-edited the vendored copy. Overwriting would
// destroy that edit silently, so it stops instead. Fix it upstream, then --force.
const recorded = readChecksums();
const localEdits = tracked(VENDORED).filter((rel) => digest(join(VENDORED, rel)) !== recorded.get(rel));
const missing = [...recorded.keys()].filter((rel) => !existsSync(join(VENDORED, rel)));
if ((localEdits.length || missing.length) && !force) {
  for (const rel of localEdits) console.error(`   edited locally: ${rel}`);
  for (const rel of missing) console.error(`   missing:        ${rel}`);
  fail(
    'content/data no longer matches CHECKSUMS. The vendored copy is generated — fix the defect ' +
      'in mothership-data and re-sync, or pass --force to discard these changes.',
  );
}

const incoming = new Map<string, string>();
for (const rel of tracked(join(upstream, 'data'))) incoming.set(rel, join(upstream, 'data', rel));
for (const rel of tracked(join(upstream, 'schema')).filter((r) => !r.startsWith('schema/'))) {
  incoming.set(`schema/${rel}`, join(upstream, 'schema', rel));
}

const added = [...incoming.keys()].filter((rel) => !recorded.has(rel)).sort();
const removed = [...recorded.keys()].filter((rel) => !incoming.has(rel)).sort();
const changed = [...incoming.entries()]
  .filter(([rel, src]) => recorded.has(rel) && digest(src) !== recorded.get(rel))
  .map(([rel]) => rel)
  .sort();

for (const rel of added) console.log(`   + ${rel}`);
for (const rel of removed) console.log(`   - ${rel}`);
for (const rel of changed) console.log(`   ~ ${rel}`);

if (!added.length && !removed.length && !changed.length) {
  console.log(`✅ content/data is identical to ${upstream}`);
  process.exit(0);
}
if (check) {
  console.error(`❌ content/data is ${added.length + removed.length + changed.length} file(s) behind ${upstream}`);
  process.exit(1);
}

for (const rel of removed) fail(`${rel} is gone upstream. Removing vendored content is a deliberate change — delete it by hand and re-run.`);
for (const [rel, src] of incoming) copyFileSync(src, join(VENDORED, rel));

const lines = tracked(VENDORED).map((rel) => `${digest(join(VENDORED, rel))}  ${rel}`);
writeFileSync(CHECKSUMS, `${lines.join('\n')}\n`);

console.log(`\n✅ synced ${incoming.size} file(s) from ${upstream}; CHECKSUMS rewritten.`);
console.log('   Update the table in content/data/PROVENANCE.md, then review the JSON diff.');
