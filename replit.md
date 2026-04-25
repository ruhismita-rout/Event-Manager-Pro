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
