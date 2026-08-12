// content/ + content/ids.json -> packs/_source/**, then ./scripts/packs.sh pack as today.
//
//   node scripts/build-content.ts [--allocate] [--out DIR] [--manifest PATH]
//
// A record with no id in content/ids.json fails the build. --allocate mints one and rewrites the
// registry, which must then be committed: ids are never derived from a record's name or content,
// so the committed file is the only thing keeping the shipped @UUID cross-references resolving.
import { join } from 'node:path';
import { PACKS } from './content/packs.ts';
import { build } from './content/pipeline.ts';

const root = process.cwd();
const args = process.argv.slice(2);

function flag(name: string): string | undefined {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? undefined : args[i + 1];
}

const allocate = args.includes('--allocate');
const outDir = flag('out') ?? join(root, 'packs/_source');
const manifestPath = flag('manifest') ?? join(root, 'build/content-manifest.json');

if (PACKS.length === 0) {
  console.log('No content packs are defined yet (C1 ships the pipeline, C2 the first content).');
  process.exit(0);
}

try {
  const result = build({
    root,
    packs: PACKS,
    registryPath: join(root, 'content/ids.json'),
    outDir,
    manifestPath,
    allocate,
    tiers: [
      { schema: join(root, 'content/schema'), data: join(root, 'content/local') },
      { schema: join(root, 'content/data/schema'), data: join(root, 'content/data'), strict: false },
    ],
  });

  const results = result.emitted.reduce((n, d) => n + d.results.length, 0);
  console.log(`✅ ${result.emitted.length} documents (${results} table results) → ${outDir}`);
  console.log(`   manifest → ${manifestPath}`);
  if (allocate) console.log('   ⚠️  content/ids.json was rewritten — review and commit it.');
} catch (error) {
  console.error(`❌ ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
