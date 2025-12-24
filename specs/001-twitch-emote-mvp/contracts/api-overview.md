# API Contract Overview: Twitch Emote MVP

**Feature**: 001-twitch-emote-mvp  
**Backend Framework**: Hono (TypeScript)  
**Deployment**: Cloudflare Workers  
**Authentication**: Twitch Extension JWT (extension) + Supabase Auth (website)

---

## Base Configuration

**Base URL**: `https://api.streamlets.app` (production)  
**Staging URL**: `https://api-staging.streamlets.app`  
**Local Dev**: `http://localhost:8787`

**API Version**: `v1`  
**API Prefix**: `/api/v1`

**Content Type**: `application/json`  
**Character Encoding**: UTF-8

---

## Authentication

### Twitch Extension Requests

**Header**:
```
Authorization: Bearer <twitch_extension_jwt>
```

**JWT Claims** (verified by backend):
```typescript
{
  user_id: string;      // Opaque Twitch user ID
  channel_id: string;   // Broadcaster channel ID
  role: 'viewer' | 'broadcaster' | 'moderator';
  exp: number;          // Expiration timestamp
}
```

**Validation**:
- JWT signature verified with Twitch extension secret
- `exp` claim checked (must be future timestamp)
- `user_id` extracted and used for database queries

### Website Requests

**Header**:
```
Authorization: Bearer <supabase_session_token>
```

**Validation**:
- Session token verified via Supabase Auth
- User ID extracted from `auth.uid()`

---

## Error Responses

All error responses follow this structure:

```typescript
{
  error: {
    code: string;           // Machine-readable error code
    message: string;        // Human-readable error message
    details?: object;       // Optional additional context
    timestamp: string;      // ISO 8601 timestamp
  }
}
```

### Standard Error Codes

| HTTP Status | Error Code | Description |
|-------------|------------|-------------|
| 400 | `invalid_request` | Request validation failed (missing/invalid parameters) |
| 401 | `unauthorized` | Missing or invalid authentication token |
| 403 | `forbidden` | User lacks permission for requested resource |
| 404 | `not_found` | Requested resource does not exist |
| 409 | `conflict` | Request conflicts with current state (e.g., insufficient tickets) |
| 429 | `rate_limit_exceeded` | Too many requests from client |
| 500 | `internal_error` | Unexpected server error |
| 503 | `service_unavailable` | Database or external service unavailable |

### Example Error Response

```json
{
  "error": {
    "code": "insufficient_tickets",
    "message": "You need at least 1 ticket to draw a card",
    "details": {
      "current_tickets": 0,
      "required_tickets": 1,
      "next_regen_at": "2025-12-24T17:00:00Z"
    },
    "timestamp": "2025-12-24T15:30:00Z"
  }
}
```

---

## Rate Limiting

**Limit**: 100 requests per minute per user  
**Headers**:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1672848600
```

**Exceeded Response**: `429 Too Many Requests`

---

## Endpoints Summary

| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `/api/v1/cards` | GET | List all available cards | No |
| `/api/v1/cards/:id` | GET | Get specific card details | No |
| `/api/v1/users/me` | GET | Get current user profile | Yes |
| `/api/v1/users/me/collection` | GET | Get user's card collection | Yes |
| `/api/v1/users/me/tickets` | GET | Get user's ticket balance | Yes |
| `/api/v1/draws` | POST | Draw a random card | Yes |
| `/api/v1/users/me/transactions` | GET | Get user's draw history | Yes |

---

## Shared Type Definitions

### RarityTier

```typescript
type RarityTier = 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Fabled';
```

### Card

```typescript
interface Card {
  id: string;              // UUID
  emote_id: string;        // Twitch emote identifier
  emote_name: string;      // Display name (e.g., "Kappa")
  emote_cdn_url: string;   // Twitch CDN URL
  rarity: RarityTier;
  created_at: string;      // ISO 8601 timestamp
}
```

### CollectionEntry

```typescript
interface CollectionEntry {
  id: string;              // Collection entry UUID
  card: Card;              // Full card details
  acquired_at: string;     // ISO 8601 timestamp
  source: 'draw' | 'quest' | 'purchase' | 'trade' | 'admin';
}
```

### TicketBalance

```typescript
interface TicketBalance {
  current_tickets: number;  // Available tickets
  max_tickets: number;      // Maximum capacity (10)
  last_regen_at: string;    // ISO 8601 timestamp
  next_regen_at: string;    // ISO 8601 timestamp (calculated)
}
```

### DrawTransaction

```typescript
interface DrawTransaction {
  id: string;              // Transaction UUID
  card: Card;              // Card awarded
  rarity_rolled: RarityTier;
  ticket_cost: number;     // Always 1 for MVP
  created_at: string;      // ISO 8601 timestamp
}
```

### User

```typescript
interface User {
  id: string;              // Internal user UUID
  twitch_id: string;       // Twitch user ID
  twitch_username: string; // Twitch display name
  created_at: string;      // ISO 8601 timestamp
}
```

---

## Response Pagination

Endpoints that return lists support pagination:

**Query Parameters**:
- `page` (integer, default: 1, min: 1)
- `limit` (integer, default: 20, min: 1, max: 100)

**Response Structure**:
```typescript
{
  data: T[];               // Array of items
  pagination: {
    page: number;          // Current page
    limit: number;         // Items per page
    total_items: number;   // Total items available
    total_pages: number;   // Total pages available
    has_next: boolean;     // Whether next page exists
    has_prev: boolean;     // Whether previous page exists
  }
}
```

---

## CORS Configuration

**Allowed Origins**:
- `https://*.ext-twitch.tv` (Twitch Extension domain)
- `https://streamlets.app` (Companion website)
- `http://localhost:*` (Development)

**Allowed Methods**: `GET, POST, PUT, DELETE, OPTIONS`  
**Allowed Headers**: `Content-Type, Authorization`  
**Max Age**: `86400` (24 hours)

---

## Health & Status

### GET /health

**Purpose**: Health check endpoint for monitoring

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2025-12-24T15:30:00Z",
  "services": {
    "database": "healthy",
    "cache": "healthy"
  }
}
```

**Status Codes**:
- `200 OK`: All services healthy
- `503 Service Unavailable`: One or more services degraded
