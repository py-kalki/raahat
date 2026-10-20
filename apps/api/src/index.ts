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

const app = express();
const server = http.createServer(app);

// Cross-origin and security middleware
app.use(helmet());
app.use(cors({ origin: '*' }));
app.use(express.json());

// API Routes
app.use('/auth', authRouter);
app.use('/trips', tripsRouter);
app.use('/officers', officersRouter);
app.use('/admin', adminRouter);
app.use('/devices', devicesRouter);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: `${APP_NAME} API`,
    timestamp: new Date().toISOString(),
  });
});

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
