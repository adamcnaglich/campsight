# CampSight

Monitor campsite availability on Recreation.gov and get notified when sites open up.

## Architecture

- **Frontend** — React + Vite + TypeScript + SCSS Modules + React Router + TanStack Query
- **Backend** — Express + TypeScript + SQLite (better-sqlite3 + Drizzle ORM) + Helmet + Compression + Pino (structured logging)
- **HTTP** — Axios
- **Auth** — Firebase Auth (Google sign-in)
- **Notifications** — Resend (email)
- **Scheduler** — node-cron (in-process, default every 15 min, configurable via `CHECK_INTERVAL`)
- **Monorepo** — Nx

```
campsight/
  apps/
    web/         React SPA (Vite)
    api/         Express REST API
  libs/
    shared/      Shared types, Zod schemas
```

## Getting Started

### Prerequisites

- Node.js 18+
- A Firebase project with Google Auth enabled
- A Resend account (free tier: 3,000 emails/month)
- An RIDB API key from https://ridb.recreation.gov

### Setup

```bash
# Install dependencies
npm install

# Copy env file and fill in your values
cp .env.example .env
```

### Development

```bash
# Start the API (http://localhost:3333)
npx nx serve api

# Start the web app (http://localhost:4200)
npx nx serve web

# Build both
npx nx run-many -t build

# Run tests
npx nx test web
npx nx test api
```

### Environment Variables

See `.env.example` for the full list. Key variables:

| Variable | Where | Description |
|---|---|---|
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Backend | Firebase Admin service account JSON (single line) |
| `RESEND_API_KEY` | Backend | Resend API key for email notifications |
| `RESEND_FROM_EMAIL` | Backend | Sender address for notification emails |
| `RIDB_API_KEY` | Backend | Recreation.gov RIDB API key |
| `DATABASE_PATH` | Backend | Path to SQLite database file |
| `CORS_ORIGIN` | Backend | Frontend URL for CORS |
| `CHECK_INTERVAL` | Backend | Cron expression for availability checks (default: `*/15 * * * *`) |
| `LOG_LEVEL` | Backend | Log level: `debug`, `info`, `warn`, `error`, `fatal` (default: `debug` in dev, `info` in prod) |
| `PORT` | Backend | API server port (default: `3333`) |
| `VITE_FIREBASE_*` | Frontend | Firebase client configuration |
| `VITE_API_URL` | Frontend | Backend API URL |

## Deployment

### Frontend (Netlify)

1. Connect the repo to Netlify — `netlify.toml` configures the build command, publish directory, and SPA redirects automatically
2. Set `VITE_*` environment variables in the Netlify dashboard

### Backend (Railway)

1. Connect the repo to Railway
2. Railway's Railpack builder auto-detects Node.js (no Dockerfile needed)
3. `railway.toml` configures build/start commands
4. Mount a volume in the Railway UI (e.g. at `/data`)
5. Set `DATABASE_PATH=/data/campsight.db` and other env vars in Railway dashboard

## Logging

The API uses [pino](https://github.com/pinojs/pino) for structured, high-performance logging.

- **Development** — pretty-printed, colorized output via `pino-pretty`
- **Production** (`NODE_ENV=production`) — JSON, one object per line, ready for log aggregators (Datadog, Loki, CloudWatch, etc.)

Every HTTP request is automatically logged with method, URL, status code, response time (ms), and the authenticated `userId` when available. Health check requests are excluded to reduce noise.

Named loggers per module (`api`, `auth`, `db`, `watches`, `campsites`, `scheduler`, `notify`) make it easy to filter and search. User activity — creating/updating/deleting watches, running searches, auth events — is logged at `INFO` level with contextual data (userId, watchId, campsite name, etc.).

Set `LOG_LEVEL` in `.env` to control verbosity (`debug` is the default in development).

## API Routes

All routes except `/health` require a Firebase Auth bearer token.

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check (no auth) |
| `GET` | `/api/watches` | List user's watches |
| `POST` | `/api/watches` | Create a new watch |
| `PATCH` | `/api/watches/:id` | Update a watch |
| `DELETE` | `/api/watches/:id` | Delete a watch |
| `GET` | `/api/watches/:id/availability` | Get availability for a watch |
| `GET` | `/api/campsites/search?q=&facilityId=` | Search campgrounds/campsites |

## License

Private
