# CampSight

Monitor campsite availability on Recreation.gov and get notified when sites open up.

## Architecture

- **Frontend** — React + Vite + TypeScript + SCSS Modules
- **Backend** — Express + TypeScript + SQLite (better-sqlite3 + Drizzle ORM)
- **Auth** — Firebase Auth (Google sign-in)
- **Notifications** — Resend (email)
- **Scheduler** — node-cron (in-process, every 15 min)
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
```

### Environment Variables

See `.env.example` for the full list. Key variables:

| Variable | Where | Description |
|---|---|---|
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Backend | Firebase Admin service account JSON (single line) |
| `RESEND_API_KEY` | Backend | Resend API key for email notifications |
| `RIDB_API_KEY` | Backend | Recreation.gov RIDB API key |
| `DATABASE_PATH` | Backend | Path to SQLite database file |
| `CORS_ORIGIN` | Backend | Frontend URL for CORS |
| `VITE_FIREBASE_*` | Frontend | Firebase client configuration |
| `VITE_API_URL` | Frontend | Backend API URL |

## Deployment

### Frontend (Netlify)

1. Connect the repo to Netlify
2. Build command: `npx nx build web`
3. Publish directory: `dist/apps/web`
4. Set `VITE_*` environment variables in Netlify dashboard

### Backend (Railway)

1. Connect the repo to Railway
2. Railway's Railpack builder auto-detects Node.js (no Dockerfile needed)
3. `railway.toml` configures build/start commands
4. Mount a volume in the Railway UI (e.g. at `/data`)
5. Set `DATABASE_PATH=/data/campsight.db` and other env vars in Railway dashboard

## API Routes

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check (no auth) |
| `GET` | `/api/watches` | List user's watches |
| `POST` | `/api/watches` | Create a new watch |
| `PATCH` | `/api/watches/:id` | Update a watch |
| `DELETE` | `/api/watches/:id` | Delete a watch |
| `GET` | `/api/watches/:id/availability` | Get availability for a watch |
| `GET` | `/api/campsites/search?q=` | Search campgrounds/campsites |

## License

Private
