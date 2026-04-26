# Render deployment

This repo is prepared for a single-URL Render deployment:

- `eventflow-app`: Node web service that serves the API and the built frontend
- `eventflow-db`: Render Postgres database

The configuration lives in [render.yaml](/C:/Users/kranu/Downloads/Event-Manager-Pro/Event-Manager-Pro/render.yaml).

## What Render will run

- Build: `pnpm install --frozen-lockfile`
- Frontend build: `pnpm --filter @workspace/eventflow run build`
- API build: `pnpm --filter @workspace/api-server run build`
- Database sync before deploy: `pnpm --filter @workspace/db run push`
- Start command: `node --enable-source-maps artifacts/api-server/dist/index.mjs`

## Deploy steps

1. Push this repo to GitHub, GitLab, or Bitbucket.
2. In Render, choose `New > Blueprint`.
3. Connect the repo and select this repository root.
4. Render will detect `render.yaml` and propose:
   - one web service named `eventflow-app`
   - one Postgres database named `eventflow-db`
5. Provide values for any optional `sync: false` variables if you want livestream defaults:
   - `STREAM_TWITCH_PARENT`
   - `STREAM_URL_TEMPLATE`
   - `STREAM_DEFAULT_URL`
6. Create the blueprint and wait for the first deploy to finish.

## After deploy

- App URL: `https://<your-render-service>.onrender.com`
- Health check: `https://<your-render-service>.onrender.com/api/healthz`

The web service serves the SPA directly, so frontend routes like `/dashboard` and `/events/:id` work from the same public URL as the API.
