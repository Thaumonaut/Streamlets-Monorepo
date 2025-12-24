/**
 * CORS Middleware
 * 
 * Configures Cross-Origin Resource Sharing for the API.
 * Allows Twitch Extension and companion website to access the backend.
 * 
 * Reference: research.md section 5 - Dual frontend architecture
 */

import { Context, Next } from 'hono';
import { cors } from 'hono/cors';

/**
 * CORS configuration based on environment
 */
export function getCORSMiddleware(env: string) {
  // Development: Allow localhost origins for local testing
  if (env === 'development') {
    return cors({
      origin: [
        'http://localhost:5173',  // Frontend Extension (Vite default)
        'http://localhost:5174',  // Frontend Website (Vite)
        'http://localhost:3000',  // Alternative port
        'http://127.0.0.1:5173',
        'http://127.0.0.1:5174',
      ],
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
      exposeHeaders: ['Content-Length', 'X-Request-ID'],
      maxAge: 600, // 10 minutes
      credentials: true,
    });
  }

  // Staging: Allow staging domains
  if (env === 'staging') {
    return cors({
      origin: [
        'https://streamlets-extension-staging.pages.dev',
        'https://streamlets-staging.pages.dev',
      ],
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
      exposeHeaders: ['Content-Length', 'X-Request-ID'],
      maxAge: 3600, // 1 hour
      credentials: true,
    });
  }

  // Production: Strict origin whitelist
  return cors({
    origin: [
      // Twitch Extension CDN (where extension assets are hosted)
      /^https:\/\/.*\.ext-twitch\.tv$/,
      // Production companion website
      'https://streamlets.app',
      'https://www.streamlets.app',
    ],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['Content-Length', 'X-Request-ID'],
    maxAge: 86400, // 24 hours
    credentials: true,
  });
}

/**
 * Custom CORS middleware with dynamic origin validation
 * Use when you need more control than hono/cors provides
 */
export async function customCORS(c: Context, next: Next) {
  const origin = c.req.header('Origin');
  const env = c.env.NODE_ENV || 'production';

  // Determine if origin is allowed
  const allowedOrigins = getAllowedOrigins(env);
  const isAllowed = origin ? isOriginAllowed(origin, allowedOrigins) : false;

  // Set CORS headers
  if (isAllowed && origin) {
    c.header('Access-Control-Allow-Origin', origin);
    c.header('Access-Control-Allow-Credentials', 'true');
  }

  // Handle preflight requests
  if (c.req.method === 'OPTIONS') {
    c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    c.header('Access-Control-Max-Age', '86400');
    return c.text('', 204);
  }

  await next();
}

/**
 * Get allowed origins based on environment
 */
function getAllowedOrigins(env: string): Array<string | RegExp> {
  if (env === 'development') {
    return [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174',
    ];
  }

  if (env === 'staging') {
    return [
      'https://streamlets-extension-staging.pages.dev',
      'https://streamlets-staging.pages.dev',
    ];
  }

  return [
    /^https:\/\/.*\.ext-twitch\.tv$/,
    'https://streamlets.app',
    'https://www.streamlets.app',
  ];
}

/**
 * Check if origin is in allowed list
 */
function isOriginAllowed(
  origin: string,
  allowedOrigins: Array<string | RegExp>
): boolean {
  return allowedOrigins.some((allowed) => {
    if (typeof allowed === 'string') {
      return origin === allowed;
    }
    return allowed.test(origin);
  });
}
