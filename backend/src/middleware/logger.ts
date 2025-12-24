/**
 * Logging Middleware
 * 
 * Structured logging for API requests and responses.
 * Tracks performance metrics and error rates.
 * 
 * Reference: plan.md - Performance Goals (API <100ms p95)
 */

import { Context, Next } from 'hono';

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

/**
 * Structured log entry
 */
interface LogEntry {
  level: LogLevel;
  timestamp: string;
  message: string;
  method?: string;
  path?: string;
  status?: number;
  duration?: number;
  userId?: string;
  error?: string;
  details?: Record<string, unknown>;
}

/**
 * Request logging middleware
 * Logs all incoming requests and their response times
 */
export async function requestLogger(c: Context, next: Next) {
  const startTime = Date.now();
  const method = c.req.method;
  const path = c.req.path;
  
  // Generate unique request ID
  const requestId = generateRequestId();
  c.header('X-Request-ID', requestId);

  try {
    await next();
  } finally {
    const duration = Date.now() - startTime;
    const status = c.res.status;
    
    // Get authenticated user if available
    const user = c.get('user');
    
    // Determine log level based on status code
    const level = getLogLevelForStatus(status);
    
    const logEntry: LogEntry = {
      level,
      timestamp: new Date().toISOString(),
      message: `${method} ${path} ${status}`,
      method,
      path,
      status,
      duration,
      userId: user?.twitchId,
    };

    // Log the entry
    log(logEntry);

    // Warn on slow requests (>100ms target from plan.md)
    if (duration > 100) {
      logWarn({
        message: `Slow request detected: ${method} ${path}`,
        duration,
        threshold: 100,
      });
    }
  }
}

/**
 * Structured logger functions
 */
export function log(entry: LogEntry) {
  const output = JSON.stringify(entry);
  
  switch (entry.level) {
    case LogLevel.ERROR:
      console.error(output);
      break;
    case LogLevel.WARN:
      console.warn(output);
      break;
    case LogLevel.DEBUG:
    case LogLevel.INFO:
    default:
      console.log(output);
      break;
  }
}

export function logInfo(message: string, details?: Record<string, unknown>) {
  log({
    level: LogLevel.INFO,
    timestamp: new Date().toISOString(),
    message,
    details,
  });
}

export function logWarn(details: Record<string, unknown>) {
  log({
    level: LogLevel.WARN,
    timestamp: new Date().toISOString(),
    message: details.message as string || 'Warning',
    details,
  });
}

export function logError(error: Error, context?: Record<string, unknown>) {
  log({
    level: LogLevel.ERROR,
    timestamp: new Date().toISOString(),
    message: error.message,
    error: error.stack,
    details: context,
  });
}

export function logDebug(message: string, details?: Record<string, unknown>) {
  // Only log debug in development
  if (process.env.NODE_ENV === 'development') {
    log({
      level: LogLevel.DEBUG,
      timestamp: new Date().toISOString(),
      message,
      details,
    });
  }
}

/**
 * Performance tracking middleware
 * Tracks p95 latency for API endpoints
 */
export class PerformanceTracker {
  private metrics: Map<string, number[]> = new Map();

  track(endpoint: string, duration: number) {
    if (!this.metrics.has(endpoint)) {
      this.metrics.set(endpoint, []);
    }
    
    const durations = this.metrics.get(endpoint)!;
    durations.push(duration);
    
    // Keep only last 1000 requests per endpoint
    if (durations.length > 1000) {
      durations.shift();
    }
  }

  getP95(endpoint: string): number | null {
    const durations = this.metrics.get(endpoint);
    if (!durations || durations.length === 0) {
      return null;
    }

    const sorted = [...durations].sort((a, b) => a - b);
    const p95Index = Math.floor(sorted.length * 0.95);
    return sorted[p95Index];
  }

  getStats(endpoint: string) {
    const durations = this.metrics.get(endpoint);
    if (!durations || durations.length === 0) {
      return null;
    }

    const sorted = [...durations].sort((a, b) => a - b);
    return {
      count: durations.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: durations.reduce((a, b) => a + b, 0) / durations.length,
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    };
  }

  getAllStats() {
    const stats: Record<string, ReturnType<typeof this.getStats>> = {};
    for (const [endpoint] of this.metrics) {
      stats[endpoint] = this.getStats(endpoint);
    }
    return stats;
  }
}

// Global performance tracker instance
export const performanceTracker = new PerformanceTracker();

/**
 * Performance tracking middleware
 */
export async function trackPerformance(c: Context, next: Next) {
  const startTime = Date.now();
  const endpoint = `${c.req.method} ${c.req.path}`;

  await next();

  const duration = Date.now() - startTime;
  performanceTracker.track(endpoint, duration);
}

/**
 * Helper functions
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function getLogLevelForStatus(status: number): LogLevel {
  if (status >= 500) return LogLevel.ERROR;
  if (status >= 400) return LogLevel.WARN;
  return LogLevel.INFO;
}
