/**
 * Supabase client configuration for Cloudflare Workers
 * 
 * This module provides a configured Supabase client for database operations.
 * It handles environment variable loading and client initialization.
 */

import { createClient } from '@supabase/supabase-js';

// Environment variables are injected by Cloudflare Workers
declare global {
  interface Env {
    SUPABASE_URL: string;
    SUPABASE_ANON_KEY: string;
    SUPABASE_SERVICE_ROLE_KEY: string;
    NODE_ENV: 'development' | 'staging' | 'production';
  }
}

/**
 * Supabase client with service role privileges
 * Use for operations that require bypassing RLS policies
 */
export function createServiceRoleClient(env: Env) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        'x-application-name': 'streamlets-backend',
      },
    },
  });
}

/**
 * Supabase client with anon key
 * Use for operations that respect RLS policies
 */
export function createAnonClient(env: Env) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        'x-application-name': 'streamlets-backend',
      },
    },
  });
}

/**
 * Supabase client with custom authorization header
 * Use for operations that need to pass through JWT claims for RLS
 */
export function createAuthenticatedClient(env: Env, authorization: string) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        'x-application-name': 'streamlets-backend',
        Authorization: authorization,
      },
    },
  });
}

/**
 * Execute a database RPC (stored procedure) call
 */
export async function executeRpc<T = unknown>(
  env: Env,
  functionName: string,
  params: Record<string, unknown>
): Promise<T> {
  const client = createServiceRoleClient(env);
  
  const { data, error } = await client.rpc(functionName, params);
  
  if (error) {
    throw new DatabaseError(`RPC ${functionName} failed`, error);
  }
  
  return data as T;
}

/**
 * Database error class
 */
export class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

/**
 * Check database connection health
 */
export async function checkDatabaseHealth(env: Env): Promise<boolean> {
  try {
    const client = createServiceRoleClient(env);
    const { error } = await client.from('cards').select('count').limit(1);
    
    if (error) {
      console.error('Database health check failed:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Database health check exception:', error);
    return false;
  }
}

/**
 * Get database statistics for monitoring
 */
export async function getDatabaseStats(env: Env) {
  const client = createServiceRoleClient(env);
  
  const [
    usersCount,
    cardsCount,
    collectionsCount,
    drawsCount,
  ] = await Promise.all([
    client.from('users').select('count', { count: 'exact', head: true }),
    client.from('cards').select('count', { count: 'exact', head: true }),
    client.from('user_collections').select('count', { count: 'exact', head: true }),
    client.from('draw_transactions').select('count', { count: 'exact', head: true }),
  ]);
  
  return {
    users: usersCount.count || 0,
    cards: cardsCount.count || 0,
    collections: collectionsCount.count || 0,
    draws: drawsCount.count || 0,
    timestamp: new Date().toISOString(),
  };
}
