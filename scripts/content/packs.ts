import type { PackDefinition } from './record.ts';

/**
 * Empty until C2. C1 ships the machinery and changes not one byte of `packs/_source/`; the
 * rescue (conditions, C2), the macro generation table (C3) and the ship content (C10) each add
 * their definition here. `test/content-pipeline.test.ts` exercises the machinery against a
 * fixture in the meantime, so the standing tests are not waiting on content to become real.
 */
export const PACKS: PackDefinition[] = [];
