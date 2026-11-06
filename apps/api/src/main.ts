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
  AuthenticatedRequest,
  isHttps,
  requireAdmin,
  requireAuth,
  sessionMiddleware,
} from './middleware/auth';
import {
  ensureAdminUser,
  pruneExpiredSessions,
  toPublicUser,
} from './services/auth';
import authRouter from './routes/auth';
import watchesRouter from './routes/watches';
import campsitesRouter from './routes/campsites';
import availableRouter from './routes/available';
import adminRouter from './routes/admin';
import { startScheduler } from './services/scheduler';

// Run DB migrations on startup, then make sure an admin account exists
runMigrations();
ensureAdminUser();
pruneExpiredSessions();
setInterval(pruneExpiredSessions, 60 * 60 * 1000).unref();

const app = express();

// Middleware
// The SPA is served from this same process, so helmet's default CSP would
// block its Google Fonts, inline theme script and Google Maps; CSP is off
// rather than enumerated. Access control is the session login below.
app.use(
  helmet({
    contentSecurityPolicy: false,
    // Browsers ignore COOP on plain http (LAN access) and log an error for it.
    crossOriginOpenerPolicy: false,
  }),
);
app.use(compression());
// The SPA and API share an origin (and the Vite dev server proxies /api), so
// no cross-origin access is granted unless CORS_ORIGIN names one explicitly.
if (process.env.CORS_ORIGIN) {
  app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));
}
app.use(express.json());

// Visitors who reach us through Cloudflare over plain http are sent to https,
// so a password or session cookie never crosses the internet in the clear.
// Requests straight from the LAN carry no Cloudflare headers and stay on http.
app.use((req, res, next) => {
  const viaCloudflare = Boolean(
    req.headers['cf-ray'] || req.headers['cf-connecting-ip'],
  );
  if (viaCloudflare && !isHttps(req) && req.headers.host) {
    return res.redirect(308, `https://${req.headers.host}${req.originalUrl}`);
  }
  next();
});

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

// API routes. Every request is matched to a session; only /api/auth (sign in,
// sign out, invite links) is reachable without one.
app.use('/api', (_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
app.use('/api', sessionMiddleware);
app.use('/api/auth', authRouter);
app.get('/api/me', requireAuth, (req, res) => {
  res.json({ data: toPublicUser((req as AuthenticatedRequest).authUser) });
});
app.use('/api/watches', requireAuth, watchesRouter);
app.use('/api/campsites', requireAuth, campsitesRouter);
app.use('/api/available', requireAuth, availableRouter);
app.use('/api/admin', requireAuth, requireAdmin, adminRouter);

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
