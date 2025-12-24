# Data Model: Twitch Emote MVP

**Feature**: 001-twitch-emote-mvp  
**Date**: 2025-12-24  
**Database**: Supabase (PostgreSQL 15+)

---

## Overview

This data model implements a gacha-style card collection system with ticket-based drawing mechanics. All database constraints enforce Principle IV (Data Integrity & ACID Compliance) from the constitution.

**Key Design Decisions**:
- ENUMs for constrained values (rarity tiers, authentication types)
- Foreign keys with CASCADE/RESTRICT for referential integrity
- CHECK constraints for valid ranges (tickets, timestamps)
- Row Level Security (RLS) for user data isolation
- Timestamps with timezone for audit trail
- UUIDs for primary keys (distributed system compatibility)

---

## Entity Relationship Diagram

```
┌─────────────┐
│    users    │
└──────┬──────┘
       │
       │ 1:1
       ├─────────────┐
       │             │
       ↓ 1:1         ↓ 1:N
┌──────────────┐  ┌─────────────────┐
│ticket_balances│  │user_collections │
└──────────────┘  └────────┬────────┘
                           │
                           │ N:1
                           ↓
                  ┌─────────────────┐
                  │      cards      │
                  └────────┬────────┘
                           │
                           │ 1:N
                           ↓
                  ┌──────────────────┐
                  │draw_transactions │
                  └──────────────────┘
```

---

## Entities

### 1. users

Represents a viewer/player in the Streamlets system. Supports dual authentication (Twitch Extension + Website).

**Attributes**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Internal user identifier |
| `twitch_id` | TEXT | UNIQUE, NOT NULL | Twitch user ID (from JWT) |
| `twitch_username` | TEXT | NOT NULL | Twitch display name |
| `supabase_auth_id` | UUID | UNIQUE, NULLABLE | Supabase Auth user ID (website login) |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Account creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Last update timestamp |

**Indexes**:
- `idx_users_twitch_id` on `twitch_id` (frequent lookups)
- `idx_users_supabase_auth_id` on `supabase_auth_id` (website auth)

**RLS Policies**:
```sql
-- Users can only read their own data
CREATE POLICY "Users view own profile"
ON users FOR SELECT
USING (
  twitch_id = current_setting('request.jwt.claims', true)::json->>'twitch_id'
  OR supabase_auth_id = auth.uid()
);

-- Users can update their own profile
CREATE POLICY "Users update own profile"
ON users FOR UPDATE
USING (
  twitch_id = current_setting('request.jwt.claims', true)::json->>'twitch_id'
  OR supabase_auth_id = auth.uid()
);
```

**Validation Rules**:
- `twitch_id` must match Twitch ID format (numeric string)
- `twitch_username` max length: 25 characters (Twitch limit)

**State Transitions**:
- Created: First Twitch Extension access or website signup
- Updated: Linking Twitch + Supabase accounts

---

### 2. cards

Immutable card templates based on Twitch global emotes. Viewers collect instances of these cards.

**Attributes**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Card identifier |
| `emote_id` | TEXT | UNIQUE, NOT NULL | Twitch emote ID |
| `emote_name` | TEXT | NOT NULL | Emote name (e.g., "Kappa") |
| `emote_cdn_url` | TEXT | NOT NULL | Twitch CDN URL (1x, 2x, 3x variants) |
| `rarity` | rarity_tier | NOT NULL | Rarity tier (ENUM) |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Card creation timestamp |

**ENUM: rarity_tier**:
```sql
CREATE TYPE rarity_tier AS ENUM ('Common', 'Rare', 'Epic', 'Legendary', 'Fabled');
```

**Indexes**:
- `idx_cards_rarity` on `rarity` (draw queries)
- `idx_cards_emote_id` on `emote_id` (lookups)

**RLS Policies**:
```sql
-- Cards are publicly readable (all viewers see same pool)
CREATE POLICY "Cards are public"
ON cards FOR SELECT
USING (true);
```

**Validation Rules**:
- `emote_cdn_url` must be valid HTTPS URL
- `rarity` must be one of defined ENUM values

**Data Seeding**:
- One-time script fetches Twitch global emotes via API
- Manual rarity classification (see research.md section 4)
- ~100-200 cards expected in MVP pool

---

### 3. ticket_balances

Tracks viewer's available draw tickets. One record per user, updated on draw and regeneration.

**Attributes**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Balance record ID |
| `user_id` | UUID | UNIQUE, NOT NULL, REFERENCES users(id) ON DELETE CASCADE | Owner user |
| `current_tickets` | INTEGER | NOT NULL, DEFAULT 5, CHECK (current_tickets >= 0 AND current_tickets <= max_tickets) | Available tickets |
| `max_tickets` | INTEGER | NOT NULL, DEFAULT 10 | Maximum ticket cap (FR-006b) |
| `last_regen_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Last regeneration timestamp |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Balance creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Last update timestamp |

**Indexes**:
- `idx_ticket_balances_user_id` on `user_id` (frequent lookups)

**RLS Policies**:
```sql
-- Users can only view/update their own balance
CREATE POLICY "Users manage own tickets"
ON ticket_balances FOR ALL
USING (
  user_id IN (
    SELECT id FROM users WHERE 
      twitch_id = current_setting('request.jwt.claims', true)::json->>'twitch_id'
      OR supabase_auth_id = auth.uid()
  )
);
```

**Validation Rules**:
- `current_tickets` range: [0, max_tickets]
- `max_tickets` fixed at 10 for MVP (FR-006b)
- `last_regen_at` cannot be in the future

**State Transitions**:
- **Created**: New user receives 5 starting tickets (spec line 58)
- **Draw**: `current_tickets` decremented by 1 (FR-012)
- **Regeneration**: Lazy calculation adds tickets based on elapsed time (research.md section 6)

**Regeneration Logic** (implemented in application layer):
```typescript
function regenerateTickets(balance: TicketBalance): TicketBalance {
  const now = Date.now();
  const elapsed = now - balance.last_regen_at;
  const intervals = Math.floor(elapsed / (2 * 60 * 60 * 1000)); // 2 hours
  
  if (intervals === 0) return balance;
  
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
```

---

### 4. user_collections

Tracks which cards each user owns. Allows duplicates (FR-011) for future crafting/upgrade mechanics.

**Attributes**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Collection entry ID |
| `user_id` | UUID | NOT NULL, REFERENCES users(id) ON DELETE CASCADE | Owner user |
| `card_id` | UUID | NOT NULL, REFERENCES cards(id) ON DELETE RESTRICT | Owned card |
| `acquired_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Acquisition timestamp |
| `source` | acquisition_source | NOT NULL, DEFAULT 'draw' | How card was acquired |

**ENUM: acquisition_source**:
```sql
CREATE TYPE acquisition_source AS ENUM ('draw', 'quest', 'purchase', 'trade', 'admin');
```
*Note*: MVP only uses 'draw'; other sources reserved for future features.

**Indexes**:
- `idx_user_collections_user_id` on `user_id` (user's collection queries)
- `idx_user_collections_card_id` on `card_id` (card ownership stats)
- `idx_user_collections_user_card` on `(user_id, card_id)` (duplicate detection)

**RLS Policies**:
```sql
-- Users can view their own collection
CREATE POLICY "Users view own collection"
ON user_collections FOR SELECT
USING (
  user_id IN (
    SELECT id FROM users WHERE 
      twitch_id = current_setting('request.jwt.claims', true)::json->>'twitch_id'
      OR supabase_auth_id = auth.uid()
  )
);

-- Only system can insert (via RPC function)
CREATE POLICY "System grants cards"
ON user_collections FOR INSERT
WITH CHECK (false);  -- Enforces RPC-only insertion
```

**Validation Rules**:
- Duplicates allowed (no uniqueness constraint on user_id + card_id)
- `acquired_at` cannot be in the future

**State Transitions**:
- **Granted**: Card added via draw transaction (atomic operation)
- **Never Deleted**: Collection is append-only for MVP

---

### 5. draw_transactions

Audit log for all card draw events. Enables economy balancing and fraud detection (FR-014).

**Attributes**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Transaction ID |
| `user_id` | UUID | NOT NULL, REFERENCES users(id) ON DELETE CASCADE | User who drew |
| `card_id` | UUID | NOT NULL, REFERENCES cards(id) ON DELETE RESTRICT | Card awarded |
| `rarity` | rarity_tier | NOT NULL | Rarity rolled (denormalized for analytics) |
| `ticket_cost` | INTEGER | NOT NULL, DEFAULT 1, CHECK (ticket_cost > 0) | Tickets consumed |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Transaction timestamp |

**Indexes**:
- `idx_draw_transactions_user_id` on `user_id` (user history)
- `idx_draw_transactions_created_at` on `created_at` (time-series analytics)
- `idx_draw_transactions_rarity` on `rarity` (drop rate analysis)

**RLS Policies**:
```sql
-- Users can view their own transaction history
CREATE POLICY "Users view own draws"
ON draw_transactions FOR SELECT
USING (
  user_id IN (
    SELECT id FROM users WHERE 
      twitch_id = current_setting('request.jwt.claims', true)::json->>'twitch_id'
      OR supabase_auth_id = auth.uid()
  )
);

-- Only system can insert (via RPC function)
CREATE POLICY "System logs draws"
ON draw_transactions FOR INSERT
WITH CHECK (false);
```

**Validation Rules**:
- `ticket_cost` always 1 for MVP (future: multi-ticket draws)
- `created_at` cannot be in the future
- `rarity` must match drawn card's rarity (enforced in RPC function)

**State Transitions**:
- **Created**: Atomic with card grant and ticket decrement (PostgreSQL transaction)
- **Never Updated/Deleted**: Immutable audit log

---

### 6. rarity_distribution (Configuration Table)

Stores probability weights for card draws (FR-006). Single row configuration table.

**Attributes**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Config ID (always single row) |
| `common_weight` | DECIMAL(5,4) | NOT NULL, DEFAULT 0.5000, CHECK (common_weight >= 0 AND common_weight <= 1) | Common probability (50%) |
| `rare_weight` | DECIMAL(5,4) | NOT NULL, DEFAULT 0.3800, CHECK (rare_weight >= 0 AND rare_weight <= 1) | Rare probability (38%) |
| `epic_weight` | DECIMAL(5,4) | NOT NULL, DEFAULT 0.1000, CHECK (epic_weight >= 0 AND epic_weight <= 1) | Epic probability (10%) |
| `legendary_weight` | DECIMAL(5,4) | NOT NULL, DEFAULT 0.0199, CHECK (legendary_weight >= 0 AND legendary_weight <= 1) | Legendary probability (1.99%) |
| `fabled_weight` | DECIMAL(5,4) | NOT NULL, DEFAULT 0.0001, CHECK (fabled_weight >= 0 AND fabled_weight <= 1) | Fabled probability (0.01%) |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Last update timestamp |

**Constraints**:
```sql
-- Total weights must sum to 1.0
ALTER TABLE rarity_distribution
ADD CONSTRAINT weights_sum_to_one
CHECK (common_weight + rare_weight + epic_weight + legendary_weight + fabled_weight = 1.0);
```

**RLS Policies**:
```sql
-- Public read access
CREATE POLICY "Distribution is public"
ON rarity_distribution FOR SELECT
USING (true);

-- Admin-only updates (future feature)
CREATE POLICY "Admin updates distribution"
ON rarity_distribution FOR UPDATE
USING (false);  -- Disabled for MVP
```

**Validation Rules**:
- All weights between 0 and 1
- Sum of weights exactly 1.0
- Single row enforced by application (seed script)

**Usage**:
- Read once at startup, cached in application layer
- Passed to RNG service for cumulative probability calculation (see research.md section 2)

---

## Critical Atomic Operations

### Draw Card Transaction (PostgreSQL RPC)

Implements the atomic draw operation per research.md section 7.

```sql
CREATE OR REPLACE FUNCTION draw_card(
  p_user_id UUID,
  p_drawn_rarity rarity_tier
) RETURNS JSONB AS $$
DECLARE
  v_ticket_balance INTEGER;
  v_card RECORD;
  v_collection_id UUID;
BEGIN
  -- 1. Regenerate tickets (lazy calculation)
  -- Implemented in application layer before calling this function
  
  -- 2. Check and decrement ticket (row-level lock)
  UPDATE ticket_balances
  SET 
    current_tickets = current_tickets - 1,
    updated_at = now()
  WHERE user_id = p_user_id AND current_tickets > 0
  RETURNING current_tickets INTO v_ticket_balance;
  
  IF v_ticket_balance IS NULL THEN
    RAISE EXCEPTION 'Insufficient tickets' USING ERRCODE = 'check_violation';
  END IF;
  
  -- 3. Select random card from pool (server-side RNG)
  -- Rarity already determined by application layer RNG
  SELECT * INTO v_card
  FROM cards
  WHERE rarity = p_drawn_rarity
  ORDER BY RANDOM()  -- PostgreSQL RANDOM() for card selection within rarity
  LIMIT 1;
  
  IF v_card IS NULL THEN
    RAISE EXCEPTION 'No cards available for rarity: %', p_drawn_rarity
      USING ERRCODE = 'data_exception';
  END IF;
  
  -- 4. Grant card to user
  INSERT INTO user_collections (user_id, card_id, acquired_at, source)
  VALUES (p_user_id, v_card.id, now(), 'draw')
  RETURNING id INTO v_collection_id;
  
  -- 5. Log transaction
  INSERT INTO draw_transactions (id, user_id, card_id, rarity, ticket_cost, created_at)
  VALUES (v_collection_id, p_user_id, v_card.id, p_drawn_rarity, 1, now());
  
  -- 6. Return result
  RETURN jsonb_build_object(
    'transaction_id', v_collection_id,
    'card', row_to_json(v_card),
    'remaining_tickets', v_ticket_balance,
    'rarity_rolled', p_drawn_rarity
  );
  
  -- Automatic COMMIT on success, ROLLBACK on exception
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Error Handling**:
- `Insufficient tickets`: User attempted draw with 0 tickets
- `No cards available`: Database missing cards for rarity tier (data integrity issue)

**Calling Pattern** (from Cloudflare Workers):
```typescript
async function performDraw(userId: string): Promise<DrawResult> {
  // 1. Regenerate tickets (lazy)
  await regenerateTickets(userId);
  
  // 2. Determine rarity (application layer RNG)
  const rng = new ProductionRNG();
  const rarity = rng.drawRarity();
  
  // 3. Execute atomic draw
  const { data, error } = await supabase.rpc('draw_card', {
    p_user_id: userId,
    p_drawn_rarity: rarity
  });
  
  if (error) throw new DrawError(error.message);
  
  return data;
}
```

---

## Migration Scripts

### Initial Schema (V1)

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUMs
CREATE TYPE rarity_tier AS ENUM ('Common', 'Rare', 'Epic', 'Legendary', 'Fabled');
CREATE TYPE acquisition_source AS ENUM ('draw', 'quest', 'purchase', 'trade', 'admin');

-- Create tables
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  twitch_id TEXT UNIQUE NOT NULL,
  twitch_username TEXT NOT NULL,
  supabase_auth_id UUID UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emote_id TEXT UNIQUE NOT NULL,
  emote_name TEXT NOT NULL,
  emote_cdn_url TEXT NOT NULL,
  rarity rarity_tier NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ticket_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  current_tickets INTEGER NOT NULL DEFAULT 5 CHECK (current_tickets >= 0 AND current_tickets <= max_tickets),
  max_tickets INTEGER NOT NULL DEFAULT 10,
  last_regen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE RESTRICT,
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source acquisition_source NOT NULL DEFAULT 'draw'
);

CREATE TABLE draw_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE RESTRICT,
  rarity rarity_tier NOT NULL,
  ticket_cost INTEGER NOT NULL DEFAULT 1 CHECK (ticket_cost > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE rarity_distribution (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  common_weight DECIMAL(5,4) NOT NULL DEFAULT 0.5000 CHECK (common_weight >= 0 AND common_weight <= 1),
  rare_weight DECIMAL(5,4) NOT NULL DEFAULT 0.3800 CHECK (rare_weight >= 0 AND rare_weight <= 1),
  epic_weight DECIMAL(5,4) NOT NULL DEFAULT 0.1000 CHECK (epic_weight >= 0 AND epic_weight <= 1),
  legendary_weight DECIMAL(5,4) NOT NULL DEFAULT 0.0199 CHECK (legendary_weight >= 0 AND legendary_weight <= 1),
  fabled_weight DECIMAL(5,4) NOT NULL DEFAULT 0.0001 CHECK (fabled_weight >= 0 AND fabled_weight <= 1),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT weights_sum_to_one CHECK (
    common_weight + rare_weight + epic_weight + legendary_weight + fabled_weight = 1.0
  )
);

-- Create indexes
CREATE INDEX idx_users_twitch_id ON users(twitch_id);
CREATE INDEX idx_users_supabase_auth_id ON users(supabase_auth_id);
CREATE INDEX idx_cards_rarity ON cards(rarity);
CREATE INDEX idx_cards_emote_id ON cards(emote_id);
CREATE INDEX idx_ticket_balances_user_id ON ticket_balances(user_id);
CREATE INDEX idx_user_collections_user_id ON user_collections(user_id);
CREATE INDEX idx_user_collections_card_id ON user_collections(card_id);
CREATE INDEX idx_user_collections_user_card ON user_collections(user_id, card_id);
CREATE INDEX idx_draw_transactions_user_id ON draw_transactions(user_id);
CREATE INDEX idx_draw_transactions_created_at ON draw_transactions(created_at);
CREATE INDEX idx_draw_transactions_rarity ON draw_transactions(rarity);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE draw_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rarity_distribution ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (see entity sections above for policy definitions)

-- Seed rarity distribution (single row)
INSERT INTO rarity_distribution (common_weight, rare_weight, epic_weight, legendary_weight, fabled_weight)
VALUES (0.5000, 0.3800, 0.1000, 0.0199, 0.0001);
```

---

## Data Validation Summary

| Entity | Validation Layer | Key Constraints |
|--------|------------------|-----------------|
| `users` | Database | UNIQUE twitch_id, UNIQUE supabase_auth_id |
| `cards` | Database + App | ENUM rarity, UNIQUE emote_id, URL format |
| `ticket_balances` | Database | CHECK range [0, max_tickets], FK user_id |
| `user_collections` | Database + RPC | FK user_id, FK card_id, RPC-only insert |
| `draw_transactions` | Database + RPC | FK user_id, FK card_id, CHECK ticket_cost > 0, immutable |
| `rarity_distribution` | Database | CHECK weights sum to 1.0, single row |

**Principle IV Compliance**: All entities use database-level constraints (ENUMs, foreign keys, NOT NULL, UNIQUE, CHECK) to enforce data integrity. RLS policies isolate user data. PostgreSQL transactions ensure ACID compliance for multi-step operations.
