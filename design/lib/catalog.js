// Every specimen under design/gallery/, registered by being there. A specimen declares what it is
// in a `<script module>` export; adding one file adds a gallery entry, and no list needs editing.
const modules = import.meta.glob('../gallery/*.svelte', { eager: true });

const GROUPS = ['Primitives', 'Sections', 'Item bodies', 'Dialog bodies', 'Windows'];

export const cases = Object.entries(modules)
  .filter(([, module]) => module.meta)
  .map(([file, module]) => ({
    id: file.split('/').pop().replace('.svelte', ''),
    component: module.default,
    ...module.meta,
  }))
  .sort((a, b) => {
    const group = GROUPS.indexOf(a.group) - GROUPS.indexOf(b.group);
    return group !== 0 ? group : a.title.localeCompare(b.title);
  });

export const groups = GROUPS.filter((group) => cases.some((entry) => entry.group === group));

/**
 * Which components in module/ui have no specimen. The gallery claims to be the complete set, so
 * the gap has to be visible in the app rather than known only to whoever wrote the catalog.
 */
const sources = Object.keys(
  import.meta.glob('../../module/**/*.svelte', { query: '?raw', import: 'default' }),
).map((path) => path.replace('../../', ''));

const shown = new Set(cases.flatMap((entry) => [entry.path, ...(entry.covers ?? [])]));

export const uncovered = sources.filter((path) => !shown.has(path)).sort();
