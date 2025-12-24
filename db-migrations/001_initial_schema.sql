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

-- Create RLS policies

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

-- Cards are publicly readable (all viewers see same pool)
CREATE POLICY "Cards are public"
ON cards FOR SELECT
USING (true);

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

-- Distribution is public
CREATE POLICY "Distribution is public"
ON rarity_distribution FOR SELECT
USING (true);

-- Admin-only updates (future feature)
CREATE POLICY "Admin updates distribution"
ON rarity_distribution FOR UPDATE
USING (false);  -- Disabled for MVP

-- Seed rarity distribution (single row)
INSERT INTO rarity_distribution (common_weight, rare_weight, epic_weight, legendary_weight, fabled_weight)
VALUES (0.5000, 0.3800, 0.1000, 0.0199, 0.0001);
