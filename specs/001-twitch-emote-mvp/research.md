# Research & Technical Decisions: Twitch Emote MVP

**Feature**: 001-twitch-emote-mvp  
**Date**: 2025-12-24  
**Purpose**: Resolve technical unknowns and establish implementation patterns

---

## 1. Integration Testing Strategy

### Problem
Technical Context identified "NEEDS CLARIFICATION on integration test strategy" - how to test the full stack including Cloudflare Workers, Supabase database, and Twitch Extension integration.

### Research

**Option A: Miniflare + Supabase Test Project**
- Miniflare provides local Cloudflare Workers simulator
- Supabase test project with isolated database
- Tests run against local/test infrastructure
- Pros: Full environment simulation, fast feedback
- Cons: Setup complexity, local state management

**Option B: Staging Environment Testing**
- Deploy to staging Cloudflare Workers instance
- Dedicated Supabase staging project
- Playwright E2E tests against staging
- Pros: Production-like environment, realistic latency
- Cons: Slower test cycle, shared state issues

**Option C: Hybrid Approach (RECOMMENDED)**
- Unit tests with Vitest (service layer, utilities)
- Contract tests for API endpoints (schema validation)
- Local integration tests with Miniflare + in-memory DB mocks
- E2E smoke tests on staging with Playwright before production deploy

### Decision: Hybrid Approach (Option C)

**Rationale**:
- Unit tests catch business logic bugs early (ticket regeneration, rarity calculation)
- Contract tests ensure API stability for Twitch Extension frontend
- Local integration tests validate Workers + database interaction patterns
- Staging E2E tests verify Twitch Extension SDK integration before production

**Implementation**:
- Vitest for unit/integration tests
- Miniflare for Workers simulation
- Playwright for critical user flows in staging
- Test pyramid: 70% unit, 20% integration, 10% E2E

**Alternatives Rejected**:
- Option A alone: Insufficient coverage of Twitch Extension SDK behavior
- Option B alone: Too slow for iterative development

---

## 2. RNG Implementation (Principle VIII: Algorithmic-Only Production)

### Problem
Constitution Principle VIII requires deterministic, algorithmic logic - no AI/ML models. Need to clarify RNG approach for card draws.

### Research

**Option A: Crypto.getRandomValues() (Browser/Node)**
- Browser-native or Node.js crypto module
- Cryptographically secure random number generator (CSPRNG)
- Pros: Secure, unpredictable, no external dependencies
- Cons: Not seeded (non-reproducible for testing)

**Option B: Seeded PRNG (e.g., seedrandom library)**
- Deterministic pseudo-random with seed input
- Reproducible results for testing/debugging
- Pros: Testable, deterministic with seed
- Cons: Not cryptographically secure (acceptable for game mechanics)

**Option C: Hybrid - Server-side CSPRNG + Transaction Log (RECOMMENDED)**
- Use Cloudflare Workers `crypto.getRandomValues()` for production draws
- Log RNG state (timestamp, user ID, result) in database transaction
- For tests: Use seeded PRNG with controlled seed
- Pros: Secure production, testable development, auditable
- Cons: Dual implementation (mitigated by abstraction)

### Decision: Hybrid Approach (Option C)

**Rationale**:
- Satisfies Principle I (Server-Side Authority) - RNG on server only
- Satisfies Principle VIII (Algorithmic-Only) - CSPRNG is deterministic algorithm, not ML
- Transaction log (FR-014) enables economy analysis without RNG seed persistence
- Test doubles allow deterministic test scenarios

**Implementation**:
```typescript
// Production: Cloudflare Workers crypto API
interface RNGService {
  drawRarity(): RarityTier;
  selectCard(pool: Card[], rarity: RarityTier): Card;
}

class ProductionRNG implements RNGService {
  drawRarity(): RarityTier {
    const rand = crypto.getRandomValues(new Uint32Array(1))[0] / (0xFFFFFFFF + 1);
    // Apply rarity distribution (cumulative probabilities)
    if (rand < 0.5) return 'Common';      // 50%
    if (rand < 0.88) return 'Rare';       // 38%
    if (rand < 0.98) return 'Epic';       // 10%
    if (rand < 0.9999) return 'Legendary'; // 1.99%
    return 'Fabled';                      // 0.01%
  }
}

class TestRNG implements RNGService {
  constructor(private seed: number) {}
  // Deterministic PRNG for tests
}
```

**Alternatives Rejected**:
- Option A alone: Untestable (cannot simulate specific rarity draws)
- Option B alone: Insufficient security for production game economy
- External RNG services: Violates edge-native architecture, adds latency/cost

---

## 3. Emote Artwork Sourcing & Storage (Principle IX: Resource-Conscious Design)

### Problem
Constitution Principle IX requires WebP conversion and storage quotas. MVP uses Twitch global emotes - need to clarify storage strategy.

### Research

**Option A: Download and Host All Emote Images**
- Fetch all Twitch global emotes via Twitch API
- Convert to WebP, store in Cloudflare R2 or Supabase Storage
- Serve from own CDN
- Pros: Full control, consistent format, no external dependency
- Cons: Storage costs, maintenance burden, Twitch terms compliance

**Option B: Reference Twitch CDN URLs (RECOMMENDED for MVP)**
- Fetch emote metadata from Twitch API (name, ID, CDN URL)
- Store only CDN URL references in database
- Serve images directly from Twitch CDN
- Pros: Zero storage cost, always up-to-date, no conversion needed
- Cons: External dependency, no format control, Twitch CDN availability

**Option C: Hybrid - Cache on Demand**
- Reference Twitch CDN initially
- Cache and convert to WebP on first access
- Store cached WebP in Cloudflare R2
- Pros: Balance of cost and control
- Cons: Complexity, cache invalidation issues

### Decision: Reference Twitch CDN URLs (Option B) for MVP

**Rationale**:
- Principle IX targets custom artwork (post-MVP feature)
- Twitch CDN is reliable, globally distributed (better than self-hosting)
- MVP scope: Global emotes only (no custom artwork yet)
- Zero storage/bandwidth costs for MVP testing phase
- Twitch API Terms of Service allow referencing emote URLs

**Implementation**:
```typescript
// Database schema: cards table
interface Card {
  id: string;
  emote_id: string;        // Twitch emote identifier
  emote_name: string;      // Display name
  emote_cdn_url: string;   // Twitch CDN URL (1x, 2x, 3x sizes)
  rarity: RarityTier;
  created_at: timestamp;
}

// No local image storage for MVP
// Future: custom_artwork_url (WebP, hosted in R2) for streamer uploads
```

**Post-MVP Migration Path**:
- Add `custom_artwork_url` field to cards table
- Implement WebP conversion pipeline for streamer uploads
- Enforce 50-100 card quota per streamer (Principle IX)
- Fallback: Use Twitch CDN if custom artwork unavailable

**Alternatives Rejected**:
- Option A: Premature optimization, violates YAGNI principle
- Option C: Over-engineered for MVP, adds operational complexity

---

## 4. Twitch Emote API Integration Pattern

### Problem
Need to fetch Twitch global emotes with usage frequency for rarity assignment (FR-002).

### Research

**Twitch API Endpoints**:
- `GET https://api.twitch.tv/helix/chat/emotes/global` - Global emotes metadata
- Does NOT include usage frequency in response
- Requires App Access Token (client credentials flow)

**Emote Usage Frequency**:
- Twitch does not expose usage statistics via public API
- Alternative approaches:
  1. Manual classification (research popular emotes, assign rarity)
  2. Community datasets (e.g., TwitchEmotes.com)
  3. Heuristic: Emote age (older = more iconic = higher rarity)
  4. Streamer-specific usage (requires chat monitoring)

### Decision: Manual Classification with Community Data

**Rationale**:
- Twitch API limitation: No usage frequency endpoint
- Community knowledge available (Kappa, PogChamp, LUL are universally known)
- MVP scope: Fixed classification, no dynamic updates
- Simple implementation: Hardcoded rarity mapping

**Implementation**:
```typescript
// One-time setup script: Fetch global emotes
async function seedEmoteCards() {
  const emotes = await fetchTwitchGlobalEmotes();
  
  // Manual rarity mapping (based on community knowledge)
  const rarityMap: Record<string, RarityTier> = {
    'Kappa': 'Legendary',
    'PogChamp': 'Legendary',
    'LUL': 'Epic',
    'TriHard': 'Rare',
    // ... etc
    // Unmapped emotes default to 'Common'
  };
  
  for (const emote of emotes) {
    const rarity = rarityMap[emote.name] || 'Common';
    await db.insertCard({ emote, rarity });
  }
}
```

**Post-MVP Enhancement**:
- Integrate with chat analytics service
- Dynamic rarity adjustment based on channel-specific usage
- Streamer override: Customize rarity for their channel

**Alternatives Rejected**:
- Dynamic usage tracking: Requires chat monitoring infrastructure (out of MVP scope)
- Paid analytics APIs: Cost prohibitive for MVP testing
- ML-based classification: Violates Principle VIII (Algorithmic-Only)

---

## 5. Twitch Extension Authentication Flow

### Problem
FR-010 requires Twitch Extension JWT authentication. Need to clarify integration with Supabase auth.

### Research

**Twitch Extension JWT**:
- Sent in `Authorization: Bearer <jwt>` header from extension frontend
- Contains viewer ID (opaque token), channel ID, role (viewer/broadcaster)
- Signed by Twitch with extension secret
- Expires after 1 hour

**Supabase Auth Integration Options**:

**Option A: Bypass Supabase Auth, Use Twitch JWT Only**
- Validate Twitch JWT in Cloudflare Workers
- Extract user ID, store directly in Supabase with RLS policies
- No Supabase auth session
- Pros: Simple, single source of truth
- Cons: No Supabase Auth features (email, social login for website)

**Option B: Dual Auth - Twitch for Extension, Supabase for Website (RECOMMENDED)**
- Extension: Validate Twitch JWT → Supabase RLS uses `twitch_id` claim
- Website: Supabase Auth (email/OAuth) → Link to Twitch account
- Unified user table with both `twitch_id` and `supabase_auth_id`
- Pros: Flexible, supports both frontends, future-proof
- Cons: Two auth flows to maintain

**Option C: Convert Twitch JWT to Supabase Session**
- Create custom Supabase auth function
- Exchange Twitch JWT for Supabase session token
- All requests use Supabase tokens
- Pros: Unified auth layer
- Cons: Complex token exchange, latency overhead

### Decision: Dual Auth (Option B)

**Rationale**:
- Extension and website have different auth contexts
- Twitch Extension MUST use Twitch JWT (Twitch platform requirement)
- Companion website needs flexible auth (viewers without Twitch login)
- User linking enables cross-platform features (view collection on website)

**Implementation**:
```typescript
// Cloudflare Workers middleware
async function authenticateRequest(req: Request): Promise<User> {
  const authHeader = req.headers.get('Authorization');
  
  if (isTwitchExtensionRequest(req)) {
    // Validate Twitch JWT
    const jwt = parseTwitchJWT(authHeader);
    const user = await db.getUserByTwitchId(jwt.user_id);
    return user || createUserFromTwitch(jwt);
  } else {
    // Validate Supabase session (website requests)
    const session = await supabase.auth.getSession(authHeader);
    return db.getUserBySupabaseId(session.user.id);
  }
}

// Supabase RLS policy
CREATE POLICY "Users can access own data"
ON user_collections
USING (
  twitch_id = current_setting('request.jwt.claims')::json->>'twitch_id'
  OR supabase_auth_id = auth.uid()
);
```

**Alternatives Rejected**:
- Option A: Blocks website functionality (no auth for non-Twitch users)
- Option C: Over-engineered, adds latency without clear benefit

---

## 6. Ticket Regeneration Mechanism

### Problem
FR-006a requires "one ticket every 2 hours when viewer ticket count is below maximum". Need to clarify implementation pattern.

### Research

**Option A: Cron Job (Scheduled Worker)**
- Cloudflare Workers Cron Triggers
- Run every 2 hours, scan all users, grant tickets
- Pros: Simple scheduling, consistent timing
- Cons: Does not scale (must scan all users), inefficient

**Option B: Lazy Regeneration on Request (RECOMMENDED)**
- Calculate tickets on-demand when user accesses system
- Formula: `min(max_tickets, current_tickets + floor((now - last_regen) / 2 hours))`
- Update `last_regen` timestamp and `current_tickets` in database
- Pros: Scales infinitely, no background jobs, always accurate
- Cons: Timestamp math complexity

**Option C: Scheduled Job + User-Specific Timers**
- Store next regeneration time per user
- Cloudflare Durable Objects with alarms
- Wake up at scheduled time, grant ticket
- Pros: Precise timing, event-driven
- Cons: Cost (Durable Objects requests), complex state management

### Decision: Lazy Regeneration (Option B)

**Rationale**:
- Principle III (Edge-Native): Stateless, scales without limit
- Principle IV (Data Integrity): Single source of truth in database
- Cost-effective: No background job overhead
- Accurate: Calculates exact tickets based on elapsed time

**Implementation**:
```typescript
interface TicketBalance {
  user_id: string;
  current_tickets: number;
  max_tickets: number;  // 10 per FR-006b
  last_regen_at: timestamp;
}

function regenerateTickets(balance: TicketBalance): TicketBalance {
  const now = Date.now();
  const elapsed = now - balance.last_regen_at;
  const intervals = Math.floor(elapsed / (2 * 60 * 60 * 1000)); // 2 hours in ms
  
  if (intervals === 0) return balance; // No change
  
  const newTickets = Math.min(
    balance.max_tickets,
    balance.current_tickets + intervals
  );
  
  return {
    ...balance,
    current_tickets: newTickets,
    last_regen_at: balance.last_regen_at + (intervals * 2 * 60 * 60 * 1000)
  };
}

// Call before every draw or balance check
async function getTicketBalance(userId: string): Promise<TicketBalance> {
  const balance = await db.getTicketBalance(userId);
  const updated = regenerateTickets(balance);
  
  if (updated.current_tickets !== balance.current_tickets) {
    await db.updateTicketBalance(userId, updated);
  }
  
  return updated;
}
```

**Alternatives Rejected**:
- Option A: Poor scalability, wasted compute for inactive users
- Option C: Over-engineered, adds cost and complexity

---

## 7. Database Transaction Patterns

### Problem
Principle IV requires ACID transactions for multi-step operations. Card draws involve: (1) check ticket balance, (2) decrement ticket, (3) select card, (4) grant card, (5) log transaction.

### Research

**Supabase Transaction Support**:
- PostgreSQL supports `BEGIN`, `COMMIT`, `ROLLBACK`
- Supabase client does not expose transaction API directly
- Must use Supabase Functions (PostgreSQL stored procedures) or RPC

**Option A: Supabase RPC with SQL Transactions (RECOMMENDED)**
- Define PostgreSQL function for atomic draw operation
- Call from Cloudflare Workers via Supabase RPC
- All logic in SQL: `BEGIN`, validation, updates, `COMMIT`
- Pros: ACID guarantees, single roundtrip, server-side logic
- Cons: SQL complexity, harder to test

**Option B: Application-Level Transactions in Workers**
- Execute multiple Supabase queries in sequence
- Retry on failure, manual rollback
- Pros: TypeScript logic, easier debugging
- Cons: Non-atomic, race conditions, network failures

**Option C: Optimistic Locking with Version Checks**
- Add `version` column to ticket_balance
- UPDATE with WHERE version = expected
- Retry on conflict
- Pros: Handles concurrency without transactions
- Cons: Complex retry logic, not suitable for multi-table updates

### Decision: Supabase RPC with SQL Transactions (Option A)

**Rationale**:
- Principle IV (Data Integrity): ACID compliance is non-negotiable
- Single network roundtrip: Better performance than multi-query
- PostgreSQL transactions prevent race conditions (concurrent draws)
- Edge case: Connection failure during transaction → automatic rollback

**Implementation**:
```sql
-- PostgreSQL function
CREATE OR REPLACE FUNCTION draw_card(
  p_user_id UUID,
  p_rarity_distribution JSONB
) RETURNS JSONB AS $$
DECLARE
  v_ticket_balance INTEGER;
  v_rarity TEXT;
  v_card RECORD;
  v_transaction_id UUID;
BEGIN
  -- Start transaction (implicit in function)
  
  -- 1. Check and decrement ticket (with row lock)
  UPDATE ticket_balances
  SET current_tickets = current_tickets - 1
  WHERE user_id = p_user_id AND current_tickets > 0
  RETURNING current_tickets INTO v_ticket_balance;
  
  IF v_ticket_balance IS NULL THEN
    RAISE EXCEPTION 'Insufficient tickets';
  END IF;
  
  -- 2. Select rarity (using RNG from application layer)
  v_rarity := p_rarity_distribution->>'rarity';
  
  -- 3. Select random card from pool
  SELECT * INTO v_card
  FROM cards
  WHERE rarity = v_rarity
  ORDER BY RANDOM()
  LIMIT 1;
  
  -- 4. Grant card to user
  INSERT INTO user_collections (user_id, card_id, acquired_at)
  VALUES (p_user_id, v_card.id, NOW())
  RETURNING id INTO v_transaction_id;
  
  -- 5. Log transaction
  INSERT INTO draw_transactions (id, user_id, card_id, rarity, ticket_cost)
  VALUES (v_transaction_id, p_user_id, v_card.id, v_rarity, 1);
  
  -- Return result
  RETURN jsonb_build_object(
    'transaction_id', v_transaction_id,
    'card', row_to_json(v_card),
    'remaining_tickets', v_ticket_balance
  );
  
  -- Automatic COMMIT on success, ROLLBACK on exception
END;
$$ LANGUAGE plpgsql;
```

**Alternatives Rejected**:
- Option B: Violates Principle IV (ACID Compliance)
- Option C: Insufficient for multi-table atomicity

---

## 8. Project Structure Decision

### Problem
Plan template offers 3 options: Single project, Web application, Mobile + API. Need to select appropriate structure.

### Decision: Web Application (Option 2)

**Rationale**:
- Two frontends: Twitch Extension (React static) + Companion Website (React dynamic)
- One backend: Hono on Cloudflare Workers
- Clear separation of concerns

**Structure**:
```
/backend
  /src
    /models          # TypeScript types, Zod schemas
    /services        # Business logic (ticket regen, card draws)
    /api             # Hono route handlers
    /middleware      # Auth, logging, error handling
    /db              # Supabase client, RPC wrappers
  /tests
    /unit
    /integration
    /contract
  /db-migrations     # Supabase SQL migration files

/frontend-extension  # Twitch Extension (static build)
  /src
    /components      # React components (CardGrid, DrawButton)
    /pages           # Extension views (Collection, Draw)
    /services        # API client for backend
    /hooks           # React hooks (useTicketBalance)
  /tests
    /unit
    /e2e

/frontend-website    # Companion Website (dynamic)
  /src
    /components      # Leaderboard, StreamerDashboard
    /pages           # Public leaderboard, streamer backend
    /services        # API client + Supabase direct access
  /tests

/shared              # Shared types and constants
  /types.ts          # Card, User, Transaction types
  /constants.ts      # Rarity distribution, ticket config
```

**Alternatives Rejected**:
- Option 1 (Single project): Insufficient separation for dual frontends
- Option 3 (Mobile + API): Not applicable (web-only)

---

## Summary of Resolutions

| Clarification | Resolution |
|---------------|------------|
| Integration test strategy | Hybrid: Unit (Vitest) + Local integration (Miniflare) + E2E staging (Playwright) |
| RNG implementation | Cloudflare Workers `crypto.getRandomValues()` (production), seeded PRNG (tests) |
| Artwork sourcing | Reference Twitch CDN URLs (MVP), WebP conversion for custom uploads (post-MVP) |
| Emote rarity assignment | Manual classification using community knowledge (Twitch API lacks usage stats) |
| Authentication flow | Dual auth: Twitch JWT (extension) + Supabase Auth (website) |
| Ticket regeneration | Lazy regeneration on request (stateless, scalable) |
| Transaction atomicity | PostgreSQL stored procedures via Supabase RPC |
| Project structure | Web application: /backend, /frontend-extension, /frontend-website, /shared |

All NEEDS CLARIFICATION items from Constitution Check are now resolved. Proceeding to Phase 1 (Design & Contracts).
