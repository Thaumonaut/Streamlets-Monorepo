/**
 * Error Handling Utilities for Frontend Extension
 * 
 * Provides user-friendly error messages and error classification.
 * Integrates with backend error codes for consistent messaging.
 * 
 * Reference: shared/constants.ts for ERROR_CODES
 */

import { ERROR_CODES } from '../../../shared/constants';

/**
 * User-friendly error messages for different error codes
 */
const ERROR_MESSAGES: Record<string, string> = {
  [ERROR_CODES.INVALID_REQUEST]: 'Invalid request. Please try again.',
  [ERROR_CODES.UNAUTHORIZED]: 'You need to be logged in to perform this action.',
  [ERROR_CODES.FORBIDDEN]: 'You do not have permission to perform this action.',
  [ERROR_CODES.NOT_FOUND]: 'The requested resource was not found.',
  [ERROR_CODES.CONFLICT]: 'This action conflicts with the current state.',
  [ERROR_CODES.INSUFFICIENT_TICKETS]: 'You do not have enough tickets to draw a card.',
  [ERROR_CODES.RATE_LIMIT_EXCEEDED]: 'You are making requests too quickly. Please wait a moment.',
  [ERROR_CODES.INTERNAL_ERROR]: 'An unexpected error occurred. Please try again later.',
  [ERROR_CODES.SERVICE_UNAVAILABLE]: 'The service is temporarily unavailable. Please try again later.',
};

/**
 * Get user-friendly error message from error code
 */
export function getErrorMessage(code: string): string {
  return ERROR_MESSAGES[code] || 'An unexpected error occurred.';
}

/**
 * Check if error code indicates a client-side issue
 */
export function isClientError(code: string): boolean {
  return [
    ERROR_CODES.INVALID_REQUEST,
    ERROR_CODES.UNAUTHORIZED,
    ERROR_CODES.FORBIDDEN,
    ERROR_CODES.NOT_FOUND,
    ERROR_CODES.INSUFFICIENT_TICKETS,
    ERROR_CODES.RATE_LIMIT_EXCEEDED,
  ].includes(code);
}

/**
 * Check if error code indicates a server-side issue
 */
export function isServerError(code: string): boolean {
  return [
    ERROR_CODES.INTERNAL_ERROR,
    ERROR_CODES.SERVICE_UNAVAILABLE,
  ].includes(code);
}

/**
 * Check if error should trigger a retry
 */
export function shouldRetry(code: string): boolean {
  return [
    ERROR_CODES.SERVICE_UNAVAILABLE,
    ERROR_CODES.RATE_LIMIT_EXCEEDED,
  ].includes(code);
}

/**
 * Format error for display in UI
 */
export interface FormattedError {
  title: string;
  message: string;
  canRetry: boolean;
  isRecoverable: boolean;
}

export function formatError(error: Error | any): FormattedError {
  // Handle API errors with code
  if (error.code) {
    return {
      title: getTitleForErrorCode(error.code),
      message: getErrorMessage(error.code),
      canRetry: shouldRetry(error.code),
      isRecoverable: isClientError(error.code),
    };
  }

  // Handle network errors
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return {
      title: 'Connection Error',
      message: 'Unable to connect to the server. Please check your internet connection.',
      canRetry: true,
      isRecoverable: true,
    };
  }

  // Handle generic errors
  return {
    title: 'Error',
    message: error.message || 'An unexpected error occurred.',
    canRetry: false,
    isRecoverable: false,
  };
}

/**
 * Get error title based on error code
 */
function getTitleForErrorCode(code: string): string {
  switch (code) {
    case ERROR_CODES.INVALID_REQUEST:
      return 'Invalid Request';
    case ERROR_CODES.UNAUTHORIZED:
      return 'Not Authorized';
    case ERROR_CODES.FORBIDDEN:
      return 'Access Denied';
    case ERROR_CODES.NOT_FOUND:
      return 'Not Found';
    case ERROR_CODES.INSUFFICIENT_TICKETS:
      return 'Insufficient Tickets';
    case ERROR_CODES.RATE_LIMIT_EXCEEDED:
      return 'Too Many Requests';
    case ERROR_CODES.INTERNAL_ERROR:
      return 'Server Error';
    case ERROR_CODES.SERVICE_UNAVAILABLE:
      return 'Service Unavailable';
    default:
      return 'Error';
  }
}

/**
 * Log error for debugging (production-safe)
 */
export function logError(error: Error | any, context?: Record<string, unknown>) {
  if (import.meta.env.DEV) {
    console.error('Error:', error);
    if (context) {
      console.error('Context:', context);
    }
  }

  // In production, could send to error tracking service (e.g., Sentry)
  // sentry.captureException(error, { extra: context });
}

/**
 * Create error toast notification data
 */
export interface ErrorToast {
  id: string;
  title: string;
  message: string;
  variant: 'error' | 'warning';
  duration?: number;
}

export function createErrorToast(error: Error | any): ErrorToast {
  const formatted = formatError(error);
  
  return {
    id: `error-${Date.now()}`,
    title: formatted.title,
    message: formatted.message,
    variant: formatted.isRecoverable ? 'warning' : 'error',
    duration: formatted.isRecoverable ? 5000 : undefined, // Auto-dismiss recoverable errors
  };
}
