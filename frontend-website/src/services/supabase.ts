/**
 * Supabase Auth Client for Companion Website
 * 
 * Provides authentication for the companion website using Supabase Auth.
 * Separate from Twitch Extension authentication flow.
 * 
 * Reference: research.md section 5 - Dual authentication approach
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase client configuration
 */
interface SupabaseConfig {
  url: string;
  publicKey: string;
}

/**
 * Get Supabase configuration from environment variables
 */
function getSupabaseConfig(): SupabaseConfig {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const publicKey = import.meta.env.VITE_SUPABASE_API_KEY_PUBLIC;

  if (!url || !publicKey) {
    throw new Error(
      'Missing Supabase environment variables. ' +
      'Please set VITE_SUPABASE_URL and VITE_SUPABASE_API_KEY_PUBLIC in .env file.'
    );
  }

  return { url, publicKey };
}

/**
 * Create Supabase client instance
 */
export function createSupabaseClient(): SupabaseClient {
  const config = getSupabaseConfig();

  return createClient(config.url, config.publicKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
}

/**
 * Singleton Supabase client
 */
let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    supabaseInstance = createSupabaseClient();
  }
  return supabaseInstance;
}

/**
 * Authentication helper functions
 */

/**
 * Sign up with email and password
 */
export async function signUp(email: string, password: string) {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string) {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

/**
 * Sign in with OAuth provider (e.g., Google, GitHub)
 */
export async function signInWithOAuth(provider: 'google' | 'github' | 'discord') {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

/**
 * Sign out current user
 */
export async function signOut() {
  const supabase = getSupabaseClient();
  
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Get current session
 */
export async function getSession() {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error(error.message);
  }

  return data.session;
}

/**
 * Get current user
 */
export async function getCurrentUser() {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw new Error(error.message);
  }

  return data.user;
}

/**
 * Listen to auth state changes
 */
export function onAuthStateChange(callback: (event: string, session: any) => void) {
  const supabase = getSupabaseClient();
  
  const { data } = supabase.auth.onAuthStateChange(callback);

  return data.subscription;
}

/**
 * Send password reset email
 */
export async function resetPassword(email: string) {
  const supabase = getSupabaseClient();
  
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  });

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Update user password
 */
export async function updatePassword(newPassword: string) {
  const supabase = getSupabaseClient();
  
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Link Twitch account to Supabase user
 * This allows users to access their collection on the website
 */
export async function linkTwitchAccount(twitchId: string, twitchUsername: string) {
  const supabase = getSupabaseClient();
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('No authenticated user');
  }

  // Update user record with Twitch ID
  const { error } = await supabase
    .from('users')
    .update({
      supabase_auth_id: user.id,
      twitch_username: twitchUsername,
      updated_at: new Date().toISOString(),
    })
    .eq('twitch_id', twitchId);

  if (error) {
    throw new Error(`Failed to link Twitch account: ${error.message}`);
  }
}

/**
 * Check if user has linked Twitch account
 */
export async function hasLinkedTwitchAccount(): Promise<boolean> {
  const supabase = getSupabaseClient();
  const user = await getCurrentUser();

  if (!user) {
    return false;
  }

  const { data, error } = await supabase
    .from('users')
    .select('twitch_id')
    .eq('supabase_auth_id', user.id)
    .single();

  if (error || !data) {
    return false;
  }

  return !!data.twitch_id;
}
