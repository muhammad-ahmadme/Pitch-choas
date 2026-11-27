import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { attachMultiplayerServer } from './server/multiplayerServer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  const mp = attachMultiplayerServer(httpServer);

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, ...mp.getStats() });
  });

  app.get('/api/online-stats', (_req, res) => {
    res.json(mp.getStats());
  });

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`Pitch Chaos server listening on http://0.0.0.0:${port}`);
  });
}

void startServer();
