# AGENTS.md - Architect Mode

This file provides architecture and design guidance for the Streamlets project.

## Architecture Overview

Streamlets is a TypeScript monorepo with a dual-frontend architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare Workers                     │
│                   (Hono Backend API)                     │
│                         │                               │
└─────────────────────────┬─────────────────────────────────┘
                          │
              ┌───────────┴───────────┐
              │                       │
    ┌─────────▼─────────┐   ┌───────▼────────┐
    │  Twitch Extension  │   │ Companion Web  │
    │   (React + Vite)  │   │   (React + Vite)│
    │   Twitch JWT Auth │   │ Supabase Auth  │
    └───────────────────┘   └────────┬───────┘
                                      │
                            ┌─────────▼─────────┐
                            │   Supabase DB    │
                            │   (PostgreSQL)   │
                            │   + RLS Policies  │
                            └───────────────────┘
```

## Design Principles

### 1. Edge-Native Backend
- Cloudflare Workers for global edge deployment
- Stateless design (no in-memory state)
- All state in Supabase database

### 2. Dual Authentication
- Twitch Extension: JWT-based auth via Twitch Extension SDK
- Companion Website: Supabase Auth (email/password, OAuth)
- Both map to same internal user via `twitch_id`

### 3. Lazy Regeneration
- No background jobs or cron tasks
- Calculate ticket regeneration on each request
- Formula: `min(max_tickets, current_tickets + floor((now - last_regen) / 2 hours))`

### 4. Testable RNG
- Abstract RNG service for dependency injection
- Production: CSPRNG via `crypto.getRandomValues()`
- Testing: Seeded PRNG for deterministic tests

### 5. Shared Types
- Single source of truth for types in `shared/`
- Zod validation schemas for runtime checks
- Constants for configuration values

## Technology Stack

### Backend
- **Runtime**: Cloudflare Workers
- **Framework**: Hono
- **Database**: Supabase (PostgreSQL)
- **Auth**: jsonwebtoken (Twitch JWT), Supabase Auth
- **Testing**: Vitest

### Frontend Extension
- **Framework**: React 18
- **Build**: Vite
- **Auth**: Twitch Extension SDK
- **Testing**: Vitest + Playwright (E2E)

### Frontend Website
- **Framework**: React 18
- **Build**: Vite
- **Auth**: Supabase Auth
- **Routing**: React Router DOM
- **Testing**: Vitest

### Shared
- **Language**: TypeScript (strict mode)
- **Validation**: Zod
- **Package Manager**: pnpm (workspaces)

## Module Structure

### Backend Modules
```
backend/src/
├── index.ts              # Entry point, Hono app setup
├── api/
│   └── routes/          # API route handlers
├── db/
│   └── client.ts         # Supabase client factory
├── middleware/          # Request/response middleware
├── models/              # Database row types
└── services/            # Business logic
```

### Frontend Extension Modules
```
frontend-extension/src/
├── main.tsx             # Entry point
├── App.tsx              # Root component
├── components/           # React components
├── services/
│   └── api.ts           # API client (Twitch JWT)
└── utils/               # Helper functions
```

### Frontend Website Modules
```
frontend-website/src/
├── main.tsx             # Entry point
├── App.tsx              # Root component
├── components/           # React components
├── services/
│   ├── api.ts           # API client (Supabase Auth)
│   └── supabase.ts     # Supabase auth client
└── utils/               # Helper functions
```

## Data Flow

### Card Draw Flow
```
1. User clicks "Draw" button
2. Frontend calls POST /api/v1/draws with auth token
3. Backend validates JWT (Twitch or Supabase)
4. Backend fetches user's ticket balance
5. Backend regenerates tickets (lazy calculation)
6. Backend checks if tickets >= 1
7. Backend uses RNG to determine rarity tier
8. Backend selects random card from rarity pool
9. Backend creates draw transaction record
10. Backend adds card to user's collection
11. Backend decrements ticket count
12. Backend returns card and updated balance
```

### Authentication Flow (Twitch Extension)
```
1. Extension loads in Twitch iframe
2. Twitch SDK calls onAuthorized with JWT
3. Extension stores JWT in API client
4. Extension makes API requests with Bearer token
5. Backend validates JWT with TWITCH_EXTENSION_SECRET
6. Backend extracts user_id from JWT
7. Backend fetches/creates user record
8. Backend processes request
```

### Authentication Flow (Companion Website)
```
1. User signs in via Supabase Auth
2. Supabase returns session with access_token
3. Website stores session
4. Website makes API requests with Bearer token
5. Backend validates token with Supabase
6. Backend extracts supabase_auth_id from token
7. Backend finds user by supabase_auth_id
8. Backend processes request
```

## Key Design Decisions

### Why Cloudflare Workers?
- Global edge deployment for low latency
- Serverless scaling (no server management)
- Built-in CDN for static assets
- Cost-effective for sporadic traffic

### Why Dual Frontends?
- Twitch Extension has limited UI and context
- Companion website provides full-featured experience
- Users can access collection outside Twitch
- Separate auth flows for different contexts

### Why Lazy Regeneration?
- Background jobs are complex in serverless
- Lazy calculation is simpler and more reliable
- No need for cron jobs or workers
- Calculation is fast enough for request-time

### Why Abstract RNG?
- Enables deterministic testing
- Allows mocking for specific scenarios
- Production uses CSPRNG for fairness
- Test uses seeded PRNG for reproducibility

## Scalability Considerations

### Backend
- Stateless design enables horizontal scaling
- Cloudflare Workers auto-scale globally
- Database is the bottleneck (Supabase handles this)
- Consider caching for frequently accessed data

### Frontend
- Static assets served via CDN
- API calls are the main latency factor
- Consider optimistic UI updates
- Implement request debouncing

## Security Considerations

### Authentication
- Twitch JWT: Signed with secret, expires in 1 hour
- Supabase Auth: Industry-standard OAuth
- RLS policies enforce data isolation
- Never expose secret keys to frontend

### API Security
- CORS restricted to allowed origins
- Rate limiting on sensitive endpoints
- Input validation via Zod schemas
- SQL injection prevented by Supabase client

### Data Privacy
- Users can only see their own data
- No PII stored beyond Twitch username
- Supabase handles encryption at rest
- GDPR compliance via Supabase

## Future Extensions

### Potential Features
- Trading system between users
- Quest system for bonus tickets
- Leaderboards and achievements
- Card crafting/evolution
- Seasonal events with special cards

### Technical Improvements
- WebSocket support for real-time updates
- GraphQL API for flexible queries
- Redis caching for hot data
- CDN for card images
- Analytics and monitoring dashboard
