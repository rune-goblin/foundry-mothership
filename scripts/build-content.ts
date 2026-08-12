// content/books/** + content/ids.json -> packs/_source/**, then ./scripts/packs.sh pack as today.
//
//   node scripts/build-content.ts [--allocate] [--out DIR] [--manifest PATH]
//
// A record with no id in content/ids.json fails the build. --allocate mints one and rewrites the
// registry, which must then be committed: ids are never derived from a record's name or content,
// so the committed file is the only thing keeping an installed world's documents identifiable
// across a rebuild.
import { join } from 'node:path';
import { BOOKS } from './content/books.ts';
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

if (BOOKS.every((book) => book.packs.length === 0)) {
  console.log('No book declares a pack yet (S2 ships the pipeline, S3 the first content).');
  process.exit(0);
}

try {
  const result = build({
    root,
    books: BOOKS,
    registryPath: join(root, 'content/ids.json'),
    outDir,
    manifestPath,
    allocate,
  });

  const results = result.emitted.reduce((n, d) => n + d.results.length, 0);
  console.log(`✅ ${result.emitted.length} documents (${results} table results) → ${outDir}`);
  console.log(`   manifest → ${manifestPath}`);
  if (allocate) console.log('   ⚠️  content/ids.json was rewritten — review and commit it.');
} catch (error) {
  console.error(`❌ ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
