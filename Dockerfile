# syntax=docker/dockerfile:1

# ── Build: compile the API bundle and the web app ───────────────────────────
FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV NX_DAEMON=false CI=true

# better-sqlite3 ships prebuilt binaries, but npm still runs node-gyp for any
# package with a binding.gyp, and node-gyp needs Python just to copy them.
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN NODE_ENV=production npx nx run-many -t build -p api,web

# Runtime dependencies: webpack emits a package.json + lockfile holding only
# what main.js imports (13 packages). Install them here, where node-gyp has
# its tools, so the runtime image needs none of them.
RUN mkdir -p /runtime \
 && cp dist/apps/api/package.json dist/apps/api/package-lock.json /runtime/ \
 && cd /runtime \
 && npm ci --omit=dev --no-audit --no-fund \
 && npm cache clean --force

# ── Runtime: one process serves the API and the built SPA ───────────────────
FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3333 \
    DATABASE_PATH=/data/campsight.db

COPY --from=build /runtime/package.json ./
COPY --from=build /runtime/node_modules ./node_modules
COPY --from=build /app/dist/apps/api/main.js ./
COPY --from=build /app/dist/apps/web ./public

RUN mkdir -p /data && chown node:node /data
USER node
VOLUME /data
EXPOSE 3333

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "main.js"]
