import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { readFileSync } from 'node:fs';

const systemJSON = JSON.parse(readFileSync(new URL('./system.json', import.meta.url), 'utf8'));
const id = systemJSON.id;

const FOUNDRY = 'http://localhost:30000';

export default defineConfig({
  base: `/systems/${id}/dist/`,
  plugins: [svelte()],
  // `npm run dev` runs this as a reverse proxy in front of Foundry: open
  // http://localhost:30001/game (NOT :30000) and Vite serves our source with HMR while
  // proxying everything else — Foundry routes, the socket, our static files — to the
  // real server on :30000. Ignored by `vite build`.
  server: {
    port: 30001,
    open: '/game',
    proxy: {
      // The built entry doesn't exist in dev: bounce Foundry's request for it back to
      // Vite as the real source entry.
      [`/systems/${id}/dist/${id}.js`]: {
        target: 'http://localhost:30001',
        rewrite: () => '/module/index.js',
      },
      // Templates, lang, packs and art are served from disk by Foundry, not bundled.
      [`^/systems/${id}/(lang|packs|images|templates)/`]: FOUNDRY,
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
