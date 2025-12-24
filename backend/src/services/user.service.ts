/**
 * User Service
 * 
 * Business logic for user operations:
 * - Get or create user from Twitch JWT
 * - Retrieve user profile with collection statistics
 * - Manage user collection
 * 
 * @see specs/001-twitch-emote-mvp/contracts/users.md - API specifications
 * @see specs/001-twitch-emote-mvp/data-model.md - User entity definition
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  User,
  UserProfile,
  CreateUserInput,
  UserRow,
} from '../models/user';
import type { CollectionEntry } from '../../../shared/types';
import { DatabaseError, NotFoundError } from '../middleware/error';
import { createInitialTicketBalance } from './ticket-regeneration';
import { userRowToUser } from '../models/user';

/**
 * UserService class
 * Handles all user-related business logic
 */
export class UserService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Get or create user from Twitch JWT claims
   * Creates new user with initial ticket balance if not exists
   * 
   * @param twitchId - Twitch user ID from JWT
   * @param twitchUsername - Twitch display name from JWT
   * @returns User entity
   * @throws DatabaseError if operation fails
   */
  async getOrCreateUser(twitchId: string, twitchUsername: string): Promise<User> {
    try {
      // Try to find existing user
      const { data: existingUser, error: findError } = await this.supabase
        .from('users')
        .select('*')
        .eq('twitch_id', twitchId)
        .single();

      if (findError && findError.code !== 'PGRST116') {
        // PGRST116 = not found (expected), other errors are problems
        throw new DatabaseError(`Failed to query user: ${findError.message}`);
      }

      if (existingUser) {
        // Update username if changed
        if (existingUser.twitch_username !== twitchUsername) {
          const { data: updated, error: updateError } = await this.supabase
            .from('users')
            .update({ twitch_username: twitchUsername, updated_at: new Date().toISOString() })
            .eq('id', existingUser.id)
            .select()
            .single();

          if (updateError) {
            throw new DatabaseError(`Failed to update username: ${updateError.message}`);
          }

          return userRowToUser(updated as UserRow);
        }

        return userRowToUser(existingUser as UserRow);
      }

      // Create new user
      const newUser: CreateUserInput = {
        twitch_id: twitchId,
        twitch_username: twitchUsername,
      };

      const { data: createdUser, error: createError } = await this.supabase
        .from('users')
        .insert(newUser)
        .select()
        .single();

      if (createError) {
        throw new DatabaseError(`Failed to create user: ${createError.message}`);
      }

      if (!createdUser) {
        throw new DatabaseError('User creation returned no data');
      }

      // Create initial ticket balance (5 tickets per spec)
      const userId = (createdUser as UserRow).id;
      const initialBalance = createInitialTicketBalance(userId);
      
      const { error: balanceError } = await this.supabase
        .from('ticket_balances')
        .insert(initialBalance);
      
      if (balanceError) {
        throw new DatabaseError(`Failed to create initial ticket balance: ${balanceError.message}`);
      }

      return userRowToUser(createdUser as UserRow);
    } catch (err) {
      if (err instanceof DatabaseError) {
        throw err;
      }
      throw new DatabaseError(`Unexpected error in getOrCreateUser: ${String(err)}`);
    }
  }

  /**
   * Get user by internal UUID
   * 
   * @param userId - Internal user UUID
   * @returns User entity
   * @throws NotFoundError if user doesn't exist
   * @throws DatabaseError if query fails
   */
  async getUserById(userId: string): Promise<User> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new NotFoundError('User not found');
        }
        throw new DatabaseError(`Failed to fetch user: ${error.message}`);
      }

      if (!data) {
        throw new NotFoundError('User not found');
      }

      return userRowToUser(data as UserRow);
    } catch (err) {
      if (err instanceof NotFoundError || err instanceof DatabaseError) {
        throw err;
      }
      throw new DatabaseError(`Unexpected error fetching user: ${String(err)}`);
    }
  }

  /**
   * Get user by Twitch ID
   * 
   * @param twitchId - Twitch user ID
   * @returns User entity
   * @throws NotFoundError if user doesn't exist
   * @throws DatabaseError if query fails
   */
  async getUserByTwitchId(twitchId: string): Promise<User> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('twitch_id', twitchId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new NotFoundError('User not found');
        }
        throw new DatabaseError(`Failed to fetch user: ${error.message}`);
      }

      if (!data) {
        throw new NotFoundError('User not found');
      }

      return userRowToUser(data as UserRow);
    } catch (err) {
      if (err instanceof NotFoundError || err instanceof DatabaseError) {
        throw err;
      }
      throw new DatabaseError(`Unexpected error fetching user: ${String(err)}`);
    }
  }

  /**
   * Get user profile with collection statistics
   * 
   * @param userId - Internal user UUID
   * @returns User profile with stats
   * @throws NotFoundError if user doesn't exist
   * @throws DatabaseError if query fails
   */
  async getUserProfile(userId: string): Promise<UserProfile> {
    try {
      // Get user
      const user = await this.getUserById(userId);

      // Get collection stats
      const stats = await this.getCollectionStats(userId);

      return {
        ...user,
        stats,
      };
    } catch (err) {
      if (err instanceof NotFoundError || err instanceof DatabaseError) {
        throw err;
      }
      throw new DatabaseError(`Unexpected error fetching user profile: ${String(err)}`);
    }
  }

  /**
   * Get user's card collection
   * 
   * @param userId - Internal user UUID
   * @returns Array of collection entries
   * @throws DatabaseError if query fails
   */
  async getUserCollection(userId: string): Promise<CollectionEntry[]> {
    try {
      const { data, error } = await this.supabase
        .from('user_collections')
        .select(`
          id,
          user_id,
          card_id,
          acquired_at,
          source,
          card:cards (
            id,
            emote_id,
            emote_name,
            emote_cdn_url,
            rarity,
            created_at
          )
        `)
        .eq('user_id', userId)
        .order('acquired_at', { ascending: false });

      if (error) {
        throw new DatabaseError(`Failed to fetch user collection: ${error.message}`);
      }

      if (!data) {
        return [];
      }

      // Transform to CollectionEntry format
      return data.map((entry: any) => ({
        id: entry.id,
        user_id: entry.user_id,
        card_id: entry.card_id,
        card: entry.card,
        acquired_at: entry.acquired_at,
        source: entry.source,
      }));
    } catch (err) {
      if (err instanceof DatabaseError) {
        throw err;
      }
      throw new DatabaseError(`Unexpected error fetching user collection: ${String(err)}`);
    }
  }

  /**
   * Get collection statistics for a user
   * 
   * @param userId - Internal user UUID
   * @returns Collection statistics
   * @private
   */
  private async getCollectionStats(userId: string): Promise<UserProfile['stats']> {
    try {
      // Get total cards (including duplicates)
      const { count: totalCards, error: totalError } = await this.supabase
        .from('user_collections')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (totalError) {
        throw new DatabaseError(`Failed to count total cards: ${totalError.message}`);
      }

      // Get unique cards
      const { data: uniqueData, error: uniqueError } = await this.supabase
        .from('user_collections')
        .select('card_id')
        .eq('user_id', userId);

      if (uniqueError) {
        throw new DatabaseError(`Failed to fetch unique cards: ${uniqueError.message}`);
      }

      const uniqueCardIds = new Set(uniqueData?.map((entry: any) => entry.card_id) || []);
      const uniqueCards = uniqueCardIds.size;

      // Get total available cards for completion percentage
      const { count: totalAvailableCards, error: availableError } = await this.supabase
        .from('cards')
        .select('*', { count: 'exact', head: true });

      if (availableError) {
        throw new DatabaseError(`Failed to count available cards: ${availableError.message}`);
      }

      const completionPercentage =
        totalAvailableCards && totalAvailableCards > 0
          ? (uniqueCards / totalAvailableCards) * 100
          : 0;

      // Get rarity counts
      const { data: collectionData, error: collectionError } = await this.supabase
        .from('user_collections')
        .select(`
          card:cards (
            rarity
          )
        `)
        .eq('user_id', userId);

      if (collectionError) {
        throw new DatabaseError(`Failed to fetch collection for rarity counts: ${collectionError.message}`);
      }

      const rarityCounts = {
        Common: 0,
        Rare: 0,
        Epic: 0,
        Legendary: 0,
        Fabled: 0,
      };

      collectionData?.forEach((entry: any) => {
        const rarity = entry.card?.rarity;
        if (rarity && rarity in rarityCounts) {
          rarityCounts[rarity as keyof typeof rarityCounts]++;
        }
      });

      return {
        total_cards: totalCards || 0,
        unique_cards: uniqueCards,
        completion_percentage: Math.round(completionPercentage * 100) / 100,
        rarity_counts: rarityCounts,
      };
    } catch (err) {
      if (err instanceof DatabaseError) {
        throw err;
      }
      throw new DatabaseError(`Unexpected error fetching collection stats: ${String(err)}`);
    }
  }
}
