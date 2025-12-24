/**
 * Health Check Routes
 * 
 * Provides endpoints for monitoring service health and readiness.
 * Used by load balancers and monitoring systems.
 * 
 * Reference: plan.md - Performance monitoring requirements
 */

import { Hono } from 'hono';
import { checkDatabaseHealth, getDatabaseStats } from '../../db/client';
import { performanceTracker } from '../../middleware/logger';

const health = new Hono();

/**
 * Basic health check - always returns 200 if service is running
 * Use for simple uptime monitoring
 * 
 * GET /health
 */
health.get('/', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
    environment: c.env.NODE_ENV || 'production',
  });
});

/**
 * Detailed health check with dependency status
 * Checks database connectivity and other critical services
 * 
 * GET /health/detailed
 */
health.get('/detailed', async (c) => {
  const startTime = Date.now();

  // Check database health
  const dbHealthy = await checkDatabaseHealth(c.env);

  const duration = Date.now() - startTime;

  const overallStatus = dbHealthy ? 'healthy' : 'degraded';

  return c.json(
    {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: '0.1.0',
      environment: c.env.NODE_ENV || 'production',
      checks: {
        database: {
          status: dbHealthy ? 'healthy' : 'unhealthy',
          responseTime: duration,
        },
      },
      uptime: process.uptime ? process.uptime() : null,
    },
    dbHealthy ? 200 : 503
  );
});

/**
 * Readiness check - indicates if service can accept traffic
 * Returns 503 if critical dependencies are unavailable
 * 
 * GET /health/ready
 */
health.get('/ready', async (c) => {
  // Check if database is accessible
  const dbHealthy = await checkDatabaseHealth(c.env);

  if (!dbHealthy) {
    return c.json(
      {
        status: 'not_ready',
        reason: 'Database unavailable',
        timestamp: new Date().toISOString(),
      },
      503
    );
  }

  return c.json({
    status: 'ready',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Liveness check - indicates if service should be restarted
 * Returns 200 unless service is in a fatal error state
 * 
 * GET /health/live
 */
health.get('/live', (c) => {
  // Simple liveness check - if we can respond, we're alive
  return c.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Performance metrics endpoint
 * Returns API performance statistics
 * 
 * GET /health/metrics
 */
health.get('/metrics', async (c) => {
  const stats = performanceTracker.getAllStats();
  const dbStats = await getDatabaseStats(c.env).catch(() => null);

  return c.json({
    timestamp: new Date().toISOString(),
    api: {
      endpoints: stats,
    },
    database: dbStats,
  });
});

export default health;
