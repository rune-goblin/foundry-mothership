import { chromium, type FullConfig } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { SYSTEM_ID, joinAsFirstGm, preflight } from './fixtures/foundry-clients.ts';

/**
 * Prove the harness is pointed at the world, system and content we meant to test, before any spec
 * runs. `reuseExistingServer` is on locally, so a stray Foundry on this port would otherwise be
 * reused silently and every result would be about the wrong target.
 *
 * A system needs no activation step — unlike a module, it is inherently active in a world built on
 * it — so what is left to check is the *content*. `dist/` reaches the harness through a symlink and
 * is always current, but **packs are copied**: repo → live data dir (`npm run setup`) → test tree
 * (every boot). A pack that has not been through that sequence is invisible here, and packing never
 * deletes, so a removed document lingers as a ghost. Both have cost whole cycles of green runs
 * against content that was not the content under test; the count check below is what says so.
 */

const repo = new URL('../../', import.meta.url);
const local = (path: string) => fileURLToPath(new URL(path, repo));

/** pack directory → compendium name, from the registry that owns the mapping. */
function expectedPackSizes(): Record<string, number> {
  const registry = JSON.parse(readFileSync(local('content/ids.json'), 'utf8')) as {
    packs: Record<string, { compendium: string }>;
  };
  return Object.fromEntries(
    Object.entries(registry.packs).map(([pack, { compendium }]) => [
      compendium,
      readdirSync(local(`packs/_source/${pack}`)).filter((f) => f.endsWith('.json')).length,
    ]),
  );
}

export default async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL = config.projects[0]?.use?.baseURL ?? 'http://127.0.0.1:30005';
  const expectedWorld = process.env.TEST_WORLD ?? 'mosh';

  // Everything knowable without a browser, first: a wrong or world-less server answers here in
  // milliseconds rather than as a 30-second timeout inside a login.
  const status = await preflight(baseURL, expectedWorld);

  const browser = await chromium.launch();
  const page = await browser.newPage({ baseURL, viewport: { width: 1440, height: 900 } });

  try {
    await joinAsFirstGm(page);

    const expected = expectedPackSizes();
    const packs = await page.evaluate(async (systemId: string) => {
      const g = (window as any).game;
      const own = (Array.from(g?.packs?.values?.() ?? []) as any[]).filter(
        (p) => p.metadata?.packageName === systemId,
      );
      return Promise.all(
        own.map(async (p) => ({ name: p.metadata.name as string, size: (await p.getIndex()).size as number })),
      );
    }, SYSTEM_ID);

    const served = Object.fromEntries(packs.map((p) => [p.name, p.size]));
    const wrong = Object.entries(expected).filter(([name, size]) => served[name] !== size);
    if (wrong.length) {
      throw new Error(
        `The compendia do not match packs/_source:\n` +
          wrong
            .map(([name, size]) => `  ${name}: ${size} source document(s), ${served[name] ?? 'no pack'} served`)
            .join('\n') +
          `\nA pack is compiled from source and then copied to the live data dir, and packing ` +
          `never deletes — so a stale or ghost-bearing pack needs the whole sequence:\n` +
          `  rm -rf packs/<name>   # only if a source document was removed\n` +
          `  ./scripts/packs.sh pack && npm run setup`,
      );
    }

    console.log(
      `[e2e] ${SYSTEM_ID} v${status.systemVersion} on Foundry ${status.version}, ` +
        `world "${status.world}", ${packs.length} compendium(s), ` +
        `${packs.reduce((n, p) => n + p.size, 0)} documents`,
    );
  } finally {
    await browser.close();
  }
}
