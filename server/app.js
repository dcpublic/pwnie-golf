import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { securityHeaders, rateLimit } from './middleware.js';
import { holesRouter } from './routes/holes.js';
import { reservationsRouter } from './routes/reservations.js';
import { guestbookRouter } from './routes/guestbook.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(securityHeaders);
  app.use(express.json({ limit: '10kb' }));

  const writeLimiter = rateLimit({ windowMs: 60_000, max: 10 });
  app.post(['/api/reservations', '/api/guestbook'], writeLimiter);

  app.use('/api/holes', holesRouter);
  app.use('/api/reservations', reservationsRouter);
  app.use('/api/guestbook', guestbookRouter);
  app.get('/api/health', (req, res) => res.json({ status: 'root@pwnie-golf:~# OK' }));

  app.use(express.static(path.join(__dirname, '..', 'public')));
  // SPA fallback — everything non-API serves the shell.
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
  });

  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed' || err.type === 'entity.too.large') {
      return res.status(400).json({ error: 'Malformed request body' });
    }
    console.error(err);
    res.status(500).json({ error: 'Internal segfault. A marshal has been dispatched.' });
  });

  return app;
}
