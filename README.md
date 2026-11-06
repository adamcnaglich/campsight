# CampSight

**Never miss a campsite booking again.** CampSight watches Recreation.gov for the sites and dates you care about and emails you the moment one opens up.

This is a fork of [areknow/campsight](https://github.com/areknow/campsight) reworked for self-hosting: no Google or Firebase, its own email-and-password accounts, invite-only sign-up, one container. Run it as a Portainer stack on your LAN, or put it behind a tunnel for friends and family.

[![Built with React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)](https://react.dev/)
[![Built with Express](https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![Built with TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Monorepo: Nx](https://img.shields.io/badge/Monorepo-Nx-143055?logo=nx&logoColor=white)](https://nx.dev/)

---

## Table of Contents

- [What changed from upstream](#what-changed-from-upstream)
- [Deploy with Portainer](#deploy-with-portainer)
- [Putting it on the internet](#putting-it-on-the-internet)
- [Configuration](#configuration)
- [Features](#features)
- [How It Works](#how-it-works)
- [Local Development](#local-development)
- [Architecture](#architecture)
- [API Reference](#api-reference)
- [License](#license)

---

## What changed from upstream

- **Its own accounts instead of Google.** Firebase and Google OAuth are gone. People sign in with an email and password; passwords are hashed with scrypt and sessions live server-side behind an HTTP-only cookie. Each account sees only its own watches and gets alerts at its own address.
- **Invite-only.** There is no public sign-up. The admin (created from `ADMIN_EMAIL` and `ADMIN_PASSWORD`) invites people from the admin panel; each gets a one-time link, valid 7 days, to choose a password.
- **No landing, terms or access-request pages.** `/` goes to the dashboard, or to sign-in when signed out.
- **One container.** Express serves the built web app alongside the API, replacing the Netlify + Railway split. The admin API moved from `/admin` to `/api/admin` so it doesn't collide with the admin page.
- **Admin panel is admin-only.** Users and invites, scheduler controls, activity feed and a test-email button.
- **Runtime config.** The Google Maps key is read from `GOOGLE_MAPS_API_KEY` when the page loads, so changing it is an env edit and a restart, not a rebuild.
- **Upgrades in place.** A database from the earlier single-user version keeps working: its one user becomes the admin and keeps its watches.

---

## Deploy with Portainer

Portainer clones this repo and builds the image on your Docker host, so there is nothing to publish first. The first deploy takes a few minutes while Nx compiles both apps.

1. In Portainer go to **Stacks → Add stack** and name it `campsight`.
2. Pick **Repository**, set the URL to `https://github.com/adamcnaglich/campsight`, reference `refs/heads/main`, compose path `docker-compose.yml`.
3. Under **Environment variables**, click **Load variables from .env file** and upload a copy of [`stack.env.example`](stack.env.example) with your values, or add `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` and `RIDB_API_KEY` by hand.
4. **Deploy the stack**, then open `http://<host>:3333` and sign in with `ADMIN_EMAIL` and `ADMIN_PASSWORD`.

The compose file uses `build: .`, so it has to be deployed from the repository rather than pasted into the web editor, unless a `campsight:latest` image already exists on the host.

### Updating

New commits on `main` are picked up by rebuilding: open the stack and click **Pull and redeploy**. Leave **Re-pull image and redeploy** off; the image is built here, not pulled, and that toggle makes Portainer look for `campsight:latest` on Docker Hub (the compose file sets `pull_policy: build` so it is harmless if left on). To force a clean rebuild from a shell on the host, point compose at a checkout of this repo:

```bash
docker compose --env-file stack.env build --no-cache
docker compose --env-file stack.env up -d
```

### Data

SQLite lives on the `campsight-data` named volume at `/data/campsight.db`. To keep it in a host folder instead, replace the volume with a bind mount and `chown 1000:1000` that folder, since the container runs as the unprivileged `node` user.

### Image

The `Dockerfile` is a two-stage build: Nx compiles both apps, then a slim runtime image installs only the 13 packages the API bundle imports and serves the web build from `./public`. Build it anywhere with:

```bash
docker build -t campsight .
```

To have GitHub build and publish the image instead, move [`docs/github/docker-workflow.yml`](docs/github/docker-workflow.yml) to `.github/workflows/docker.yml` (pushing a workflow file needs a token with the `workflow` scope) and point the compose file at `ghcr.io/adamcnaglich/campsight:latest`.

---

## Putting it on the internet

The login makes this safe to do, in this order:

1. Deploy a version with accounts, sign in as the admin, and confirm a signed-out browser only sees the sign-in page.
2. Route a public hostname to port 3333. With Cloudflare Tunnel that is a public hostname on the tunnel pointing at `http://localhost:3333`; the cookie is marked `Secure` automatically when the request arrived over HTTPS.
3. Add the new address to your Google Maps key's allowed referrers, and set `PUBLIC_URL` if you want invite links to use it even when you create them from the LAN address.

Sign-ins are throttled per address and per email (10 failures locks for 15 minutes). For a second lock in front of the app, a Cloudflare Access policy on the hostname works without any changes here.

---

## Configuration

Set these as stack environment variables in Portainer (or in `.env` for local development).

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `ADMIN_EMAIL` | Yes | | The admin's sign-in email, also where the admin's alerts go |
| `ADMIN_PASSWORD` | Yes | | The admin's password, at least 8 characters. Applied on every start, so changing it here is also the recovery path |
| `PUBLIC_URL` | No | request address | Address used in invite links, e.g. `https://campsight.example.com` |
| `NOTIFY_EMAIL` | No | | Older installs only: used as the admin email when `ADMIN_EMAIL` is unset |
| `SMTP_HOST` | Yes | | SMTP server for alert emails, e.g. `smtp.mail.me.com` for iCloud |
| `SMTP_USER` | Yes | | SMTP login, e.g. your Apple ID address |
| `SMTP_PASS` | Yes | | SMTP password; iCloud needs an app-specific password |
| `RIDB_API_KEY` | Yes | | [RIDB](https://ridb.recreation.gov) key, used for campground details |
| `SMTP_PORT` | No | `587` | `587` uses STARTTLS, `465` implicit TLS |
| `SMTP_FROM` | No | `CampSight <SMTP_USER>` | Sender address; must be one your mail provider lets `SMTP_USER` send as |
| `SMTP_SECURE` | No | by port | `true` or `false` to override the TLS choice |
| `GOOGLE_MAPS_API_KEY` | No | | Google Maps JavaScript key for the campsite map. Without it the list view is used |
| `HOME_REGION` | No | `Michigan` | State shown in the "available near you" strip. On a LAN the client IP can't be geolocated, so this is used for every request |
| `CHECK_INTERVAL` | No | `*/15 * * * *` | Cron expression for availability checks |
| `CAMPSIGHT_PORT` | No | `3333` | Host port the stack publishes |
| `LOG_LEVEL` | No | `info` | `debug`, `info`, `warn`, `error` or `fatal` |
| `DATABASE_PATH` | No | `/data/campsight.db` | SQLite file location |
| `SCHEDULER_REQUEST_DELAY_MS` | No | `1000` | Pause between Recreation.gov requests in a cycle |
| `SCHEDULER_MAX_GROUPS_PER_CYCLE` | No | `0` | Cap on grouped campsite checks per cycle; `0` is unlimited |
| `SCHEDULER_RATE_LIMIT_COOLDOWN_MS` | No | `300000` | Back-off after a 429 from Recreation.gov |
| `SCHEDULER_NOTIFY_CLEAR_AFTER_MISSES` | No | `3` | Unavailable checks before a notified date may alert again |

---

## Features

- **5-step wizard** for campsite selection: search, campground, campsites, dates, review
- **Interactive map** of campsites when a Google Maps key is set, list view otherwise
- **Scheduled monitoring** polls Recreation.gov every 15 minutes (configurable)
- **Email alerts** over plain SMTP to each account's own address the first time a watched date turns available, with duplicate suppression
- **Accounts and invites** so friends and family can keep their own watches
- **Multi-site watches** track several campsites in one watch
- **Dashboard** to pause, resume, edit or delete watches
- **Admin panel** with users and invites, scheduler controls, run history and a test-email button

### Screenshots

| Dashboard | New watch: search |
| --- | --- |
| ![Dashboard](docs/screenshots/dashboard-with-watches.png) | ![Search](docs/screenshots/new-watch-search.png) |

| New watch: campgrounds | Watch detail |
| --- | --- |
| ![Campgrounds](docs/screenshots/new-watch-campgrounds.png) | ![Watch detail](docs/screenshots/watch-detail.png) |

---

## How It Works

```mermaid
flowchart TB
    User[Browser, signed in]
    App[Express: API + web app]
    SQLite[(SQLite on /data)]
    RecGov[Recreation.gov API]
    Mail[SMTP server]
    Scheduler[Cron Scheduler]

    User -->|HTTP :3333| App
    App -->|Queries| SQLite
    App -->|Search / details| RecGov
    Scheduler -->|Every 15 min| App
    App -->|Availability| RecGov
    App -->|Alert to the watch owner| Mail
```

1. You search for a recreation area or campground and pick campsites and dates.
2. The watch is stored in SQLite.
3. The scheduler checks availability for every active watch on the cron interval.
4. When a date flips to available, one email per watch goes to the account that owns it.
5. You book it on Recreation.gov.

```mermaid
sequenceDiagram
    participant User
    participant App as API + SPA
    participant DB as SQLite
    participant Scheduler
    participant RecGov as Recreation.gov
    participant Email as SMTP

    User->>App: POST /api/watches
    App->>DB: Store watch
    App-->>User: Created

    loop Every CHECK_INTERVAL
        Scheduler->>DB: Active watches
        Scheduler->>RecGov: Availability per campsite
        alt Newly available date
            Scheduler->>DB: Snapshot + notified_dates
            Scheduler->>Email: Send alert
            Email-->>User: Email to the watch owner
        end
    end
```

---

## Local Development

Requires Node 22 or newer.

```bash
npm install
cp .env.example .env     # fill in ADMIN_EMAIL, ADMIN_PASSWORD, SMTP_*, RIDB_API_KEY

npx nx serve api         # http://localhost:3333
npx nx serve web         # http://localhost:4200, proxies /api to 3333
```

To run the production bundle the way the container does:

```bash
NODE_ENV=production npx nx run-many -t build -p api,web
WEB_DIR=dist/apps/web node dist/apps/api/main.js
```

Other commands:

```bash
npx nx run-many -t lint          # lint all projects
npx tsc --noEmit -p apps/web/tsconfig.app.json
npx tsc --noEmit -p apps/api/tsconfig.app.json
npx drizzle-kit studio           # browse the SQLite database
```

Tables are created and migrated by the API on startup, so there is no separate migration step.

---

## Architecture

```
campsight/
├── apps/
│   ├── web/            # React 19 + Vite SPA
│   └── api/            # Express API, scheduler, serves the SPA in production
├── libs/
│   └── shared/         # Zod schemas and types shared by both apps
├── docs/               # Screenshots and the local setup guide
├── Dockerfile          # Two-stage image: build with Nx, run with 13 packages
├── docker-compose.yml  # Portainer stack (Repository deploy, builds from .)
└── stack.env.example   # Stack environment variables
```

**Frontend:** React 19, Vite, TypeScript, SCSS modules, TanStack Query, React Router, Lucide icons, `@vis.gl/react-google-maps`.

**Backend:** Express, TypeScript, better-sqlite3 + Drizzle ORM, Pino logging, Helmet, node-cron, nodemailer.

**Why SQLite:** zero configuration, one file to back up, plenty for a household's worth of watches.

---

## API Reference

Everything under `/api` needs a signed-in session cookie, except `/api/auth/*`. Routes under `/api/admin` also need the admin flag. `/health`, `/config.js` and the static app are public.

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/health` | Health check |
| `GET` | `/config.js` | Runtime config script loaded by the SPA |
| `POST` | `/api/auth/login` | Sign in with `email` and `password`; sets the session cookie. Locks after 10 failures in 15 minutes |
| `POST` | `/api/auth/logout` | End this session |
| `GET` | `/api/auth/invite/:token` | Which email an invite link is for |
| `POST` | `/api/auth/invite/:token` | Create the account (`displayName`, `password`) and sign in |
| `POST` | `/api/auth/password` | Change your own password; other sessions are signed out |
| `GET` | `/api/me` | The signed-in account (`id`, `email`, `displayName`, `isAdmin`) |
| `GET` | `/api/watches` | List watches |
| `POST` | `/api/watches` | Create a watch |
| `PATCH` | `/api/watches/:id` | Pause/resume or change dates |
| `DELETE` | `/api/watches/:id` | Delete a watch |
| `GET` | `/api/watches/:id/availability` | Latest availability per site |
| `GET` | `/api/campsites/suggest?q=` | Search suggestions for rec areas and campgrounds |
| `GET` | `/api/campsites/search?recAreaId=` | Campgrounds in a rec area |
| `GET` | `/api/campsites/search?facilityId=` | Campsites in a campground |
| `GET` | `/api/campsites/facility/:id` | Campground details (needs `RIDB_API_KEY`) |
| `GET` | `/api/available` | Campgrounds with openings near `HOME_REGION` |
| `GET` | `/api/admin` | Overview stats |
| `GET` | `/api/admin/users` | Accounts with watch counts |
| `DELETE` | `/api/admin/users/:id` | Remove an account and its watches |
| `GET` `POST` | `/api/admin/invites` | List pending invites, or create one for an `email` |
| `DELETE` | `/api/admin/invites/:id` | Revoke an unused invite |
| `GET` | `/api/admin/watches` | All watches |
| `GET` | `/api/admin/activity` | Recent activity feed |
| `GET` | `/api/admin/scheduler/status` | Scheduler state |
| `POST` | `/api/admin/scheduler/{start,stop,restart,trigger}` | Scheduler controls |
| `POST` | `/api/admin/notifications/test` | Send a test email to your own address over SMTP |

```bash
curl -c jar -H 'Content-Type: application/json' \
  -d '{"email":"you@example.com","password":"..."}' http://localhost:3333/api/auth/login
curl -b jar http://localhost:3333/api/watches
```

---

## License

Private. All rights reserved.

---

**Built with ❤️ for camping enthusiasts and outdoor adventurers.**
