/**
 * Main Hono Application Entry Point
 * 
 * Cloudflare Workers backend for Twitch Emote MVP.
 * Implements server-side authority for all game mechanics.
 * 
 * Reference: plan.md - Edge-Native Architecture
 */

import { Hono } from 'hono';
import { getCORSMiddleware } from './middleware/cors';
import { errorHandler } from './middleware/error';
import { requestLogger, trackPerformance } from './middleware/logger';

// Environment bindings for Cloudflare Workers
export interface Env {
  // Supabase - Updated to new API key naming
  SUPABASE_URL: string;
  SUPABASE_API_KEY_PUBLIC: string;   // Publishable key (browser-safe)
  SUPABASE_API_KEY_SECRET: string;   // Secret key (server-only, elevated privileges)
  
  // Twitch Extension
  TWITCH_EXTENSION_CLIENT_ID: string;
  TWITCH_EXTENSION_SECRET: string;
  
  // Environment
  NODE_ENV: 'development' | 'staging' | 'production';
  API_BASE_URL: string;
}

// Initialize Hono app with type-safe environment
const app = new Hono<{ Bindings: Env }>();

// ==================== Global Middleware ====================

// Error handler (must be first to catch all errors)
app.onError(errorHandler);

// Request logging and performance tracking
app.use('*', requestLogger);
app.use('*', trackPerformance);

// CORS configuration (environment-aware)
app.use('*', async (c, next) => {
  const env = c.env.NODE_ENV || 'production';
  const corsMiddleware = getCORSMiddleware(env);
  return corsMiddleware(c, next);
});

// ==================== Health Check ====================

app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
    environment: c.env.NODE_ENV || 'production',
  });
});

app.get('/', (c) => {
  return c.html("<h1>Hello World</h1>")
})

// ==================== API Routes ====================

// API v1 router (will be populated with route modules)
const apiV1 = new Hono<{ Bindings: Env }>();

// Register health check routes
import healthRouter from './api/routes/health';
apiV1.route('/health', healthRouter);

// TODO: Register additional route modules here after they're created
// import cardsRouter from './api/routes/cards';
// import usersRouter from './api/routes/users';
// import drawsRouter from './api/routes/draws';
//
// apiV1.route('/cards', cardsRouter);
// apiV1.route('/users', usersRouter);
// apiV1.route('/draws', drawsRouter);

// Mount API v1
app.route('/api/v1', apiV1);

// ==================== 404 Handler ====================

app.notFound((c) => {
  return c.json(
    {
      error: {
        code: 'not_found',
        message: `Route ${c.req.method} ${c.req.path} not found`,
        timestamp: new Date().toISOString(),
      },
    },
    404
  );
});

// ==================== Export ====================

/**
 * Cloudflare Workers fetch handler
 * This is the entry point for all requests
 */
export default app;
