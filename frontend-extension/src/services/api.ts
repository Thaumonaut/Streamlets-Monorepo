/**
 * API Client Service for Twitch Extension
 * 
 * Handles all HTTP requests to the backend API.
 * Automatically includes Twitch JWT token in requests.
 * 
 * Reference: contracts/api-overview.md for API endpoints
 */

import {
  Card,
  CardsResponse,
  CollectionResponse,
  DrawResponse,
  TicketBalanceResponse,
  UserStatsResponse,
  ErrorResponse,
} from '../../../shared/types';

/**
 * API client configuration
 */
interface ApiConfig {
  baseUrl: string;
  token: string;
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
export class ApiClient {
  private config: ApiConfig;

  constructor(config: ApiConfig) {
    this.config = config;
  }

  /**
   * Update the authentication token
   */
  setToken(token: string) {
    this.config.token = token;
  }

  /**
   * Generic fetch wrapper with error handling
   */
  private async fetch<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.token}`,
        ...options.headers,
      },
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
   * Get all available cards
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

  // ==================== User Endpoints ====================

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
   * Get user's ticket balance
   * GET /api/v1/users/me/tickets
   */
  async getTicketBalance(): Promise<TicketBalanceResponse> {
    return this.fetch<TicketBalanceResponse>('/users/me/tickets');
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

  // ==================== Draw Endpoints ====================

  /**
   * Draw a card using a ticket
   * POST /api/v1/draws
   */
  async drawCard(): Promise<DrawResponse> {
    return this.fetch<DrawResponse>('/draws', {
      method: 'POST',
    });
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
export function createApiClient(baseUrl: string, token: string): ApiClient {
  return new ApiClient({ baseUrl, token });
}

/**
 * Singleton API client for global use
 * Must be initialized before use
 */
let apiClientInstance: ApiClient | null = null;

export function initializeApiClient(baseUrl: string, token: string) {
  apiClientInstance = createApiClient(baseUrl, token);
}

export function getApiClient(): ApiClient {
  if (!apiClientInstance) {
    throw new Error('API client not initialized. Call initializeApiClient first.');
  }
  return apiClientInstance;
}

export function updateApiToken(token: string) {
  if (apiClientInstance) {
    apiClientInstance.setToken(token);
  }
}
