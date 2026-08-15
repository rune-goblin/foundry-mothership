import { defineConfig, type Plugin } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { readFileSync } from 'node:fs';

const systemJSON = JSON.parse(readFileSync(new URL('./system.json', import.meta.url), 'utf8'));
const id = systemJSON.id;

const FOUNDRY = 'http://localhost:30000';

/**
 * Foundry fetches the two built files system.json names; dev emits neither. Renaming the request
 * before Vite's own middlewares see it keeps both under `base`, which is the only place Vite
 * serves the dev graph. Doing this with a proxy back to `localhost:30001` instead — as this
 * config used to — makes the server call itself over TCP, and Node resolves that `localhost`
 * with one dns.lookup: pick IPv4 while Vite is bound to ::1 and the entry dies on a refused
 * connection, silently, taking every sheet registration with it.
 */
const devEntry: Plugin = {
  name: 'mothership-dev-entry',
  apply: 'serve',
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      if (req.url === `/systems/${id}/dist/${id}.js`) req.url = `/systems/${id}/dist/module/index.js`;
      // `?direct` returns real text/css; without it Vite serves a CSS file as a JS module.
      else if (req.url === `/systems/${id}/dist/${id}.css`) req.url = `/systems/${id}/dist/css/mothership.css?direct`;
      next();
    });
  },
};

export default defineConfig({
  base: `/systems/${id}/dist/`,
  plugins: [svelte(), devEntry],
  // `npm run dev` runs this as a reverse proxy in front of Foundry: open
  // http://localhost:30001/game (NOT :30000) and Vite serves our source with HMR while
  // proxying everything else — Foundry routes, the socket, our static files — to the
  // real server on :30000. Ignored by `vite build`.
  server: {
    port: 30001,
    open: '/game',
    proxy: {
      // The two built entries are handled by `devEntry` above, before these rules run.
      // Templates, lang, packs and art are served from disk by Foundry, not bundled.
      [`^/systems/${id}/(lang|packs|images|fonts|templates)/`]: FOUNDRY,
      // Everything outside our system (Foundry core, other systems, modules).
      [`^(?!/systems/${id}/)`]: FOUNDRY,
      '/socket.io': { target: 'ws://localhost:30000', ws: true },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    minify: false,
    target: 'es2022',
    lib: {
      entry: './module/index.js',
      formats: ['es'],
      fileName: () => `${id}.js`,
    },
    rollupOptions: {
      output: {
        assetFileNames: (asset) => {
          const name = asset.name ?? asset.names?.[0] ?? '';
          return name.endsWith('.css') ? `${id}.css` : '[name][extname]';
        },
      },
    },
  },
});
