import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'serve-team-markdown',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          // Decode URL to handle spaces or special characters
          const decodedUrl = decodeURIComponent(req.url);
          if (decodedUrl.startsWith('/AlmostTactical_Team/') || decodedUrl.startsWith('/AI_Team_Core/')) {
            const filePath = path.join(__dirname, decodedUrl);
            if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
              res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.end(fs.readFileSync(filePath, 'utf-8'));
              return;
            }
          }
          next();
        });
      }
    }
  ],
  server: {
    fs: {
      // Allow serving files from workspace root
      allow: ['.']
    }
  }
})
