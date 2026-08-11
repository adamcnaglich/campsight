# Setup Guide

Complete guide to setting up CampSight for local development.

## Prerequisites

- Node.js 18+
- A Firebase project with Google Auth enabled
- A Resend account (free tier: 3,000 emails/month)
- An RIDB API key from https://ridb.recreation.gov

## Installation

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <your-repo-url>
cd campsight

# Install dependencies
npm install
```

### 2. Configure Environment Variables

```bash
# Copy the example env file
cp .env.example .env
```

Edit `.env` and fill in your values. See the [Environment Variables](#environment-variables) section below for details.

### 3. Set Up Firebase

1. Create a new Firebase project at https://console.firebase.google.com
2. Enable Google Authentication:
   - Go to **Authentication** → **Sign-in method**
   - Enable **Google** provider
3. Get your Firebase config:
   - Go to **Project settings** → **General**
   - Scroll to "Your apps" and create a web app
   - Copy the configuration values to your `.env` file (prefix with `VITE_FIREBASE_`)
4. Generate a service account key:
   - Go to **Project settings** → **Service accounts**
   - Click "Generate new private key"
   - Save the JSON file
   - Convert to single-line JSON and set as `FIREBASE_SERVICE_ACCOUNT_JSON` in `.env`

### 4. Set Up Resend

1. Create a Resend account at https://resend.com
2. Generate an API key from the dashboard
3. Verify your sending domain or use the Resend test domain
4. Add `RESEND_API_KEY` and `RESEND_FROM_EMAIL` to `.env`

### 5. Get Recreation.gov API Key

1. Visit https://ridb.recreation.gov
2. Request an API key (it's free)
3. Add `RIDB_API_KEY` to `.env`

## Environment Variables

### Backend Variables

| Variable | Required | Description | Example |
|---|---|---|---|
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Yes | Firebase Admin service account JSON (single line) | `{"type":"service_account",...}` |
| `RESEND_API_KEY` | Yes | Resend API key for email notifications | `re_xxxxxxxxxxxxx` |
| `RESEND_FROM_EMAIL` | Yes | Sender address for notification emails | `noreply@yourdomain.com` |
| `RIDB_API_KEY` | Yes | Recreation.gov RIDB API key | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |
| `DATABASE_PATH` | No | Path to SQLite database file | `./data/campsight.db` (default) |
| `CORS_ORIGIN` | No | Frontend URL for CORS | `http://localhost:4200` (default) |
| `CHECK_INTERVAL` | No | Cron expression for availability checks | `*/10 * * * *` (default: every 10 min) |
| `SCHEDULER_NOTIFY_CLEAR_AFTER_MISSES` | No | Consecutive unavailable checks before a notified date may alert again | `3` (default) |
| `LOG_LEVEL` | No | Log level: `debug`, `info`, `warn`, `error`, `fatal` | `debug` (dev), `info` (prod) |
| `PORT` | No | API server port | `3333` (default) |
| `NODE_ENV` | No | Environment mode | `development` or `production` |

### Frontend Variables

| Variable | Required | Description | Example |
|---|---|---|---|
| `VITE_FIREBASE_API_KEY` | Yes | Firebase web API key | `AIzaSyXXXXXXXXXXXXXXXX` |
| `VITE_FIREBASE_AUTH_DOMAIN` | Yes | Firebase auth domain | `your-project.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Yes | Firebase project ID | `your-project-id` |
| `VITE_FIREBASE_STORAGE_BUCKET` | Yes | Firebase storage bucket | `your-project.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Yes | Firebase messaging sender ID | `123456789012` |
| `VITE_FIREBASE_APP_ID` | Yes | Firebase app ID | `1:123456789012:web:abcdef` |
| `VITE_API_URL` | No | Backend API URL | `http://localhost:3333` (default) |

## Running Locally

### Start the Backend (API)

```bash
# Start the API server (http://localhost:3333)
npx nx serve api

# The API will:
# - Start the Express server
# - Initialize the SQLite database
# - Start the cron scheduler for availability checks
# - Enable pretty-printed logging
```

### Start the Frontend (Web)

```bash
# In a separate terminal, start the web app (http://localhost:4200)
npx nx serve web
```

### Running Both Simultaneously

You can run both in separate terminal windows/tabs, or use a tool like `concurrently`:

```bash
# Install concurrently globally
npm install -g concurrently

# Run both
concurrently "npx nx serve api" "npx nx serve web"
```

## Development Commands

### Build

```bash
# Build both apps
npx nx run-many -t build

# Build specific app
npx nx build web
npx nx build api
```

### Test

```bash
# Run tests
npx nx test web
npx nx test api

# Run tests in watch mode
npx nx test web --watch
```

### Lint

```bash
# Lint all projects
npx nx run-many -t lint

# Lint specific project
npx nx lint web
npx nx lint api
```

### Database Management

```bash
# Generate database migrations (after schema changes)
npx drizzle-kit generate

# Push schema changes to database
npx drizzle-kit push

# Open Drizzle Studio (database GUI)
npx drizzle-kit studio
```

## Project Structure

```
campsight/
├── apps/
│   ├── web/              # React frontend (Vite)
│   │   ├── src/
│   │   │   ├── components/   # Reusable UI components
│   │   │   ├── pages/        # Route pages
│   │   │   ├── context/      # React contexts (Auth)
│   │   │   ├── hooks/        # Custom hooks
│   │   │   ├── lib/          # Utilities (API client, etc.)
│   │   │   └── App/          # App root & routing
│   │   └── index.html
│   └── api/              # Express backend
│       ├── src/
│       │   ├── routes/       # API route handlers
│       │   ├── db/           # Database schema & migrations
│       │   ├── services/     # Business logic
│       │   ├── middleware/   # Express middleware (auth, logging)
│       │   └── main.ts       # Server entry point
│       └── project.json
├── libs/
│   └── shared/           # Shared code (types, schemas)
│       ├── src/
│       │   ├── types/        # TypeScript interfaces
│       │   └── schemas/      # Zod validation schemas
│       └── project.json
├── data/                 # SQLite database files (local)
├── docs/                 # Documentation
├── .env                  # Environment variables (not in git)
├── .env.example          # Example env file
├── nx.json               # Nx configuration
├── package.json          # Dependencies
└── tsconfig.base.json    # TypeScript configuration
```

## Troubleshooting

### Database Issues

If you encounter database errors:

```bash
# Delete the database and restart
rm -rf data/campsight.db
npx nx serve api
```

### Port Already in Use

If ports 3333 or 4200 are already in use:

```bash
# Change API port
PORT=3334 npx nx serve api

# Change web port (in apps/web/project.json)
# Or use the PORT environment variable if supported
```

### Firebase Authentication Errors

- Ensure your Firebase project has Google Auth enabled
- Verify your service account JSON is valid and properly formatted (single line)
- Check that `CORS_ORIGIN` matches your frontend URL

### RIDB API Rate Limits

The Recreation.gov API has rate limits. If you're hitting limits during development:
- Lengthen the `CHECK_INTERVAL` to check less frequently
- Add caching to reduce API calls
- Use mock data for testing

## Next Steps

Once you have the app running locally:
1. Visit http://localhost:4200
2. Sign in with Google
3. Search for a campground (try "Yosemite")
4. Create your first watch
5. Check the API logs to see the scheduler in action

For deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).
