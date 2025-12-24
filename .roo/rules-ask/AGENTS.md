# AGENTS.md - Ask Mode

This file provides documentation and explanation guidance for the Streamlets project.

## Project Overview

Streamlets is a Twitch emote collection game where users can draw cards featuring Twitch emotes. The project uses a dual-frontend architecture:

1. **Twitch Extension** - Embedded in Twitch player, uses Twitch JWT for authentication
2. **Companion Website** - Standalone website, uses Supabase Auth for authentication

Both frontends share the same backend API and database.

## Architecture

### Backend (Cloudflare Workers + Hono)
The backend is a serverless API running on Cloudflare Workers. Key characteristics:
- Edge-native deployment for low latency
- Hono framework for routing
- Supabase for database (PostgreSQL with RLS)
- Dual authentication support (Twitch JWT + Supabase Auth)

### Frontend Extension (React + Vite)
The Twitch Extension is a React app that runs in an iframe on Twitch:
- Uses Twitch Extension SDK for authentication and context
- Communicates with backend via REST API
- Limited screen space (panel view)

### Frontend Website (React + Vite)
The companion website provides additional features:
- Supabase Auth for user accounts
- Leaderboards and statistics
- Collection viewing outside Twitch

## Key Concepts

### Dual Authentication
The project supports two authentication methods:
- **Twitch Extension**: JWT signed with `TWITCH_EXTENSION_SECRET`, validated by `authenticateTwitchJWT` middleware
- **Companion Website**: Supabase Auth session, validated via Supabase user ID

Both methods map to the same internal user record via `twitch_id`.

### RNG Service
Random number generation is abstracted for testability:
- **Production**: Uses `crypto.getRandomValues()` (CSPRNG)
- **Testing**: Uses seeded PRNG for deterministic tests

This ensures card draws are fair and reproducible in tests.

### Ticket Regeneration
Tickets regenerate over time using a lazy calculation:
- Users start with 5 tickets, max 10
- One ticket regenerates every 2 hours
- Calculation happens on each request (no background jobs)

### Rarity System
Cards have 5 rarity tiers with specific drop rates:
- Common: 50%
- Rare: 38%
- Epic: 10%
- Legendary: 1.99%
- Fabled: 0.01%

## API Structure

All API endpoints are under `/api/v1/`:

### Public Endpoints
- `GET /api/v1/cards` - List all available cards
- `GET /api/v1/cards/:id` - Get card details
- `GET /health` - Health check

### Authenticated Endpoints
- `GET /api/v1/users/me` - Get current user profile
- `GET /api/v1/users/me/collection` - Get user's card collection
- `GET /api/v1/users/me/tickets` - Get ticket balance
- `POST /api/v1/draws` - Draw a card (costs 1 ticket)

## Database Schema

### Core Tables
- `users` - User accounts (linked to Twitch ID)
- `cards` - Card templates (Twitch emotes)
- `user_collections` - User's owned cards
- `ticket_balances` - User's ticket balance
- `draw_transactions` - Audit log of card draws
- `rarity_distribution` - Rarity drop rate configuration

### Row Level Security (RLS)
Supabase RLS policies restrict data access:
- Users can only see their own collection
- Public endpoints use anon key
- User endpoints use authenticated client

## Development Workflow

### Setting Up
1. Clone repository
2. Install dependencies: `pnpm install`
3. Copy `.env.example` to `.env` in each package
4. Set environment variables (Supabase, Twitch Extension)
5. Run `pnpm dev` to start all services

### Running Services
- Backend: `pnpm --filter @streamlets/backend dev` (port 8787)
- Extension: `pnpm --filter @streamlets/frontend-extension dev` (port 5173)
- Website: `pnpm --filter @streamlets/frontend-website dev --port 5174` (port 5174)

### Testing
- Backend tests: `pnpm --filter @streamlets/backend test`
- Frontend tests: `pnpm --filter @streamlets/frontend-extension test`
- E2E tests: `pnpm --filter @streamlets/frontend-extension test:e2e`

## Common Questions

### Why Cloudflare Workers?
Cloudflare Workers provide edge deployment with low latency globally. This is ideal for a Twitch extension that needs fast responses.

### Why Dual Authentication?
Twitch Extension requires Twitch JWT for authentication, but the companion website needs a separate auth system. Supabase Auth provides a web-friendly auth solution while still linking to Twitch users.

### Why Lazy Ticket Regeneration?
Background jobs are complex in serverless environments. Lazy regeneration calculates tickets on each request, which is simpler and more reliable.

### Why Abstract RNG?
Abstracting RNG allows for deterministic testing. Tests can use seeded RNG to reproduce specific scenarios (e.g., always drawing a Legendary card).

### How Does the Extension Communicate with Twitch?
The Twitch Extension SDK provides:
- `onAuthorized` - Called when user is authenticated
- `onContext` - Called when context changes (theme, etc.)
- `viewer` - Current viewer information

## File Locations

### Backend
- `backend/src/index.ts` - Main entry point
- `backend/src/api/routes/` - API route handlers
- `backend/src/services/` - Business logic
- `backend/src/middleware/` - Request/response handling
- `backend/src/db/client.ts` - Database client

### Frontend Extension
- `frontend-extension/src/App.tsx` - Main component
- `frontend-extension/src/services/api.ts` - API client
- `frontend-extension/src/utils/` - Helper functions

### Frontend Website
- `frontend-website/src/App.tsx` - Main component
- `frontend-website/src/services/api.ts` - API client
- `frontend-website/src/services/supabase.ts` - Auth client

### Shared
- `shared/types.ts` - TypeScript types
- `shared/validation.ts` - Zod schemas
- `shared/constants.ts` - Configuration values
