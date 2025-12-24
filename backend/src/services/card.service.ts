/**
 * Card Service
 * 
 * Business logic for card operations:
 * - Retrieve all available cards with filtering and pagination
 * - Get specific card details with ownership statistics
 * 
 * @see specs/001-twitch-emote-mvp/contracts/cards.md - API specifications
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Card,
  CardWithStats,
  CardQueryFilters,
  CardListResponse,
  CardRow,
} from '../models/card';
import type { RarityTier } from '../../../shared/types';
import { NotFoundError, DatabaseError } from '../middleware/error';

/**
 * CardService class
 * Handles all card-related business logic
 */
export class CardService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Get paginated list of cards with optional rarity filter
   * 
   * @param filters - Query filters (rarity, page, limit)
   * @returns Paginated card list
   * @throws DatabaseError if query fails
   */
  async getCards(filters: CardQueryFilters = {}): Promise<CardListResponse> {
    const { rarity, page = 1, limit = 20 } = filters;

    // Validate pagination parameters
    const validatedPage = Math.max(1, page);
    const validatedLimit = Math.min(Math.max(1, limit), 100);
    const offset = (validatedPage - 1) * validatedLimit;

    try {
      // Build query
      let query = this.supabase
        .from('cards')
        .select('*', { count: 'exact' });

      // Apply rarity filter if provided
      if (rarity) {
        query = query.eq('rarity', rarity);
      }

      // Apply ordering (by rarity desc, then name asc)
      query = query.order('rarity', { ascending: false });
      query = query.order('emote_name', { ascending: true });

      // Apply pagination
      query = query.range(offset, offset + validatedLimit - 1);

      // Execute query
      const { data, error, count } = await query;

      if (error) {
        throw new DatabaseError(`Failed to fetch cards: ${error.message}`);
      }

      if (!data) {
        throw new DatabaseError('No data returned from cards query');
      }

      // Calculate pagination metadata
      const totalItems = count || 0;
      const totalPages = Math.ceil(totalItems / validatedLimit);

      return {
        data: data as Card[],
        pagination: {
          page: validatedPage,
          limit: validatedLimit,
          total_items: totalItems,
          total_pages: totalPages,
          has_next: validatedPage < totalPages,
          has_prev: validatedPage > 1,
        },
      };
    } catch (err) {
      if (err instanceof DatabaseError) {
        throw err;
      }
      throw new DatabaseError(`Unexpected error fetching cards: ${String(err)}`);
    }
  }

  /**
   * Get specific card by ID with ownership statistics
   * 
   * @param cardId - Card UUID
   * @returns Card with stats
   * @throws NotFoundError if card doesn't exist
   * @throws DatabaseError if query fails
   */
  async getCardById(cardId: string): Promise<CardWithStats> {
    try {
      // Get card details
      const { data: cardData, error: cardError } = await this.supabase
        .from('cards')
        .select('*')
        .eq('id', cardId)
        .single();

      if (cardError) {
        if (cardError.code === 'PGRST116') {
          throw new NotFoundError('Card not found');
        }
        throw new DatabaseError(`Failed to fetch card: ${cardError.message}`);
      }

      if (!cardData) {
        throw new NotFoundError('Card not found');
      }

      // Get ownership statistics
      const stats = await this.getCardStats(cardId, (cardData as CardRow).rarity);

      return {
        ...(cardData as Card),
        stats,
      };
    } catch (err) {
      if (err instanceof NotFoundError || err instanceof DatabaseError) {
        throw err;
      }
      throw new DatabaseError(`Unexpected error fetching card: ${String(err)}`);
    }
  }

  /**
   * Get card ownership statistics
   * 
   * @param cardId - Card UUID
   * @param rarity - Card rarity tier
   * @returns Card statistics
   * @private
   */
  private async getCardStats(
    cardId: string,
    rarity: RarityTier
  ): Promise<CardWithStats['stats']> {
    try {
      // Get total unique owners count
      const { count: ownersCount, error: ownersError } = await this.supabase
        .from('user_collections')
        .select('user_id', { count: 'exact', head: true })
        .eq('card_id', cardId);

      if (ownersError) {
        throw new DatabaseError(`Failed to fetch card stats: ${ownersError.message}`);
      }

      // Get drop rate from rarity distribution
      const { data: rarityData, error: rarityError } = await this.supabase
        .from('rarity_distribution')
        .select('*')
        .single();

      if (rarityError) {
        throw new DatabaseError(`Failed to fetch rarity distribution: ${rarityError.message}`);
      }

      // Map rarity to weight field
      const rarityWeightMap: Record<RarityTier, string> = {
        Common: 'common_weight',
        Rare: 'rare_weight',
        Epic: 'epic_weight',
        Legendary: 'legendary_weight',
        Fabled: 'fabled_weight',
      };

      const weightField = rarityWeightMap[rarity];
      const dropRate = rarityData?.[weightField] || 0;

      // Get card creation date
      const { data: cardData, error: cardError } = await this.supabase
        .from('cards')
        .select('created_at')
        .eq('id', cardId)
        .single();

      if (cardError) {
        throw new DatabaseError(`Failed to fetch card creation date: ${cardError.message}`);
      }

      return {
        total_owners: ownersCount || 0,
        drop_rate: Number(dropRate),
        first_appeared: cardData?.created_at || new Date().toISOString(),
      };
    } catch (err) {
      if (err instanceof DatabaseError) {
        throw err;
      }
      throw new DatabaseError(`Unexpected error fetching card stats: ${String(err)}`);
    }
  }

  /**
   * Get total card count (for stats/leaderboard)
   * 
   * @returns Total number of cards in the pool
   */
  async getTotalCardCount(): Promise<number> {
    try {
      const { count, error } = await this.supabase
        .from('cards')
        .select('*', { count: 'exact', head: true });

      if (error) {
        throw new DatabaseError(`Failed to fetch card count: ${error.message}`);
      }

      return count || 0;
    } catch (err) {
      if (err instanceof DatabaseError) {
        throw err;
      }
      throw new DatabaseError(`Unexpected error fetching card count: ${String(err)}`);
    }
  }

  /**
   * Get cards by rarity tier (helper for draw mechanics)
   * 
   * @param rarity - Rarity tier to filter
   * @returns Array of cards matching the rarity
   */
  async getCardsByRarity(rarity: RarityTier): Promise<Card[]> {
    try {
      const { data, error } = await this.supabase
        .from('cards')
        .select('*')
        .eq('rarity', rarity);

      if (error) {
        throw new DatabaseError(`Failed to fetch cards by rarity: ${error.message}`);
      }

      return (data || []) as Card[];
    } catch (err) {
      if (err instanceof DatabaseError) {
        throw err;
      }
      throw new DatabaseError(`Unexpected error fetching cards by rarity: ${String(err)}`);
    }
  }
}
