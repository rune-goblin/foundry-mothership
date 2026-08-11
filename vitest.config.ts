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
    globals: false,
  },
});
