import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';

import { runMigrations } from './db/migrate';
import { authMiddleware } from './middleware/auth';
import watchesRouter from './routes/watches';
import campsitesRouter from './routes/campsites';
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

// Health check (no auth)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Authenticated API routes
app.use('/api/watches', authMiddleware, watchesRouter);
app.use('/api/campsites', authMiddleware, campsitesRouter);

// Start server
const port = process.env.PORT || 3333;
const server = app.listen(port, () => {
  console.log(`🏕️ [API] Listening at http://localhost:${port}`);

  // Start the availability check scheduler
  startScheduler();
});

server.on('error', console.error);
