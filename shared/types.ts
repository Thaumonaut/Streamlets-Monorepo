/**
 * Shared TypeScript types for Twitch Emote MVP
 * 
 * These types are used across backend, frontend-extension, and frontend-website
 * to ensure type safety and consistency.
 */

// ==================== Core Types ====================

/**
 * Rarity tiers for cards (matches PostgreSQL ENUM)
 */
export type RarityTier = 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Fabled';

/**
 * Acquisition sources for cards
 */
export type AcquisitionSource = 'draw' | 'quest' | 'purchase' | 'trade' | 'admin';

// ==================== Entity Types ====================

/**
 * Card template based on Twitch emote
 */
export interface Card {
  id: string;              // UUID
  emote_id: string;        // Twitch emote identifier
  emote_name: string;      // Display name (e.g., "Kappa")
  emote_cdn_url: string;   // Twitch CDN URL
  rarity: RarityTier;
  created_at: string;      // ISO 8601 timestamp
}

/**
 * User/Viewer in the system
 */
export interface User {
  id: string;              // Internal user UUID
  twitch_id: string;       // Twitch user ID
  twitch_username: string; // Twitch display name
  supabase_auth_id?: string; // Supabase Auth user ID (optional, for website)
  created_at: string;      // ISO 8601 timestamp
  updated_at: string;      // ISO 8601 timestamp
}

/**
 * Ticket balance for a user
 */
export interface TicketBalance {
  id: string;              // Balance record UUID
  user_id: string;         // User UUID
  current_tickets: number; // Available tickets (0-10)
  max_tickets: number;     // Maximum capacity (10)
  last_regen_at: string;   // ISO 8601 timestamp
  created_at: string;      // ISO 8601 timestamp
  updated_at: string;      // ISO 8601 timestamp
}

/**
 * Collection entry (user owns a card)
 */
export interface CollectionEntry {
  id: string;              // Collection entry UUID
  user_id: string;         // User UUID
  card_id: string;         // Card UUID
  card?: Card;             // Optional: full card details (joined)
  acquired_at: string;     // ISO 8601 timestamp
  source: AcquisitionSource;
}

/**
 * Draw transaction audit log
 */
export interface DrawTransaction {
  id: string;              // Transaction UUID
  user_id: string;         // User UUID
  card_id: string;         // Card UUID
  card?: Card;             // Optional: full card details (joined)
  rarity: RarityTier;      // Rarity rolled (denormalized)
  ticket_cost: number;     // Always 1 for MVP
  created_at: string;      // ISO 8601 timestamp
}

// ==================== API Response Types ====================

/**
 * API response for card list
 */
export interface CardsResponse {
  data: Card[];
  pagination?: {
    page: number;
    limit: number;
    total_items: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

/**
 * API response for user collection
 */
export interface CollectionResponse {
  data: CollectionEntry[];
  pagination?: {
    page: number;
    limit: number;
    total_items: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

/**
 * API response for draw transaction
 */
export interface DrawResponse {
  transaction_id: string;
  card: Card;
  remaining_tickets: number;
  rarity_rolled: RarityTier;
}

/**
 * API response for ticket balance
 */
export interface TicketBalanceResponse {
  current_tickets: number;
  max_tickets: number;
  last_regen_at: string;
  next_regen_at: string;   // Calculated client-side
}

/**
 * API response for user stats
 */
export interface UserStatsResponse {
  user: User;
  stats: {
    total_cards: number;
    unique_cards: number;
    completion_percentage: number;
    rarity_counts: Record<RarityTier, number>;
    total_draws: number;
    last_draw_at?: string;
  };
}

/**
 * API error response
 */
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    timestamp: string;
  };
}

// ==================== Request Types ====================

/**
 * Request for drawing a card
 */
export interface DrawRequest {
  // No parameters needed for MVP (always draws 1 card)
}

/**
 * Request for paginated lists
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
}

// ==================== Utility Types ====================

/**
 * Result type for operations that can fail
 */
export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Async result type
 */
export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

/**
 * Type guard for checking if value is a RarityTier
 */
export function isRarityTier(value: string): value is RarityTier {
  return ['Common', 'Rare', 'Epic', 'Legendary', 'Fabled'].includes(value);
}

/**
 * Type guard for checking if value is an AcquisitionSource
 */
export function isAcquisitionSource(value: string): value is AcquisitionSource {
  return ['draw', 'quest', 'purchase', 'trade', 'admin'].includes(value);
}
