import { test as base, type Page, type BrowserContext } from '@playwright/test';

declare global {
  // Foundry's runtime globals on `window`. Declared `any` — specs reach into them loosely.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, no-var
  var game: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, no-var
  var ui: any;
}

export const SYSTEM_ID = 'mothershiprpg';

/** What `GET /api/status` reports. `users` is the count of sessions currently joined. */
export type FoundryStatus = {
  active: boolean;
  version: string;
  world?: string;
  system?: string;
  systemVersion?: string;
  users?: number;
};

export const FREE_THE_PORT =
  'lsof -ti:30005 | xargs kill -9; until ! lsof -ti:30005 >/dev/null; do sleep 1; done';

/**
 * Poll until the reading satisfies `done`, or the deadline passes; return the last reading either
 * way. A session Foundry is still releasing looks exactly like one that is stuck, and only time
 * tells them apart -- so every check that could catch a teardown mid-flight waits before it judges.
 */
async function settle<T>(read: () => Promise<T>, done: (value: T) => boolean, ms = 10_000): Promise<T> {
  const deadline = Date.now() + ms;
  let value = await read();
  while (!done(value) && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    value = await read();
  }
  return value;
}

/**
 * Everything that can be known before a browser opens. Each of these used to surface as the same
 * 30-second `game.ready` timeout deep inside a join, which says nothing about which of them it was.
 *
 * Playwright reuses a server already on the port (`webServer.reuseExistingServer`), so the one
 * answering may not be the one this harness would have started — a stray launched without
 * TEST_WORLD serves no world at all.
 */
export async function preflight(baseURL: string, expectedWorld: string): Promise<FoundryStatus> {
  const url = new URL('/api/status', baseURL);
  const read = async (): Promise<FoundryStatus> => {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return (await response.json()) as FoundryStatus;
    } catch (error) {
      throw new Error(
        `No Foundry answered ${url} (${(error as Error).message}). Start one with: npm run test:e2e`,
      );
    }
  };

  // Foundry answers HTTP as soon as it is listening, which is before it has finished launching
  // the world -- so `active` is waited for, not judged on the first reading.
  let status = await settle(read, (s) => s.active, 20_000);

  if (!status.active) {
    throw new Error(
      `Foundry ${status.version} is running at ${baseURL} with no world launched. Playwright ` +
        `reuses whatever is already on the port, so this is usually a stray server started ` +
        `without TEST_WORLD. Free the port and let the harness start its own:\n  ${FREE_THE_PORT}`,
    );
  }
  if (status.system !== SYSTEM_ID) {
    throw new Error(
      `World "${status.world}" runs system "${status.system}", expected "${SYSTEM_ID}". ` +
        `Wrong or stale server on this port:\n  ${FREE_THE_PORT}`,
    );
  }
  if (status.world !== expectedWorld) {
    throw new Error(
      `Connected to world "${status.world}", expected "${expectedWorld}". Set TEST_WORLD, or ` +
        `free the port so the harness launches its own:\n  ${FREE_THE_PORT}`,
    );
  }
  if (status.users) status = await settle(read, (s) => !s.users);
  if (status.users) {
    throw new Error(
      `${status.users} session(s) already joined to "${status.world}". Foundry hands one session ` +
        `per user, so the harness would wait on a login it cannot get. Close the browser tab you ` +
        `have open on this world, or restart the server:\n  ${FREE_THE_PORT}`,
    );
  }
  return status;
}

/**
 * Drive Foundry's /join screen to log this context in as a specific user.
 *
 * The world is launched a moment after the server starts answering HTTP, and a client that joins
 * into the tail of that can sit at /game with no world for as long as you leave it. Reloading is
 * what a person does, and it costs nothing when the first attempt was fine -- so the join gets one.
 */
export async function joinAs(page: Page, userId: string, password = ''): Promise<void> {
  await page.goto('/join');
  await page.selectOption('select[name="userid"]', userId);
  if (password) await page.fill('input[name="password"]', password);
  await Promise.all([
    page.waitForURL(/\/game\b/, { timeout: 30_000 }),
    page.click('button[name="join"]'),
  ]);
  try {
    await waitForGameReady(page);
  } catch (first) {
    await page.reload();
    await waitForGameReady(page, `after a reload (the first attempt: ${(first as Error).message})`);
  }
}

/** Join as the world's first GM (role >= 4). The test world must have a password-less GM. */
export async function joinAsFirstGm(page: Page): Promise<void> {
  const read = async () => {
    await page.goto('/join');
    await page.waitForLoadState('networkidle');
    return page.evaluate(() => {
      const g = (window as any).game;
      const gm = (Array.from(g?.users?.values?.() ?? []) as any[]).find((u) => u.role >= 4);
      return {
        view: g?.view ?? null,
        world: g?.world?.id ?? null,
        gmId: gm?.id ?? null,
        gmActive: gm?.active ?? false,
      };
    });
  };

  // The previous session may still be releasing -- global-setup joins and leaves before the
  // worker does, and its socket closes on its own schedule.
  const state = await settle(read, (s) => !s.gmActive);
  // No active world → Foundry bounced us to /setup. The usual cause is a world needing migration;
  // --world will not auto-launch those.
  if (state.view !== 'join' || !state.world) {
    throw new Error(
      `No active world at this port (Foundry view: "${state.view}"). The requested world likely needs ` +
        `migration — launch it once in desktop Foundry to migrate it, then re-run.`,
    );
  }
  if (!state.gmId) throw new Error(`World "${state.world}" has no password-less GM user (role >= 4) on /join`);
  // Foundry hands one session per user, so joining as a GM another session already holds hangs
  // on a login that never completes.
  if (state.gmActive) {
    throw new Error(
      `The GM of "${state.world}" is already joined from another session, so this one cannot log ` +
        `in. Restart the server:\n  ${FREE_THE_PORT}`,
    );
  }
  await joinAs(page, state.gmId);
}

/**
 * Wait for `game.ready === true`. A blind timeout here says only "something is wrong somewhere",
 * so report what the page actually held — a system that threw during `init` never reaches ready,
 * and that is indistinguishable from a slow world until you look.
 */
export async function waitForGameReady(page: Page, attempt = 'on the first attempt'): Promise<void> {
  try {
    await page.waitForFunction(() => (window as any).game?.ready === true, undefined, {
      // The first connect after the harness re-clones the tree loads everything cold.
      timeout: 30_000,
    });
  } catch {
    const seen = await page.evaluate((id: string) => {
      const g = (window as any).game;
      return {
        url: window.location.pathname,
        view: g?.view ?? null,
        ready: g?.ready ?? null,
        world: g?.world?.id ?? null,
        system: g?.system?.id ?? null,
        api: typeof g?.[id] === 'object',
      };
    }, SYSTEM_ID);
    throw new Error(
      `game.ready never became true within 30s ${attempt}. The page held ${JSON.stringify(seen)}. ` +
        `A false \`api\` with the system loaded means the esmodule threw during init — run ` +
        `\`npm run build && npm run setup\` and check the browser console.`,
    );
  }
}

type WorkerFixtures = {
  gmContext: BrowserContext;
  gmPage: Page;
};

/**
 * `gmPage` — a worker-scoped context logged into the test world as the first GM. Worker scope
 * means one login for the whole suite (workers: 1); per-test isolation comes from each spec
 * creating throwaway `__e2e_`-named documents and deleting them, not from tearing down the browser.
 *
 * Unlike the module template there is no "enable the package" step: a system is inherently active
 * in a world built on it, which global-setup asserts instead.
 */
export const test = base.extend<object, WorkerFixtures>({
  gmContext: [
    async ({ browser }, use) => {
      const ctx = await browser.newContext();
      await use(ctx);
      await ctx.close();
    },
    { scope: 'worker' },
  ],
  gmPage: [
    async ({ gmContext }, use) => {
      const page = await gmContext.newPage();
      await joinAsFirstGm(page);
      // Foundry's permanent warning toasts overlay the top bar and intercept clicks. Each
      // `.notification` sets `pointer-events: all`, so hide the stack outright.
      await page.addStyleTag({ content: '#notifications { display: none !important; }' });
      await use(page);
    },
    { scope: 'worker' },
  ],
});

export { expect } from '@playwright/test';
