# Local Development Setup

How to run CampSight from source. For running it on your network, see [Deploy with Portainer](../README.md#deploy-with-portainer) in the README.

## Prerequisites

- Node.js 22 or newer
- An SMTP account for alert emails (iCloud Mail with an app-specific password works)
- A [RIDB](https://ridb.recreation.gov) API key (free)
- Optional: a Google Maps JavaScript API key for the campsite map

## Install

```bash
git clone https://github.com/adamcnaglich/campsight.git
cd campsight
npm install
cp .env.example .env
```

Fill in `NOTIFY_EMAIL`, `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` and `RIDB_API_KEY` in `.env`. Everything else has a working default. The full list is in the [Configuration](../README.md#configuration) table.

## Run

```bash
npx nx serve api   # API on http://localhost:3333
npx nx serve web   # Web app on http://localhost:4200
```

The Vite dev server proxies `/api`, `/health` and `/config.js` to the API, so the web app talks to it the same way it does in the container. There is no sign-in; open http://localhost:4200 and you are on the dashboard.

The API creates `data/campsight.db` and runs its migrations on first start.

## Production-style run

This mirrors what the container does: one process serving the API and the built SPA.

```bash
NODE_ENV=production npx nx run-many -t build -p api,web
WEB_DIR=dist/apps/web node dist/apps/api/main.js
```

Open http://localhost:3333.

## Useful commands

```bash
npx nx run-many -t lint                            # lint everything
npx tsc --noEmit -p apps/web/tsconfig.app.json     # type-check the web app
npx tsc --noEmit -p apps/api/tsconfig.app.json     # type-check the API
npx drizzle-kit studio                             # browse the database
docker build -t campsight .                        # build the container image
```

## Project layout

```
apps/web/src
├── App/            # routes
├── components/     # UI building blocks (Navbar, MapView, DateRangePicker, …)
├── pages/          # Dashboard, New (wizard), WatchDetail, Settings, Admin, DS
├── hooks/          # useMe (local user), useDocumentTitle, useMediaQuery
└── lib/            # api client, runtime config, date helpers

apps/api/src
├── main.ts         # Express app, static SPA, routes
├── middleware/     # local-user (single-user mode), request logging
├── routes/         # watches, campsites, available, admin
├── services/       # scheduler, availability fetch/diff, notifications
└── db/             # Drizzle schema and startup migrations

libs/shared/src     # Zod schemas and types used by both apps
```

## Troubleshooting

**`better-sqlite3` fails to install.** It ships prebuilt binaries for Node 22 and newer. Check `node --version`; on an unsupported version it falls back to compiling from source.

**Reset the database.**

```bash
rm -f data/campsight.db*
npx nx serve api
```

**No alert emails.** The scheduler logs `NOTIFY_EMAIL not set` or `SMTP_HOST not set` when either is missing. Use the admin panel's Email tab to send a test message.

**Recreation.gov rate limits.** Lengthen `CHECK_INTERVAL` or raise `SCHEDULER_REQUEST_DELAY_MS`. The scheduler backs off on its own for `SCHEDULER_RATE_LIMIT_COOLDOWN_MS` after a 429.
