import { defineConfig } from '@playwright/test';

const PORT = Number(process.env.TEST_FOUNDRY_PORT ?? 30005);
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './test/e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? 'github' : [['list'], ['html', { open: 'never' }]],
  // Joins the world as GM and asserts it is the world and system we meant to test, before any
  // spec runs. Fails loud rather than testing the wrong target.
  globalSetup: './test/e2e/global-setup.ts',
  use: {
    baseURL: BASE_URL,
    // Foundry refuses to init below 1366×768 and logs an error that can halt system load.
    viewport: { width: 1440, height: 900 },
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  // One service: a headless test Foundry serving the built dist/ bundle through the dev
  // scaffold's `dist` symlink, so e2e exercises the shipped artifact. `npm run test:e2e`
  // rebuilds dist and the packs first.
  webServer: {
    command: 'bash scripts/start-test-env.sh',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
    env: {
      TEST_WORLD: process.env.TEST_WORLD ?? 'mosh',
      TEST_FOUNDRY_PORT: String(PORT),
    },
  },
});
