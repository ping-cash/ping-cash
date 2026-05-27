// @ts-check
import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://ping.cash',
  integrations: [
    svelte(),
    sitemap({
      serialize: (item) => {
        item.lastmod = new Date().toISOString().split('T')[0];
        return item;
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
  server: {
    host: '0.0.0.0',
    port: 4321,
  },
});
