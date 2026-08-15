import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  // Compiles `.svelte` and `.svelte.js` so runes modules can be unit-tested headlessly.
  plugins: [svelte()],
  // Svelte's server export has no reactivity; runes only work against the browser entry.
  resolve: { conditions: ['browser'] },
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    setupFiles: ['test/setup.ts'],
    // Vitest stubs CSS imports to an empty string by default, `?raw` included — and the design
    // app's token reader parses css/tokens.css that way, so its spec would assert against nothing.
    css: true,
    globals: false,
  },
});
