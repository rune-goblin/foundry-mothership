import { chromium, type FullConfig } from '@playwright/test';
import { SYSTEM_ID, joinAsFirstGm } from './fixtures/foundry-clients.ts';

/**
 * Assert the harness is pointed at the world and system we meant to test, before any spec runs.
 * `reuseExistingServer` is on locally, so a stray Foundry on this port would otherwise be reused
 * silently and every result would be about the wrong target.
 *
 * A system needs no activation step — unlike a module, it is inherently active in a world built
 * on it — so this is purely a guard plus a provenance log.
 */
export default async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL = config.projects[0]?.use?.baseURL ?? 'http://127.0.0.1:30005';
  const expectedWorld = process.env.TEST_WORLD ?? 'mosh';
  const browser = await chromium.launch();
  const page = await browser.newPage({ baseURL, viewport: { width: 1440, height: 900 } });

  try {
    await joinAsFirstGm(page);

    const env = await page.evaluate(() => {
      const g = (window as any).game;
      return {
        world: g?.world?.id ?? null,
        system: g?.system?.id ?? null,
        systemVersion: g?.system?.version ?? '?',
        core: g?.version ?? '?',
        packs: (Array.from(g?.packs?.values?.() ?? []) as any[])
          .filter((p) => p.metadata?.packageName === 'mosh')
          .map((p) => p.metadata.name),
      };
    });

    if (env.system !== SYSTEM_ID) {
      throw new Error(
        `Connected world runs system "${env.system}", expected "${SYSTEM_ID}". Wrong or stale server on this port? ` +
          `Kill strays with: lsof -ti:30005 | xargs kill`,
      );
    }
    if (env.world !== expectedWorld) {
      throw new Error(
        `Connected to world "${env.world}" but TEST_WORLD is "${expectedWorld}". A stray Foundry is being reused — ` +
          `kill it (lsof -ti:30005 | xargs kill) and re-run, or set TEST_WORLD to match.`,
      );
    }

    console.log(
      `[e2e] ${SYSTEM_ID} v${env.systemVersion} on Foundry ${env.core}, world "${env.world}", ` +
        `${env.packs.length} compendium(s): ${env.packs.join(', ') || 'none'}`,
    );
  } finally {
    await browser.close();
  }
}
