import { defineConfig, type Plugin } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { createReadStream, existsSync } from 'node:fs';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = fileURLToPath(new URL('.', import.meta.url));

/** Resolved the way test/css-guards.test.ts resolves it, so both read the same installed build. */
const foundryApp =
  process.env.FOUNDRY_APP ??
  ['', ' v14']
    .map((suffix) => `/Applications/Foundry Virtual Tabletop${suffix}.app/Contents/Resources/app`)
    .find((path) => existsSync(join(path, 'public/css/foundry2.css'))) ??
  '';

const MIME: Record<string, string> = {
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

/**
 * Two directories the components assume a Foundry server is serving.
 *
 * `/foundry/` is the installed build's `public/`: loading its `foundry2.css` is what declares the
 * cascade layer order — `system` is layer 8 — so our `@layer system` rules rank here exactly as
 * they do in the application, and it brings the icon font every control writes `fa-*` against.
 * Without it the gallery would be a different cascade wearing the same class names.
 *
 * `/systems/mothershiprpg/` is this repo: css/mothership.css names its @font-face sources by the
 * runtime path, which resolves nowhere else.
 */
function servedByFoundry(): Plugin {
  const mounts: Array<[string, string]> = [
    ['/systems/mothershiprpg/', REPO],
    ...(foundryApp
      ? ([
          ['/foundry/', join(foundryApp, 'public')],
          // Every sample document's `img` is one of core's own icons, by the path Foundry serves.
          ['/icons/', join(foundryApp, 'public/icons')],
        ] as Array<[string, string]>)
      : []),
  ];

  return {
    name: 'mothership-design-foundry-assets',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? '').split('?')[0];
        const mount = mounts.find(([prefix]) => url.startsWith(prefix));
        if (!mount) return next();

        const [prefix, root] = mount;
        const file = normalize(join(root, decodeURIComponent(url.slice(prefix.length))));
        // `..` in the request would otherwise read anything on disk.
        if (!file.startsWith(root.endsWith(sep) ? root : root + sep) || !existsSync(file)) {
          res.statusCode = 404;
          return res.end();
        }

        res.setHeader('content-type', MIME[extname(file)] ?? 'application/octet-stream');
        createReadStream(file).pipe(res);
      });
    },
  };
}

export default defineConfig({
  root: 'design',
  plugins: [svelte(), servedByFoundry()],
  // Svelte's server export has no reactivity; runes only work against the browser entry.
  resolve: { conditions: ['browser'] },
  // 30000 is Foundry and 30001 is `npm run dev`'s proxy in front of it; this is neither.
  server: { port: 30010, open: true, fs: { allow: [REPO] } },
  build: { outDir: '../dist-design', emptyOutDir: true },
});
