# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Contains the EventFlow virtual event hosting platform with a React frontend and Express API backend.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui + wouter

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## EventFlow Features

- Public event discovery landing page
- Organizer dashboard with stats (total events, registrations, live events, upcoming)
- Full event management (create, edit, delete events)
- Live streaming support with video player embed
- Attendee registration (with waitlist support for capacity-limited events)
- Live chat panel with auto-refresh every 5 seconds
- Event scheduling with date/time, category, capacity
- Start/end stream controls

## Architecture

### Frontend (`artifacts/eventflow/`)
- `src/pages/` — page components (landing, dashboard, events list, event detail, new/edit forms)
- `src/components/` — layout (sidebar, app shell), event card, shadcn/ui components

### Backend (`artifacts/api-server/`)
- `src/routes/events.ts` — CRUD for events + stream control
- `src/routes/registrations.ts` — attendee registration
- `src/routes/chat.ts` — live chat messages
- `src/routes/dashboard.ts` — analytics stats

### Database (`lib/db/`)
- `events` table — event data, status, stream URL
- `registrations` table — attendee registrations (confirmed/waitlisted/cancelled)
- `chat_messages` table — live chat messages with pinning/deletion

### API spec (`lib/api-spec/openapi.yaml`)
Single source of truth for all API contracts. Run codegen after changes.

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Run Locally (Windows / non-Replit)

### 1) Prerequisites

- Node.js 24+
- pnpm 10+
- PostgreSQL 15+ running locally

### 2) Configure environment

From workspace root:

1. Copy `.env.example` to `.env`
2. Set `DATABASE_URL` to your Postgres instance

Example:

`DATABASE_URL=postgresql://postgres:postgres@localhost:5432/eventflow`

### 3) Install and initialize database

- `pnpm install`
- `pnpm --filter @workspace/db run push`

### 4) Start full app (API + frontend)

- `pnpm run dev:local`

Default local URLs:

- Frontend: `http://localhost:5173`
- API: `http://localhost:3001`

### 5) Access from other devices on your network

1. Find your PC LAN IP (example: `192.168.1.50`)
2. Set in `.env`:
	- `VITE_API_BASE_URL=http://192.168.1.50:3001`
3. Restart `pnpm run dev:local`
4. Open on another device:
	- `http://192.168.1.50:5173`

### 6) Production-style hosting from your device

Terminal 1:

- `pnpm run start:api`

Terminal 2:

- `pnpm run build:web`
- `pnpm run serve:web`

## Livestream Configuration

You can configure stream source behavior with these optional API environment variables:

- `STREAM_URL_TEMPLATE` — template used when an event has no `streamUrl` (supports `{eventId}` token)
- `STREAM_DEFAULT_URL` — fallback stream URL when no per-event URL or template is set
- `STREAM_TWITCH_PARENT` — required Twitch embed parent domain (default: `localhost`)

Examples:

- `STREAM_URL_TEMPLATE=https://stream.example.com/embed/{eventId}`
- `STREAM_DEFAULT_URL=https://www.youtube.com/watch?v=abc123xyz89`
- `STREAM_TWITCH_PARENT=192.168.1.50`

Behavior:

- If event `streamUrl` is set, it is used first.
- If not set, `STREAM_URL_TEMPLATE` is used.
- If template is not set, `STREAM_DEFAULT_URL` is used.
- If no source is configured, `Start Stream` returns a clear configuration error.

Auto-normalization for embed playback:

- YouTube watch/short URLs are converted to embed URLs.
- Vimeo video URLs are converted to player URLs.
- Twitch channel URLs are converted to player embed URLs with `STREAM_TWITCH_PARENT`.
