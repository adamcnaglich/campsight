import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';

import { log } from './lib/logger';
import { requestLogger } from './middleware/request-logger';
import { runMigrations } from './db/migrate';
import { authMiddleware } from './middleware/auth';
import { adminAuthMiddleware } from './middleware/admin-auth';
import watchesRouter from './routes/watches';
import campsitesRouter from './routes/campsites';
import trendingRouter from './routes/trending';
import adminRouter from './routes/admin';
import { startScheduler } from './services/scheduler';

// Run DB migrations on startup
runMigrations();

const app = express();

// Middleware
app.use(helmet());
app.use(compression());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:4200',
    credentials: true,
  }),
);
app.use(express.json());

// Request logging — placed after body parsing so it captures response times.
// It runs before auth so unauthenticated requests are logged too.
// Authenticated userId/email are attached later via customProps.
app.use(requestLogger);

// Health check (no auth)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Authenticated API routes
app.use('/api/watches', authMiddleware, watchesRouter);
app.use('/api/campsites', authMiddleware, campsitesRouter);
app.use('/api/trending', authMiddleware, trendingRouter);

// Admin routes (requires admin authentication)
app.use('/admin', adminAuthMiddleware, adminRouter);

// Start server
const port = process.env.PORT || 3333;
const server = app.listen(port, () => {
  log.api.info('🏕️ Starting Campsight API');
  log.api.info(
    { port: Number(port) },
    `Server listening at http://localhost:${port}`,
  );

  // Start the availability check scheduler
  startScheduler();
});

server.on('error', (err) => {
  log.api.fatal({ err }, 'Server error');
});
