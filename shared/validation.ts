/**
 * Zod validation schemas for Twitch Emote MVP
 * 
 * These schemas are used for runtime validation of API requests and responses
 * across backend, frontend-extension, and frontend-website.
 */

import { z } from 'zod';
import { RARITY_DISTRIBUTION, PAGINATION_DEFAULTS, TICKET_CONFIG } from './constants';

// ==================== Core Schemas ====================

/**
 * Rarity tier validation
 */
export const RarityTierSchema = z.enum(['Common', 'Rare', 'Epic', 'Legendary', 'Fabled']);

/**
 * Acquisition source validation
 */
export const AcquisitionSourceSchema = z.enum(['draw', 'quest', 'purchase', 'trade', 'admin']);

/**
 * UUID validation
 */
export const UuidSchema = z.string().uuid();

/**
 * ISO 8601 timestamp validation
 */
export const IsoTimestampSchema = z.string().datetime({ offset: true });

/**
 * URL validation
 */
export const UrlSchema = z.string().url();

// ==================== Entity Schemas ====================

/**
 * Card schema
 */
export const CardSchema = z.object({
  id: UuidSchema,
  emote_id: z.string().min(1).max(100),
  emote_name: z.string().min(1).max(50),
  emote_cdn_url: UrlSchema,
  rarity: RarityTierSchema,
  created_at: IsoTimestampSchema,
});

/**
 * User schema
 */
export const UserSchema = z.object({
  id: UuidSchema,
  twitch_id: z.string().min(1).max(100),
  twitch_username: z.string().min(1).max(25),
  supabase_auth_id: UuidSchema.optional(),
  created_at: IsoTimestampSchema,
  updated_at: IsoTimestampSchema,
});

/**
 * Ticket balance schema
 */
export const TicketBalanceSchema = z.object({
  id: UuidSchema,
  user_id: UuidSchema,
  current_tickets: z.number().int().min(0).max(TICKET_CONFIG.MAX_TICKETS),
  max_tickets: z.number().int().min(1).default(TICKET_CONFIG.MAX_TICKETS),
  last_regen_at: IsoTimestampSchema,
  created_at: IsoTimestampSchema,
  updated_at: IsoTimestampSchema,
});

/**
 * Collection entry schema
 */
export const CollectionEntrySchema = z.object({
  id: UuidSchema,
  user_id: UuidSchema,
  card_id: UuidSchema,
  acquired_at: IsoTimestampSchema,
  source: AcquisitionSourceSchema.default('draw'),
});

/**
 * Draw transaction schema
 */
export const DrawTransactionSchema = z.object({
  id: UuidSchema,
  user_id: UuidSchema,
  card_id: UuidSchema,
  rarity: RarityTierSchema,
  ticket_cost: z.number().int().positive().default(1),
  created_at: IsoTimestampSchema,
});

// ==================== API Request Schemas ====================

/**
 * Pagination parameters schema
 */
export const PaginationParamsSchema = z.object({
  page: z.number().int().positive().default(PAGINATION_DEFAULTS.PAGE),
  limit: z.number().int().positive().max(PAGINATION_DEFAULTS.MAX_LIMIT).default(PAGINATION_DEFAULTS.LIMIT),
}).partial();

/**
 * Draw request schema (no parameters for MVP)
 */
export const DrawRequestSchema = z.object({}).strict();

/**
 * Card ID parameter schema
 */
export const CardIdParamSchema = z.object({
  id: UuidSchema,
});

// ==================== API Response Schemas ====================

/**
 * Error response schema
 */
export const ErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.unknown()).optional(),
    timestamp: IsoTimestampSchema,
  }),
});

/**
 * Cards response schema
 */
export const CardsResponseSchema = z.object({
  data: z.array(CardSchema),
  pagination: z.object({
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    total_items: z.number().int().nonnegative(),
    total_pages: z.number().int().nonnegative(),
    has_next: z.boolean(),
    has_prev: z.boolean(),
  }).optional(),
});

/**
 * Collection response schema
 */
export const CollectionResponseSchema = z.object({
  data: z.array(
    CollectionEntrySchema.extend({
      card: CardSchema.optional(),
    })
  ),
  pagination: z.object({
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    total_items: z.number().int().nonnegative(),
    total_pages: z.number().int().nonnegative(),
    has_next: z.boolean(),
    has_prev: z.boolean(),
  }).optional(),
});

/**
 * Draw response schema
 */
export const DrawResponseSchema = z.object({
  transaction_id: UuidSchema,
  card: CardSchema,
  remaining_tickets: z.number().int().min(0),
  rarity_rolled: RarityTierSchema,
});

/**
 * Ticket balance response schema
 */
export const TicketBalanceResponseSchema = z.object({
  current_tickets: z.number().int().min(0).max(TICKET_CONFIG.MAX_TICKETS),
  max_tickets: z.number().int().min(1).default(TICKET_CONFIG.MAX_TICKETS),
  last_regen_at: IsoTimestampSchema,
  next_regen_at: IsoTimestampSchema,
});

/**
 * User stats response schema
 */
export const UserStatsResponseSchema = z.object({
  user: UserSchema,
  stats: z.object({
    total_cards: z.number().int().nonnegative(),
    unique_cards: z.number().int().nonnegative(),
    completion_percentage: z.number().min(0).max(100),
    rarity_counts: z.record(RarityTierSchema, z.number().int().nonnegative()),
    total_draws: z.number().int().nonnegative(),
    last_draw_at: IsoTimestampSchema.optional(),
  }),
});

// ==================== Authentication Schemas ====================

/**
 * Twitch JWT claims schema
 */
export const TwitchJwtClaimsSchema = z.object({
  user_id: z.string(),
  channel_id: z.string(),
  role: z.enum(['viewer', 'broadcaster', 'moderator']),
  exp: z.number().int().positive(),
  iat: z.number().int().positive().optional(),
});

/**
 * Authorization header schema
 */
export const AuthorizationHeaderSchema = z.object({
  authorization: z.string().regex(/^Bearer\s+/),
});

// ==================== Utility Functions ====================

/**
 * Create a schema for validating API responses with error handling
 */
export function createApiResponseSchema<T extends z.ZodType>(successSchema: T) {
  return z.union([successSchema, ErrorResponseSchema]);
}

/**
 * Validate and parse with better error messages
 */
export function validateWithErrors<T extends z.ZodType>(
  schema: T,
  data: unknown,
  context?: string
): z.infer<T> {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => ({
        path: err.path.join('.'),
        message: err.message,
        code: err.code,
      }));
      
      const errorMessage = context 
        ? `Validation failed for ${context}: ${JSON.stringify(errors, null, 2)}`
        : `Validation failed: ${JSON.stringify(errors, null, 2)}`;
      
      throw new Error(errorMessage);
    }
    throw error;
  }
}

/**
 * Safe parse with default values
 */
export function safeParseWithDefaults<T extends z.ZodType>(
  schema: T,
  data: unknown,
  defaults: Partial<z.infer<T>> = {}
): z.infer<T> {
  const result = schema.safeParse(data);
  if (result.success) {
    return result.data;
  }
  
  // Apply defaults for missing fields
  const defaultedData = { ...defaults, ...(data as object) };
  const defaultedResult = schema.safeParse(defaultedData);
  
  if (defaultedResult.success) {
    return defaultedResult.data;
  }
  
  // If still failing, throw the original error
  throw new Error(`Validation failed: ${JSON.stringify(result.error.errors, null, 2)}`);
}

// ==================== Type Exports ====================

export type RarityTier = z.infer<typeof RarityTierSchema>;
export type AcquisitionSource = z.infer<typeof AcquisitionSourceSchema>;
export type Card = z.infer<typeof CardSchema>;
export type User = z.infer<typeof UserSchema>;
export type TicketBalance = z.infer<typeof TicketBalanceSchema>;
export type CollectionEntry = z.infer<typeof CollectionEntrySchema>;
export type DrawTransaction = z.infer<typeof DrawTransactionSchema>;
export type PaginationParams = z.infer<typeof PaginationParamsSchema>;
export type DrawRequest = z.infer<typeof DrawRequestSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
export type CardsResponse = z.infer<typeof CardsResponseSchema>;
export type CollectionResponse = z.infer<typeof CollectionResponseSchema>;
export type DrawResponse = z.infer<typeof DrawResponseSchema>;
export type TicketBalanceResponse = z.infer<typeof TicketBalanceResponseSchema>;
export type UserStatsResponse = z.infer<typeof UserStatsResponseSchema>;
export type TwitchJwtClaims = z.infer<typeof TwitchJwtClaimsSchema>;
