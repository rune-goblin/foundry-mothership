import { emptyRegistry, type Registry } from './ids.ts';
import { INHERITED_PACKS, readPackSource } from './pack-source.ts';

/**
 * The registry as it must look for today's `packs/_source`. Run once to write
 * `content/ids.json`; re-derived by `test/content-registry.test.ts` on every run, so a seed that
 * drifts from the packs it was taken from fails CI rather than silently losing an id.
 */
export function seedFromPackSource(root: string): Registry {
  const registry = emptyRegistry();
  for (const { pack, compendium, documentType } of INHERITED_PACKS) {
    registry.packs[pack] = { compendium, documentType, documents: {} };
    for (const doc of readPackSource(root, pack).documents) {
      registry.packs[pack]!.documents[doc.contentId] = Object.keys(doc.results).length
        ? { id: doc.id, results: doc.results }
        : { id: doc.id };
    }
  }
  return registry;
}
