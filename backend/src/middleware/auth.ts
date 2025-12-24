/**
 * Twitch JWT Authentication Middleware
 * 
 * Validates Twitch Extension JWTs and extracts user information.
 * Implements dual authentication: Twitch JWT (extension) + Supabase Auth (website)
 * 
 * Reference: research.md section 5 - Dual Auth approach
 */

import { Context, Next } from 'hono';
import { verify } from 'jsonwebtoken';

// Twitch JWT payload structure
interface TwitchJWTPayload {
  user_id: string;          // Opaque Twitch user ID
  channel_id?: string;      // Channel where extension is active
  role: 'viewer' | 'broadcaster' | 'moderator';
  exp: number;              // Expiration timestamp
  iat: number;              // Issued at timestamp
}

// Authenticated user context (attached to Hono context)
export interface AuthenticatedUser {
  twitchId: string;
  twitchUsername?: string;  // May need to fetch from database
  role: 'viewer' | 'broadcaster' | 'moderator';
  channelId?: string;
}

// Extend Hono context to include authenticated user
declare module 'hono' {
  interface ContextVariableMap {
    user: AuthenticatedUser;
  }
}

/**
 * Middleware to validate Twitch Extension JWT
 * 
 * Usage:
 *   app.use('/api/*', authenticateTwitchJWT)
 */
export async function authenticateTwitchJWT(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader) {
    return c.json(
      { 
        error: {
          code: 'unauthorized',
          message: 'Missing Authorization header',
          timestamp: new Date().toISOString(),
        }
      },
      401
    );
  }
  
  // Extract token from "Bearer <token>" format
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return c.json(
      {
        error: {
          code: 'unauthorized',
          message: 'Invalid Authorization header format. Expected: Bearer <token>',
          timestamp: new Date().toISOString(),
        }
      },
      401
    );
  }
  
  const token = parts[1];
  
  // Validate JWT using Twitch Extension secret
  try {
    const secret = c.env.TWITCH_EXTENSION_SECRET;
    
    if (!secret) {
      console.error('TWITCH_EXTENSION_SECRET environment variable not set');
      return c.json(
        {
          error: {
            code: 'internal_error',
            message: 'Server configuration error',
            timestamp: new Date().toISOString(),
          }
        },
        500
      );
    }
    
    // Verify and decode JWT
    const decoded = verify(token, Buffer.from(secret, 'base64'), {
      algorithms: ['HS256'],
    }) as TwitchJWTPayload;
    
    // Check expiration (verify() already does this, but we double-check)
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < now) {
      return c.json(
        {
          error: {
            code: 'unauthorized',
            message: 'Token expired',
            timestamp: new Date().toISOString(),
          }
        },
        401
      );
    }
    
    // Attach authenticated user to context
    c.set('user', {
      twitchId: decoded.user_id,
      role: decoded.role,
      channelId: decoded.channel_id,
    });
    
    await next();
  } catch (error) {
    console.error('JWT validation error:', error);
    
    return c.json(
      {
        error: {
          code: 'unauthorized',
          message: 'Invalid or expired token',
          details: error instanceof Error ? { message: error.message } : undefined,
          timestamp: new Date().toISOString(),
        }
      },
      401
    );
  }
}

/**
 * Optional middleware to require specific roles
 * 
 * Usage:
 *   app.delete('/api/admin/*', requireRole('broadcaster'))
 */
export function requireRole(...allowedRoles: Array<'viewer' | 'broadcaster' | 'moderator'>) {
  return async (c: Context, next: Next) => {
    const user = c.get('user');
    
    if (!user) {
      return c.json(
        {
          error: {
            code: 'unauthorized',
            message: 'Authentication required',
            timestamp: new Date().toISOString(),
          }
        },
        401
      );
    }
    
    if (!allowedRoles.includes(user.role)) {
      return c.json(
        {
          error: {
            code: 'forbidden',
            message: `Requires one of: ${allowedRoles.join(', ')}`,
            timestamp: new Date().toISOString(),
          }
        },
        403
      );
    }
    
    await next();
  };
}

/**
 * Middleware for optional authentication
 * Sets user if token is valid, but doesn't fail if missing
 * 
 * Usage:
 *   app.get('/api/v1/cards', optionalAuth, getCards)
 */
export async function optionalAuth(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader) {
    // No auth provided, continue without user context
    await next();
    return;
  }
  
  // Try to authenticate, but don't fail on error
  try {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      const token = parts[1];
      const secret = c.env.TWITCH_EXTENSION_SECRET;
      
      if (secret) {
        const decoded = verify(token, Buffer.from(secret, 'base64'), {
          algorithms: ['HS256'],
        }) as TwitchJWTPayload;
        
        c.set('user', {
          twitchId: decoded.user_id,
          role: decoded.role,
          channelId: decoded.channel_id,
        });
      }
    }
  } catch (error) {
    // Silently fail - optional auth
    console.warn('Optional auth failed:', error);
  }
  
  await next();
}
