import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { createB202ApiMiddleware } from './server/apiMiddleware.js';

function b202ApiPlugin() {
  return {
    name: 'b202-api-plugin',
    configureServer(server) {
      server.middlewares.use(createB202ApiMiddleware());
    },
    configurePreviewServer(server) {
      server.middlewares.use(createB202ApiMiddleware());
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), b202ApiPlugin()],
  server: {
    host: true,
    port: 5173
  }
});
