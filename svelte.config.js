import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  preprocess: vitePreprocess(),
  // Runes mode is opt-out by default; forcing it on rejects the Svelte 4 idioms
  // (`export let`, `$:`, `on:click`) rather than silently compiling them.
  compilerOptions: { runes: true },
};
