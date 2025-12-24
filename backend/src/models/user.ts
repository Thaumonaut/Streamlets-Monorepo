/**
 * User Model Types
 * 
 * Represents viewers/players in the Streamlets system.
 * Supports dual authentication: Twitch Extension JWT + Supabase Auth (website).
 * 
 * @see specs/001-twitch-emote-mvp/data-model.md - Entity definition
 * @see specs/001-twitch-emote-mvp/contracts/users.md - API contracts
 */

/**
 * User database entity
 * Matches users table schema from data-model.md
 */
export interface User {
  id: string;                  // Internal user UUID
  twitch_id: string;           // Twitch user ID (from JWT)
  twitch_username: string;     // Twitch display name
  supabase_auth_id?: string;   // Supabase Auth user ID (website login, optional)
  created_at: string;          // ISO 8601 timestamp
  updated_at: string;          // ISO 8601 timestamp
}

/**
 * User profile with collection statistics
 * Used by GET /api/v1/users/me endpoint
 */
export interface UserProfile extends User {
  stats: {
    total_cards: number;           // Total cards in collection (including duplicates)
    unique_cards: number;          // Unique cards owned
    completion_percentage: number; // Percentage of all cards collected (0-100)
    rarity_counts: {
      Common: number;
      Rare: number;
      Epic: number;
      Legendary: number;
      Fabled: number;
    };
  };
}

/**
 * Create user input
 * Used when creating new user from Twitch Extension JWT
 */
export interface CreateUserInput {
  twitch_id: string;
  twitch_username: string;
  supabase_auth_id?: string;
}

/**
 * Update user input
 * Used when linking Supabase Auth account to existing Twitch user
 */
export interface UpdateUserInput {
  twitch_username?: string;
  supabase_auth_id?: string;
}

/**
 * Database row type for users table
 * Matches Supabase query results
 */
export interface UserRow {
  id: string;
  twitch_id: string;
  twitch_username: string;
  supabase_auth_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * User context extracted from authentication
 * Used in middleware and request handlers
 */
export interface UserContext {
  userId: string;        // Internal user UUID
  twitchId: string;      // Twitch user ID
  username: string;      // Twitch display name
  role?: string;         // Twitch Extension role (viewer/broadcaster/moderator)
  channelId?: string;    // Broadcaster channel ID
}

/**
 * Type guard to check if object is a valid User
 */
export function isUser(obj: unknown): obj is User {
  if (typeof obj !== 'object' || obj === null) return false;
  
  const user = obj as Record<string, unknown>;
  
  return (
    typeof user.id === 'string' &&
    typeof user.twitch_id === 'string' &&
    typeof user.twitch_username === 'string' &&
    typeof user.created_at === 'string' &&
    typeof user.updated_at === 'string'
  );
}

/**
 * Type guard to check if object is UserProfile
 */
export function isUserProfile(obj: unknown): obj is UserProfile {
  if (!isUser(obj)) return false;
  
  const user = obj as unknown as Record<string, unknown>;
  
  return (
    typeof user.stats === 'object' &&
    user.stats !== null &&
    typeof (user.stats as Record<string, unknown>).total_cards === 'number' &&
    typeof (user.stats as Record<string, unknown>).unique_cards === 'number' &&
    typeof (user.stats as Record<string, unknown>).completion_percentage === 'number' &&
    typeof (user.stats as Record<string, unknown>).rarity_counts === 'object'
  );
}

/**
 * Helper to convert UserRow to User
 */
export function userRowToUser(row: UserRow): User {
  const user: User = {
    id: row.id,
    twitch_id: row.twitch_id,
    twitch_username: row.twitch_username,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
  
  if (row.supabase_auth_id) {
    user.supabase_auth_id = row.supabase_auth_id;
  }
  
  return user;
}
