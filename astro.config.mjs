import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import node from '@astrojs/node';

export default defineConfig({
  integrations: [tailwind()],
  adapter: node({
    mode: 'standalone'
  }),
  server: {
    port: 3000,
    host: '0.0.0.0'
  },
  vite: {
    optimizeDeps: {
      include: ['pg']
    }
  }
});