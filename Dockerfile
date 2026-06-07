# Production-like single-port image.
# Backend serves both React build and /api, so phone only needs http://IP_MAY_TINH:5173.
# This Dockerfile intentionally copies ONLY package.json first, not package-lock.json.
# Some exported lockfiles may contain stale/private registry URLs and can make npm hang with
# "Exit handler never called!" during Docker builds.
FROM node:20-bookworm-slim

WORKDIR /app

ENV NPM_CONFIG_REGISTRY=https://registry.npmjs.org/ \
    NPM_CONFIG_AUDIT=false \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FETCH_RETRIES=5 \
    NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000 \
    NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000 \
    NPM_CONFIG_FETCH_TIMEOUT=600000

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl libssl3 ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && npm install -g npm@10.9.2

COPY backend/package.json ./backend/package.json
RUN cd backend && npm install --no-audit --no-fund --legacy-peer-deps

COPY frontend/package.json ./frontend/package.json
RUN cd frontend && npm install --no-audit --no-fund --legacy-peer-deps

COPY backend ./backend
COPY frontend ./frontend

RUN cd backend && npx prisma generate && npm run build
RUN cd frontend && npm run build

ENV NODE_ENV=production
ENV PORT=5173
ENV FRONTEND_DIST_PATH=/app/frontend/dist

EXPOSE 5173

CMD ["sh", "-c", "cd /app/backend && npx prisma db push --accept-data-loss && (npx prisma db seed || echo 'Seed warning - continuing') && node dist/server.js"]
