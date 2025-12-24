/**
 * API Client Service for Companion Website
 * 
 * Handles all HTTP requests to the backend API.
 * Uses Supabase Auth session token for authentication.
 * 
 * Reference: contracts/api-overview.md for API endpoints
 */

import {
  Card,
  CardsResponse,
  CollectionResponse,
  UserStatsResponse,
  ErrorResponse,
} from '../../../shared/types';
import { getSupabaseClient } from './supabase';

/**
 * API client configuration
 */
interface ApiConfig {
  baseUrl: string;
}

/**
 * API client error class
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * API Client for backend communication
 */
export class WebsiteApiClient {
  private config: ApiConfig;

  constructor(config: ApiConfig) {
    this.config = config;
  }

  /**
   * Get authentication token from Supabase session
   */
  private async getAuthToken(): Promise<string | null> {
    const supabase = getSupabaseClient();
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  }

  /**
   * Generic fetch wrapper with error handling
   */
  private async fetch<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;
    const token = await this.getAuthToken();

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Add auth token if available
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Parse response body
    const data = await response.json();

    // Handle error responses
    if (!response.ok) {
      const error = data as ErrorResponse;
      throw new ApiError(
        error.error.message,
        response.status,
        error.error.code,
        error.error.details
      );
    }

    return data as T;
  }

  // ==================== Card Endpoints ====================

  /**
   * Get all available cards (public endpoint)
   * GET /api/v1/cards
   */
  async getCards(params?: { page?: number; limit?: number }): Promise<CardsResponse> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.set('page', params.page.toString());
    if (params?.limit) queryParams.set('limit', params.limit.toString());

    const query = queryParams.toString();
    const endpoint = `/cards${query ? `?${query}` : ''}`;

    return this.fetch<CardsResponse>(endpoint);
  }

  /**
   * Get card details by ID
   * GET /api/v1/cards/:id
   */
  async getCardById(cardId: string): Promise<{ data: Card }> {
    return this.fetch<{ data: Card }>(`/cards/${cardId}`);
  }

  // ==================== User Endpoints (Requires Auth) ====================

  /**
   * Get current user profile with stats
   * GET /api/v1/users/me
   */
  async getUserProfile(): Promise<UserStatsResponse> {
    return this.fetch<UserStatsResponse>('/users/me');
  }

  /**
   * Get user's card collection
   * GET /api/v1/users/me/collection
   */
  async getUserCollection(params?: { page?: number; limit?: number }): Promise<CollectionResponse> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.set('page', params.page.toString());
    if (params?.limit) queryParams.set('limit', params.limit.toString());

    const query = queryParams.toString();
    const endpoint = `/users/me/collection${query ? `?${query}` : ''}`;

    return this.fetch<CollectionResponse>(endpoint);
  }

  /**
   * Get user's draw transaction history
   * GET /api/v1/users/me/transactions
   */
  async getTransactionHistory(params?: { page?: number; limit?: number }): Promise<any> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.set('page', params.page.toString());
    if (params?.limit) queryParams.set('limit', params.limit.toString());

    const query = queryParams.toString();
    const endpoint = `/users/me/transactions${query ? `?${query}` : ''}`;

    return this.fetch<any>(endpoint);
  }

  // ==================== Leaderboard Endpoints (Public) ====================

  /**
   * Get global leaderboard
   * Custom endpoint for website
   */
  async getLeaderboard(params?: { page?: number; limit?: number }): Promise<any> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.set('page', params.page.toString());
    if (params?.limit) queryParams.set('limit', params.limit.toString());

    const query = queryParams.toString();
    const endpoint = `/leaderboard${query ? `?${query}` : ''}`;

    return this.fetch<any>(endpoint);
  }

  // ==================== Health Check ====================

  /**
   * Check backend health
   * GET /health
   */
  async healthCheck(): Promise<any> {
    const url = `${this.config.baseUrl.replace('/api/v1', '')}/health`;
    const response = await fetch(url);
    return response.json();
  }
}

/**
 * Create API client instance
 */
export function createWebsiteApiClient(baseUrl: string): WebsiteApiClient {
  return new WebsiteApiClient({ baseUrl });
}

/**
 * Singleton API client for global use
 */
let apiClientInstance: WebsiteApiClient | null = null;

export function initializeApiClient(baseUrl: string) {
  apiClientInstance = createWebsiteApiClient(baseUrl);
}

export function getApiClient(): WebsiteApiClient {
  if (!apiClientInstance) {
    throw new Error('API client not initialized. Call initializeApiClient first.');
  }
  return apiClientInstance;
}
