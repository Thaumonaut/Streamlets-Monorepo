# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Project Overview

Streamlets is a Twitch emote collection game built as a TypeScript monorepo with pnpm workspaces. The project uses a dual-frontend architecture (Twitch Extension + companion website) with a Cloudflare Workers backend.

## Commands

### Root Commands
- `pnpm dev` - Start all services (backend, extension, website) concurrently
- `pnpm build` - Build all packages
- `pnpm test` - Run all tests
- `pnpm lint` - Lint all packages
- `pnpm format` - Format all packages
- `pnpm type-check` - Type-check all packages

### Backend Commands
- `pnpm --filter @streamlets/backend dev` - Start Cloudflare Workers dev server
- `pnpm --filter @streamlets/backend deploy` - Deploy to production
- `pnpm --filter @streamlets/backend test` - Run Vitest tests
- `pnpm --filter @streamlets/backend seed:all` - Seed database with emotes and rarity

### Frontend Commands
- `pnpm --filter @streamlets/frontend-extension dev` - Start extension dev server (port 5173)
- `pnpm --filter @streamlets/frontend-website dev --port 5174` - Start website dev server (port 5174)
- `pnpm --filter @streamlets/frontend-extension test:e2e` - Run Playwright E2E tests

## Critical Patterns

### Dual Authentication
- **Twitch Extension**: Uses `authenticateTwitchJWT` middleware with Twitch Extension JWT (signed with `TWITCH_EXTENSION_SECRET`)
- **Companion Website**: Uses Supabase Auth with `supabase_auth_id` linked to Twitch user
- Backend validates both auth methods via different middleware

### RNG Service Pattern
- Production: Uses `ProductionRNG` with `crypto.getRandomValues()` (CSPRNG)
- Testing: Use `TestRNG` (seeded LCG), `MockRNG` (fixed rarity), or `SequenceRNG` (predetermined sequence)
- Always inject RNG service for testability

### Ticket Regeneration
- Lazy regeneration: Calculate tickets on request based on elapsed time
- Formula: `min(max_tickets, current_tickets + floor((now - last_regen) / 2 hours))`
- Use `regenerateTickets()` from `backend/src/services/ticket-regeneration.ts`

### Database Client Pattern
- `createServiceRoleClient()` - Bypasses RLS (server-only operations)
- `createAnonClient()` - Respects RLS (public operations)
- `createAuthenticatedClient()` - Passes JWT claims for RLS (user operations)

### Shared Types
- All types in `shared/types.ts` are used across backend and frontends
- Validation schemas in `shared/validation.ts` use Zod
- Constants in `shared/constants.ts` (rarity distribution, ticket config, API endpoints)

## Architecture

### Backend (Hono + Cloudflare Workers)
- Entry: `backend/src/index.ts`
- Routes: `backend/src/api/routes/`
- Services: `backend/src/services/`
- Middleware: `backend/src/middleware/`
- Database: Supabase via `@supabase/supabase-js`

### Frontend Extension (React + Vite)
- Entry: `frontend-extension/src/main.tsx`
- Twitch SDK: `window.Twitch.ext` (declare global interface)
- API: Uses Twitch JWT for auth

### Frontend Website (React + Vite)
- Entry: `frontend-website/src/main.tsx`
- Auth: Supabase Auth
- API: Uses Supabase session token for auth

### Shared
- Types: `shared/types.ts`
- Validation: `shared/validation.ts`
- Constants: `shared/constants.ts`

## Environment Variables

### Backend (`.env`)
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_API_KEY_PUBLIC` - Publishable key (browser-safe)
- `SUPABASE_API_KEY_SECRET` - Secret key (server-only, elevated privileges)
- `TWITCH_EXTENSION_CLIENT_ID` - Twitch Extension client ID
- `TWITCH_EXTENSION_SECRET` - Twitch Extension secret (base64-encoded)
- `NODE_ENV` - Environment (development/staging/production)
- `API_BASE_URL` - Backend API base URL

### Frontend Extension (`.env`)
- `VITE_API_BASE_URL` - Backend API base URL

### Frontend Website (`.env`)
- `VITE_API_BASE_URL` - Backend API base URL
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_API_KEY_PUBLIC` - Supabase publishable key

## Gotchas

1. **Twitch JWT Secret**: Must be base64-decoded before use in `jsonwebtoken.verify()`
2. **Supabase Keys**: Two keys - PUBLIC (anon) for browser, SECRET (service_role) for server
3. **Ticket Regeneration**: No background jobs - calculate on every request
4. **RNG Testing**: Never use `Math.random()` in production - always use RNG service
5. **CORS**: Different origins per environment (localhost for dev, ext-twitch.tv for production)
6. **TypeScript Strict Mode**: All packages use strict mode with `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`
7. **pnpm Workspaces**: Use `pnpm --filter @streamlets/<package>` to run commands in specific packages
8. **Cloudflare Workers**: Uses `crypto.getRandomValues()` not `crypto.randomBytes()`
9. **React JSX**: Uses `react-jsx` transform (no need to import React)
10. **API Versioning**: All API routes under `/api/v1/`

## Code Style

- TypeScript strict mode enabled
- ESLint: `@typescript-eslint/recommended-requiring-type-checking`
- Prettier: 100 char line width, single quotes, trailing commas (ES5)
- No `any` types (error)
- No floating promises (error)
- Unused parameters prefixed with `_` (allowed)
