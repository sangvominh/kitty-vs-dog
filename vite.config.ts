import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

/**
 * Vite plugin: serve files from local-data/ at /local-data/ URL path.
 * Allows the app to fetch sprites and manifest.json from a user-managed folder.
 */
function serveLocalData(): Plugin {
  const localDataDir = path.resolve(__dirname, 'local-data');

  const mimeTypes: Record<string, string> = {
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
  };

  return {
    name: 'serve-local-data',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url || !req.url.startsWith('/local-data/')) return next();

        const urlPath = decodeURIComponent(req.url.slice('/local-data'.length));
        const filePath = path.join(localDataDir, urlPath);

        // Prevent path traversal
        if (!filePath.startsWith(localDataDir)) return next();

        try {
          if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            const ext = path.extname(filePath).toLowerCase();
            res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
            res.setHeader('Cache-Control', 'no-cache');
            fs.createReadStream(filePath).pipe(res);
            return;
          }
        } catch {
          /* fall through */
        }

        next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  base: '/kitty-vs-dog/', // Cấu hình đường dẫn cho GitHub Pages (đổi từ repo của bạn)
  plugins: [react(), serveLocalData()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@game': path.resolve(__dirname, './src/game'),
      '@ui': path.resolve(__dirname, './src/ui'),
      '@state': path.resolve(__dirname, './src/game/state'),
    },
  },
});
