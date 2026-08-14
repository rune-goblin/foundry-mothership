import { readFileSync } from 'node:fs';
import { createServer as createNetServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer, type InlineConfig, type ViteDevServer } from 'vite';

import config from '../vite.config.ts';

/**
 * `npm run dev` is the only tier where Foundry loads our source instead of `dist/`, and it fails
 * silently: Foundry fetches the two files system.json names, so a 404 means `onInit` never runs,
 * no sheet registers, and every actor opens on Foundry's base sheet with nothing thrown. Both
 * entries broke that way, so the tier exists now.
 */

const manifest = JSON.parse(
  readFileSync(fileURLToPath(new URL('../system.json', import.meta.url)), 'utf8'),
) as { id: string; esmodules: string[]; styles: string[] };

const url = (declared: string) => `/systems/${manifest.id}/${declared}`;

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = createNetServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address();
      probe.close(() => resolve(typeof address === 'object' && address ? address.port : 0));
    });
  });
}

const onPort = (port: number): InlineConfig => ({
  ...config,
  logLevel: 'silent',
  server: { ...(config.server ?? {}), port, host: '127.0.0.1', open: false },
});

describe('the dev server serves what system.json asks Foundry to fetch', () => {
  let server: ViteDevServer;
  let origin: string;

  beforeAll(async () => {
    const port = await freePort();
    server = await createServer(onPort(port));
    await server.listen();
    origin = `http://127.0.0.1:${port}`;
  }, 30_000);

  afterAll(async () => {
    await server?.close();
  });

  it('serves the declared esmodule as the real source graph', async () => {
    const response = await fetch(origin + url(manifest.esmodules[0]));

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('javascript');
    // Vite's SPA fallback answers 200 with index.html, so the status alone proves nothing.
    expect(await response.text()).toContain('/module/init.ts');
  });

  it('serves the declared stylesheet as css, not as the module Vite defaults to', async () => {
    const response = await fetch(origin + url(manifest.styles[0]));

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/css');
    expect(await response.text()).toContain('images/icons/ui/system/logo.webp');
  });

  it('never proxies the dev server to itself', () => {
    const targets = Object.values(config.server?.proxy ?? {}).map((rule) =>
      String(typeof rule === 'string' ? rule : (rule.target ?? '')),
    );

    // A self-proxy resolves `localhost` with one dns.lookup; IPv4 against an ::1 bind refuses.
    for (const target of targets) expect(target).not.toContain(String(config.server?.port));
  });
});
