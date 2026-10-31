import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import * as fs from 'fs';
import * as path from 'path';

import { log } from './lib/logger';
import { requestLogger } from './middleware/request-logger';
import { runMigrations } from './db/migrate';
import {
  ensureLocalUser,
  getLocalUser,
  localUserMiddleware,
} from './middleware/local-user';
import watchesRouter from './routes/watches';
import campsitesRouter from './routes/campsites';
import availableRouter from './routes/available';
import adminRouter from './routes/admin';
import { startScheduler } from './services/scheduler';

// Run DB migrations on startup, then make sure the single local user exists
runMigrations();
ensureLocalUser();

const app = express();

// Middleware
// The SPA is served from this same process, so helmet's default CSP would
// block its Google Fonts, inline theme script and Google Maps. This app is
// meant for LAN access only, so CSP is off rather than enumerated.
app.use(
  helmet({
    contentSecurityPolicy: false,
    // Browsers ignore COOP on plain http and log an error for it; this app is LAN http.
    crossOriginOpenerPolicy: false,
  }),
);
app.use(compression());
// CORS only matters for the Vite dev server on another port; in the container
// the SPA and API share an origin.
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:4200',
    credentials: true,
  }),
);
app.use(express.json());

// Request logging — placed after body parsing so it captures response times.
app.use(requestLogger);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Runtime config for the SPA. Read at page load, so changing an env var and
// restarting the container is enough — no rebuild.
app.get('/config.js', (_req, res) => {
  const config = {
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '',
  };
  res.type('application/javascript');
  res.set('Cache-Control', 'no-cache');
  res.send(`window.__CAMPSIGHT_CONFIG__=${JSON.stringify(config)};`);
});

// API routes — all run as the local user
app.use('/api', localUserMiddleware);
app.get('/api/me', (_req, res) => {
  res.json({ data: getLocalUser() });
});
app.use('/api/watches', watchesRouter);
app.use('/api/campsites', campsitesRouter);
app.use('/api/available', availableRouter);
app.use('/api/admin', adminRouter);

// Static SPA. In the container the web build sits next to main.js in
// ./public; during `nx serve api` it is absent and Vite serves the app.
const webDir = path.resolve(process.env.WEB_DIR || path.join(__dirname, 'public'));
const indexHtml = path.join(webDir, 'index.html');

if (fs.existsSync(indexHtml)) {
  app.use(
    express.static(webDir, {
      index: false,
      setHeaders: (res, filePath) => {
        // Vite hashes everything under /assets, so those can be cached hard.
        if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      },
    }),
  );

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(indexHtml, { headers: { 'Cache-Control': 'no-cache' } });
  });

  log.api.info({ webDir }, 'Serving web app');
} else {
  log.api.warn({ webDir }, 'No web build found; serving API only');
}

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
