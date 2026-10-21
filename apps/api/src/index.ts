import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { Server } from 'socket.io';

import { authRouter } from './routes/auth.routes';
import { tripsRouter } from './routes/trips.routes';
import { officersRouter } from './routes/officers.routes';
import { adminRouter } from './routes/admin.routes';
import { devicesRouter } from './routes/devices.routes';
import { setupSockets } from './sockets';
import { APP_NAME } from '@raahat/shared';
import { legacyApi, serveWebApp } from './web';
import { webPushPublicKey } from './services/web-push.service';

const app = express();
const server = http.createServer(app);

// Cross-origin and security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  // Map tile requests need the site's origin, but never account paths or query data.
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  contentSecurityPolicy: { directives: {
    'script-src': ["'self'", "'unsafe-inline'", 'https://unpkg.com'],
    'style-src': ["'self'", "'unsafe-inline'", 'https://unpkg.com'],
    'img-src': ["'self'", 'data:', 'https://*.tile.openstreetmap.org', 'https://unpkg.com'],
    'connect-src': ["'self'", 'wss:', 'ws:', 'https://nominatim.openstreetmap.org'],
    'frame-src': ["'self'", 'about:'],
    'upgrade-insecure-requests': process.env.NODE_ENV === 'production' ? [] : null,
  } },
}));
app.use(cors({ origin: '*' }));
app.use(express.json());

// API Routes
for (const [prefix, router] of [
  ['/auth', authRouter], ['/trips', tripsRouter], ['/officers', officersRouter],
  ['/admin', adminRouter], ['/devices', devicesRouter],
] as const) {
  app.use(`/api${prefix}`, router);
  app.use(prefix, legacyApi(router));
}
app.use('/api', (_req, res) => { res.status(404).json({ error: 'API route not found' }); });

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: `${APP_NAME} API`,
    revision: process.env.RENDER_GIT_COMMIT || 'local',
    browserPushConfigured: !!webPushPublicKey(),
    timestamp: new Date().toISOString(),
  });
});

serveWebApp(app);

// Central error handling middleware
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({ error: 'Malformed JSON payload' });
    return;
  }
  console.error('[API Error]:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// Setup Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});
setupSockets(io);

const PORT = Number(process.env.PORT) || 4000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[${APP_NAME}] Server running on port ${PORT} (http://localhost:${PORT})`);
});

export { app, server, io };
