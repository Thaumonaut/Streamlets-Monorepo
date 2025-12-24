/**
 * Error Handling Middleware
 * 
 * Centralized error handling for the Hono application.
 * Converts errors to standardized JSON responses per API contracts.
 * 
 * Reference: contracts/api-overview.md for error response format
 */

import { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { ERROR_CODES } from '../../../shared/constants';

/**
 * Custom application errors
 */
export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 500,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Database operation errors
 */
export class DatabaseError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(ERROR_CODES.INTERNAL_ERROR, message, 500, details);
    this.name = 'DatabaseError';
  }
}

/**
 * Authentication/Authorization errors
 */
export class AuthenticationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(ERROR_CODES.UNAUTHORIZED, message, 401, details);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(ERROR_CODES.FORBIDDEN, message, 403, details);
    this.name = 'AuthorizationError';
  }
}

/**
 * Validation errors
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(ERROR_CODES.INVALID_REQUEST, message, 400, details);
    this.name = 'ValidationError';
  }
}

/**
 * Resource not found errors
 */
export class NotFoundError extends AppError {
  constructor(resource: string, details?: Record<string, unknown>) {
    super(ERROR_CODES.NOT_FOUND, `${resource} not found`, 404, details);
    this.name = 'NotFoundError';
  }
}

/**
 * Business logic errors (e.g., insufficient tickets)
 */
export class BusinessRuleError extends AppError {
  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(code, message, 400, details);
    this.name = 'BusinessRuleError';
  }
}

/**
 * Rate limiting errors
 */
export class RateLimitError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(ERROR_CODES.RATE_LIMIT_EXCEEDED, message, 429, details);
    this.name = 'RateLimitError';
  }
}

/**
 * Global error handler middleware
 * Catches all errors and formats them as standardized JSON responses
 */
export async function errorHandler(err: Error, c: Context) {
  console.error('Error caught by error handler:', err);

  // Handle Hono HTTP exceptions
  if (err instanceof HTTPException) {
    return c.json(
      {
        error: {
          code: getErrorCodeForStatus(err.status),
          message: err.message,
          timestamp: new Date().toISOString(),
        },
      },
      err.status
    );
  }

  // Handle custom application errors
  if (err instanceof AppError) {
    return c.json(
      {
        error: {
          code: err.code,
          message: err.message,
          details: err.details,
          timestamp: new Date().toISOString(),
        },
      },
      err.statusCode
    );
  }

  // Handle Zod validation errors
  if (err.name === 'ZodError') {
    const zodError = err as any; // Type assertion for Zod error
    return c.json(
      {
        error: {
          code: ERROR_CODES.INVALID_REQUEST,
          message: 'Validation failed',
          details: {
            issues: zodError.issues || zodError.errors,
          },
          timestamp: new Date().toISOString(),
        },
      },
      400
    );
  }

  // Handle unknown errors (don't expose internal details)
  const isDevelopment = c.env?.NODE_ENV === 'development';
  
  return c.json(
    {
      error: {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: 'An unexpected error occurred',
        details: isDevelopment ? { stack: err.stack, message: err.message } : undefined,
        timestamp: new Date().toISOString(),
      },
    },
    500
  );
}

/**
 * Helper to map HTTP status codes to error codes
 */
function getErrorCodeForStatus(status: number): string {
  switch (status) {
    case 400:
      return ERROR_CODES.INVALID_REQUEST;
    case 401:
      return ERROR_CODES.UNAUTHORIZED;
    case 403:
      return ERROR_CODES.FORBIDDEN;
    case 404:
      return ERROR_CODES.NOT_FOUND;
    case 409:
      return ERROR_CODES.CONFLICT;
    case 429:
      return ERROR_CODES.RATE_LIMIT_EXCEEDED;
    case 503:
      return ERROR_CODES.SERVICE_UNAVAILABLE;
    default:
      return ERROR_CODES.INTERNAL_ERROR;
  }
}

/**
 * Async error wrapper for route handlers
 * Automatically catches async errors and passes to error handler
 * 
 * Usage:
 *   app.get('/api/cards', asyncHandler(async (c) => {
 *     const cards = await getCards();
 *     return c.json(cards);
 *   }));
 */
export function asyncHandler<T>(
  handler: (c: Context) => Promise<T>
) {
  return async (c: Context) => {
    try {
      return await handler(c);
    } catch (error) {
      throw error; // Let Hono's error handler catch it
    }
  };
}

/**
 * Assert helper for business logic validation
 * Throws BusinessRuleError if condition is false
 * 
 * Usage:
 *   assert(tickets > 0, ERROR_CODES.INSUFFICIENT_TICKETS, 'No tickets available');
 */
export function assert(
  condition: boolean,
  code: string,
  message: string,
  details?: Record<string, unknown>
): asserts condition {
  if (!condition) {
    throw new BusinessRuleError(code, message, details);
  }
}
