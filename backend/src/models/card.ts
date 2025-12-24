/**
 * Card Model Types
 * 
 * Represents Twitch emote-based cards that can be collected by users.
 * Cards are immutable templates - the same card can be owned by multiple users.
 * 
 * @see specs/001-twitch-emote-mvp/data-model.md - Entity definition
 * @see specs/001-twitch-emote-mvp/contracts/cards.md - API contracts
 */

import type { RarityTier } from '../../../shared/types';

/**
 * Card database entity
 * Matches cards table schema from data-model.md
 */
export interface Card {
  id: string;              // UUID
  emote_id: string;        // Twitch emote identifier
  emote_name: string;      // Display name (e.g., "Kappa")
  emote_cdn_url: string;   // Twitch CDN URL
  rarity: RarityTier;      // Rarity tier
  created_at: string;      // ISO 8601 timestamp
}

/**
 * Card with ownership statistics
 * Used by GET /api/v1/cards/:id endpoint
 */
export interface CardWithStats extends Card {
  stats: {
    total_owners: number;      // Number of users who own this card
    drop_rate: number;         // Probability of drawing this card (0-1)
    first_appeared: string;    // ISO 8601 timestamp
  };
}

/**
 * Card list query filters
 * Used for GET /api/v1/cards endpoint
 */
export interface CardQueryFilters {
  rarity?: RarityTier;
  page?: number;
  limit?: number;
}

/**
 * Card list response with pagination
 */
export interface CardListResponse {
  data: Card[];
  pagination: {
    page: number;
    limit: number;
    total_items: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

/**
 * Database row type for cards table
 * Matches Supabase query results
 */
export interface CardRow {
  id: string;
  emote_id: string;
  emote_name: string;
  emote_cdn_url: string;
  rarity: RarityTier;
  created_at: string;
}

/**
 * Type guard to check if object is a valid Card
 */
export function isCard(obj: unknown): obj is Card {
  if (typeof obj !== 'object' || obj === null) return false;
  
  const card = obj as Record<string, unknown>;
  
  return (
    typeof card.id === 'string' &&
    typeof card.emote_id === 'string' &&
    typeof card.emote_name === 'string' &&
    typeof card.emote_cdn_url === 'string' &&
    typeof card.rarity === 'string' &&
    typeof card.created_at === 'string'
  );
}

/**
 * Type guard to check if object is CardWithStats
 */
export function isCardWithStats(obj: unknown): obj is CardWithStats {
  if (!isCard(obj)) return false;
  
  const card = obj as unknown as Record<string, unknown>;
  
  return (
    typeof card.stats === 'object' &&
    card.stats !== null &&
    typeof (card.stats as Record<string, unknown>).total_owners === 'number' &&
    typeof (card.stats as Record<string, unknown>).drop_rate === 'number' &&
    typeof (card.stats as Record<string, unknown>).first_appeared === 'string'
  );
}
