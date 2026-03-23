import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import node from '@astrojs/node';

export default defineConfig({
  integrations: [tailwind()],
  adapter: node({
    mode: 'standalone'
  }),
  server: {
    port: 3002,
    host: true, // This will bind to all interfaces (0.0.0.0)
    allowedHosts: ['todo.fhidan.com']
  },
  vite: {
    optimizeDeps: {
      include: ['sqlite3']
    },
    ssr: {
      external: ['sqlite3']
    }
  }
});