/**
 * Shared constants for Twitch Emote MVP
 * 
 * These constants are used across backend, frontend-extension, and frontend-website
 * to ensure consistency in configuration.
 */

// ==================== Rarity Distribution ====================

/**
 * Rarity distribution weights (from spec FR-006)
 * These must match the values in the database rarity_distribution table
 */
export const RARITY_DISTRIBUTION = {
  Common: 0.5000,      // 50%
  Rare: 0.3800,        // 38%
  Epic: 0.1000,        // 10%
  Legendary: 0.0199,   // 1.99%
  Fabled: 0.0001,      // 0.01%
} as const;

/**
 * Cumulative probability distribution for RNG
 * Used for determining rarity tier from random number [0, 1)
 */
export const RARITY_CUMULATIVE_DISTRIBUTION = {
  Common: RARITY_DISTRIBUTION.Common,                           // 0.5000
  Rare: RARITY_DISTRIBUTION.Common + RARITY_DISTRIBUTION.Rare,  // 0.8800
  Epic: 0.9800,                                                 // 0.8800 + 0.1000
  Legendary: 0.9999,                                            // 0.9800 + 0.0199
  Fabled: 1.0000,                                               // 0.9999 + 0.0001
} as const;

/**
 * Rarity tier display names
 */
export const RARITY_DISPLAY_NAMES: Record<keyof typeof RARITY_DISTRIBUTION, string> = {
  Common: 'Common',
  Rare: 'Rare',
  Epic: 'Epic',
  Legendary: 'Legendary',
  Fabled: 'Fabled',
};

/**
 * Rarity tier colors (for UI)
 */
export const RARITY_COLORS: Record<keyof typeof RARITY_DISTRIBUTION, string> = {
  Common: '#6B7280',    // Gray
  Rare: '#3B82F6',      // Blue
  Epic: '#8B5CF6',      // Purple
  Legendary: '#F59E0B', // Amber
  Fabled: '#EF4444',    // Red
};

// ==================== Ticket Configuration ====================

/**
 * Ticket configuration (from spec FR-006a, FR-006b)
 */
export const TICKET_CONFIG = {
  STARTING_TICKETS: 5,          // New users receive 5 tickets
  MAX_TICKETS: 10,              // Maximum ticket capacity
  REGENERATION_INTERVAL_HOURS: 2, // One ticket every 2 hours
  REGENERATION_INTERVAL_MS: 2 * 60 * 60 * 1000, // 2 hours in milliseconds
  DRAW_COST: 1,                 // Tickets per draw (always 1 for MVP)
} as const;

// ==================== API Configuration ====================

/**
 * API endpoints
 */
export const API_ENDPOINTS = {
  CARDS: '/api/v1/cards',
  CARD_DETAILS: (id: string) => `/api/v1/cards/${id}`,
  USER_PROFILE: '/api/v1/users/me',
  USER_COLLECTION: '/api/v1/users/me/collection',
  USER_TICKETS: '/api/v1/users/me/tickets',
  USER_TRANSACTIONS: '/api/v1/users/me/transactions',
  DRAW: '/api/v1/draws',
  HEALTH: '/health',
} as const;

/**
 * API rate limiting
 */
export const API_RATE_LIMITS = {
  REQUESTS_PER_MINUTE: 100,
  DRAW_REQUESTS_PER_HOUR: 60, // Maximum 60 draws per hour per user
} as const;

// ==================== Twitch Extension Configuration ====================

/**
 * Twitch Extension configuration
 */
export const TWITCH_EXTENSION_CONFIG = {
  JWT_EXPIRY_HOURS: 1,          // JWT expires after 1 hour
  MINIMUM_EXTENSION_VERSION: '1.0.0',
  SUPPORTED_VIEWS: ['panel', 'overlay'] as const,
} as const;

// ==================== Pagination ====================

/**
 * Default pagination values
 */
export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

// ==================== Error Codes ====================

/**
 * Standard error codes (matches API contract)
 */
export const ERROR_CODES = {
  INVALID_REQUEST: 'invalid_request',
  UNAUTHORIZED: 'unauthorized',
  FORBIDDEN: 'forbidden',
  NOT_FOUND: 'not_found',
  CONFLICT: 'conflict',
  INSUFFICIENT_TICKETS: 'insufficient_tickets',
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  INTERNAL_ERROR: 'internal_error',
  SERVICE_UNAVAILABLE: 'service_unavailable',
} as const;

// ==================== Validation ====================

/**
 * Validation constraints
 */
export const VALIDATION_CONSTRAINTS = {
  TWITCH_USERNAME_MAX_LENGTH: 25,
  EMOTE_NAME_MAX_LENGTH: 50,
  MIN_PAGE: 1,
  MIN_LIMIT: 1,
} as const;

// ==================== Environment ====================

/**
 * Environment modes
 */
export const ENVIRONMENT = {
  DEVELOPMENT: 'development',
  STAGING: 'staging',
  PRODUCTION: 'production',
} as const;

// ==================== Utility Functions ====================

/**
 * Calculate next regeneration time based on last regeneration timestamp
 */
export function calculateNextRegeneration(lastRegenAt: string | Date): Date {
  const lastRegen = typeof lastRegenAt === 'string' ? new Date(lastRegenAt) : lastRegenAt;
  const nextRegen = new Date(lastRegen.getTime() + TICKET_CONFIG.REGENERATION_INTERVAL_MS);
  
  // If we're already past the next regeneration, calculate the next interval
  const now = new Date();
  if (nextRegen <= now) {
    const intervalsPassed = Math.floor(
      (now.getTime() - lastRegen.getTime()) / TICKET_CONFIG.REGENERATION_INTERVAL_MS
    );
    return new Date(
      lastRegen.getTime() + (intervalsPassed + 1) * TICKET_CONFIG.REGENERATION_INTERVAL_MS
    );
  }
  
  return nextRegen;
}

/**
 * Determine rarity tier from random number [0, 1)
 */
export function getRarityFromRandom(random: number): keyof typeof RARITY_DISTRIBUTION {
  if (random < RARITY_CUMULATIVE_DISTRIBUTION.Common) return 'Common';
  if (random < RARITY_CUMULATIVE_DISTRIBUTION.Rare) return 'Rare';
  if (random < RARITY_CUMULATIVE_DISTRIBUTION.Epic) return 'Epic';
  if (random < RARITY_CUMULATIVE_DISTRIBUTION.Legendary) return 'Legendary';
  return 'Fabled';
}

/**
 * Format time remaining until next regeneration
 */
export function formatTimeUntilRegeneration(nextRegenAt: Date): string {
  const now = new Date();
  const msRemaining = nextRegenAt.getTime() - now.getTime();
  
  if (msRemaining <= 0) return 'Now';
  
  const hours = Math.floor(msRemaining / (1000 * 60 * 60));
  const minutes = Math.floor((msRemaining % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
