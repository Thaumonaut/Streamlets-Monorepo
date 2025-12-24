# Implementation Plan: Twitch Emote MVP

**Branch**: `001-twitch-emote-mvp` | **Date**: 2025-12-24 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-twitch-emote-mvp/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Deploy a minimal viable product Twitch extension that allows viewers to collect cards based on Twitch's global emotes. The system implements a gacha-style card drawing mechanism with ticket-based resource management, rarity tiers based on emote usage frequency, and persistent collection tracking. Technical approach leverages Hono backend on Cloudflare Workers edge runtime, Supabase PostgreSQL database, and dual React frontends (static Twitch Extension + dynamic companion website).

## Technical Context

**Language/Version**: TypeScript (strict mode enabled per constitution)
**Primary Dependencies**: Hono (backend framework), React (two frontends), Supabase SDK, Cloudflare Workers runtime, Twitch Extension SDK
**Storage**: Supabase (PostgreSQL 15+) with Row Level Security
**Testing**: Vitest (unit tests), Playwright (E2E for extension UI), Miniflare (local Workers integration), staging E2E tests
**Target Platform**: Cloudflare Workers (edge runtime), Twitch Extension Platform (overlay + panel components)
**Project Type**: Web application (1 backend + 2 frontends: Twitch Extension static build + companion website)
**Performance Goals**: API <100ms p95, Extension load <3s, 100+ concurrent viewers per channel without degradation
**Constraints**: Server-side authority for all draws, edge-native stateless handlers, 2-hour ticket regeneration interval, 10 ticket cap
**Scale/Scope**: MVP with all Twitch global emotes (~100-200 cards), 5 rarity tiers, basic collection + draw mechanics

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Server-Side Authority (NON-NEGOTIABLE)
✅ **PASS** - Spec FR-005 explicitly requires "server-side draw mechanics where card selection happens on backend (client cannot manipulate results)"
- Card draws computed server-side with RNG
- Transaction log required (FR-014)
- Ticket consumption enforced server-side (FR-012)

### II. TypeScript-First Development
✅ **PASS** - Confirmed by spec Technical Architecture section
- Hono backend is TypeScript framework
- React frontends use TypeScript
- Zod validators required for runtime validation (constitution requirement)

### III. Edge-Native Architecture
✅ **PASS** - Cloudflare deployment confirmed in spec
- Stateless request handlers on Cloudflare Workers
- Supabase provides database with connection pooling
- Target: <100ms p95 API response time (spec SC-003 allows 2s per draw, constitution requires <100ms for non-DB ops)

### IV. Data Integrity & ACID Compliance
✅ **PASS** - Complete schema with database-level constraints defined in data-model.md
- ENUMs for rarity_tier and acquisition_source
- Foreign keys with CASCADE/RESTRICT for referential integrity
- NOT NULL, UNIQUE, CHECK constraints on all critical fields
- RLS policies for user data isolation (per-user access control)
- PostgreSQL stored procedure `draw_card()` ensures atomic transactions
- Ticket balance CHECK constraint: `current_tickets >= 0 AND current_tickets <= max_tickets`
- Rarity distribution CHECK constraint: weights sum to 1.0

### V. Balanced Economy Design
✅ **PASS** - No pay-to-win mechanics
- Tickets regenerate on fixed 2-hour schedule (FR-006a, cannot purchase refills)
- Drop rates balanced: Common 50%, Rare 38%, Epic 10%, Legendary 1.99%, Fabled 0.01% (FR-006)
- Duplicates accumulate for future use (FR-011, no dead pulls)
- **Note**: Pity system not in MVP scope

### VI. Streamer Autonomy
⚠️ **PARTIAL** - MVP uses global emotes (auto-sourced from Twitch API)
- Companion website provides streamer backend management (FR-016)
- MVP scope: Global emotes only (per-streamer customization deferred post-MVP)
- **Action**: Document streamer management features in contracts/quickstart

### VII. Engagement-Driven Design
✅ **PASS** - Ticket regeneration drives return visits
- 2-hour regeneration interval encourages periodic engagement (FR-006a)
- Collection progress visibility (User Story 5, Priority P3)
- No platform-level FOMO (global emote pool is stable)
- **Note**: Active mechanics (chat integration) deferred post-MVP

### VIII. Algorithmic-Only Production
✅ **PASS** - RNG implementation confirmed in research.md (section 2)
- Production: Cloudflare Workers `crypto.getRandomValues()` (CSPRNG, deterministic algorithm)
- Card rarity assignment: Manual classification based on community knowledge (algorithmic)
- No ML/AI models in production runtime
- Test environment: Seeded PRNG for deterministic testing
- All game logic is rule-based and reproducible

### IX. Resource-Conscious Design
✅ **PASS** - Artwork strategy documented in research.md (section 3)
- MVP: Reference Twitch CDN URLs directly (zero storage cost)
- Database stores only CDN URL references, not image files
- Post-MVP: WebP conversion pipeline for custom streamer uploads
- Storage quotas: 50-100 custom cards per streamer (enforced at application layer)
- No local image hosting in MVP (cost-conscious approach)

### Gate Evaluation (Post-Design Re-Check)
- **Critical Issues**: None
- **All Clarifications Resolved**: ✅
  - Integration testing strategy: Hybrid approach (research.md section 1)
  - RNG implementation: CSPRNG with test doubles (research.md section 2)
  - Artwork storage: Twitch CDN references (research.md section 3)
  - Database constraints: Complete schema (data-model.md)
  - Transaction atomicity: PostgreSQL stored procedure (data-model.md)
  - Dual authentication: Twitch JWT + Supabase Auth (research.md section 5)
  - Ticket regeneration: Lazy calculation pattern (research.md section 6)
- **All 9 Constitution Principles**: ✅ PASS
- **Verdict**: ✅ READY FOR IMPLEMENTATION (proceed to /speckit.tasks)

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
backend/                        # Hono API on Cloudflare Workers
├── src/
│   ├── models/                # TypeScript types, Zod schemas
│   ├── services/              # Business logic (RNG, ticket regen, card draws)
│   ├── api/                   # Hono route handlers
│   │   ├── routes/            # Endpoint implementations
│   │   │   ├── cards.ts       # GET /api/v1/cards, GET /api/v1/cards/:id
│   │   │   ├── users.ts       # GET /api/v1/users/me, /collection, /tickets, /transactions
│   │   │   └── draws.ts       # POST /api/v1/draws
│   │   └── index.ts           # Route aggregation
│   ├── middleware/            # Auth (Twitch JWT + Supabase), logging, error handling
│   ├── db/                    # Supabase client, RPC wrappers
│   └── index.ts               # Hono app entry point
├── tests/
│   ├── unit/                  # Service layer tests (Vitest)
│   ├── integration/           # Workers + DB tests (Miniflare)
│   └── contract/              # API schema validation tests
└── wrangler.toml              # Cloudflare Workers configuration

frontend-extension/             # Twitch Extension (React static build)
├── src/
│   ├── components/            # React components
│   │   ├── CardGrid.tsx       # Collection display
│   │   ├── DrawButton.tsx     # Card draw interface
│   │   ├── TicketDisplay.tsx  # Ticket balance and timer
│   │   └── CardDetails.tsx    # Individual card view
│   ├── pages/                 # Extension views
│   │   ├── Collection.tsx     # Main collection view
│   │   └── Draw.tsx           # Draw interface
│   ├── services/              # API client for backend
│   │   └── api.ts             # Fetch wrapper with Twitch JWT
│   ├── hooks/                 # React hooks
│   │   ├── useTicketBalance.ts
│   │   ├── useCardCollection.ts
│   │   └── useDrawCard.ts
│   └── App.tsx                # Twitch Extension SDK integration
├── tests/
│   ├── unit/                  # Component tests (Vitest)
│   └── e2e/                   # Extension E2E tests (Playwright)
└── vite.config.ts             # Vite build configuration

frontend-website/               # Companion Website (React)
├── src/
│   ├── components/
│   │   ├── Leaderboard.tsx    # Global card leaderboard
│   │   └── StreamerDashboard.tsx  # Streamer management interface
│   ├── pages/
│   │   ├── Home.tsx           # Landing page
│   │   ├── Leaderboard.tsx    # Public leaderboard
│   │   └── StreamerBackend.tsx  # Streamer admin panel
│   ├── services/
│   │   ├── api.ts             # Backend API client
│   │   └── supabase.ts        # Supabase Auth client
│   └── App.tsx
├── tests/
│   └── unit/
└── vite.config.ts

shared/                         # Shared types and constants
├── types.ts                   # Card, User, Transaction, RarityTier types
├── constants.ts               # Rarity distribution, ticket config
└── validation.ts              # Zod schemas for API contracts

db-migrations/                  # Supabase SQL migrations
├── 001_initial_schema.sql     # From data-model.md
└── seed-emotes.ts             # Fetch Twitch global emotes, classify rarity
```

**Structure Decision**: Web application (Option 2) with 1 backend + 2 frontends + shared types package. Selected because:
- Two distinct frontends with different build targets (static vs dynamic)
- Shared TypeScript types ensure contract alignment between frontend/backend
- Cloudflare Workers deployment model (serverless edge functions)
- Monorepo structure supports code reuse and consistent development experience

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
