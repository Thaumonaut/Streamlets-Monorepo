# Users API Contract

**Base Path**: `/api/v1/users`

---

## GET /api/v1/users/me

**Purpose**: Get current authenticated user's profile

**Authentication**: Required (Twitch JWT or Supabase Auth)

**Request Example**:
```http
GET /api/v1/users/me
Authorization: Bearer <twitch_jwt>
```

**Success Response** (`200 OK`):
```json
{
  "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "twitch_id": "12345678",
  "twitch_username": "coolviewer123",
  "created_at": "2025-12-24T10:00:00Z",
  "stats": {
    "total_cards": 45,
    "unique_cards": 32,
    "completion_percentage": 16.0,
    "total_draws": 50,
    "rarity_counts": {
      "Common": 25,
      "Rare": 15,
      "Epic": 4,
      "Legendary": 1,
      "Fabled": 0
    }
  }
}
```

**Response Fields**:

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Internal user identifier |
| `twitch_id` | string | Twitch user ID |
| `twitch_username` | string | Twitch display name |
| `created_at` | ISO 8601 | Account creation timestamp |
| `stats.total_cards` | integer | Total cards owned (including duplicates) |
| `stats.unique_cards` | integer | Number of unique cards owned |
| `stats.completion_percentage` | decimal | Percentage of total pool owned (unique/total * 100) |
| `stats.total_draws` | integer | Total number of draws performed |
| `stats.rarity_counts` | object | Breakdown of owned cards by rarity |

**Error Responses**:

| Status | Error Code | Scenario |
|--------|------------|----------|
| 401 | `unauthorized` | Missing or invalid auth token |
| 500 | `internal_error` | Database query failed |

**Auto-Creation Behavior**:

If user does not exist (first-time access):
- Create user record from Twitch JWT claims
- Initialize ticket balance (5 starting tickets)
- Return newly created user profile

**Performance Target**: <50ms p95

---

## GET /api/v1/users/me/collection

**Purpose**: Get user's owned cards with optional filtering

**Authentication**: Required

**Query Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `rarity` | string | No | - | Filter by rarity tier |
| `unique` | boolean | No | false | If true, return only one entry per unique card |
| `sort` | string | No | `acquired_at:desc` | Sort order (acquired_at:asc/desc, rarity:asc/desc) |
| `page` | integer | No | 1 | Page number |
| `limit` | integer | No | 20 | Items per page |

**Request Example**:
```http
GET /api/v1/users/me/collection?rarity=Legendary&unique=true
Authorization: Bearer <twitch_jwt>
```

**Success Response** (`200 OK`):
```json
{
  "data": [
    {
      "id": "collection-entry-uuid-1",
      "card": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "emote_id": "25",
        "emote_name": "Kappa",
        "emote_cdn_url": "https://static-cdn.jtvnw.net/emoticons/v2/25/default/dark/1.0",
        "rarity": "Legendary",
        "created_at": "2025-12-24T15:00:00Z"
      },
      "acquired_at": "2025-12-24T14:30:00Z",
      "source": "draw",
      "duplicate_count": 3
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total_items": 1,
    "total_pages": 1,
    "has_next": false,
    "has_prev": false
  },
  "summary": {
    "total_cards": 45,
    "unique_cards": 32,
    "displayed_cards": 1
  }
}
```

**Response Fields**:

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Collection entry identifier |
| `card` | Card | Full card details |
| `acquired_at` | ISO 8601 | When card was first acquired (if unique=true) or each acquisition (if unique=false) |
| `source` | string | Acquisition source (draw/quest/purchase/trade/admin) |
| `duplicate_count` | integer | Number of duplicates owned (only if unique=true) |

**Error Responses**:

| Status | Error Code | Scenario |
|--------|------------|----------|
| 401 | `unauthorized` | Missing or invalid auth token |
| 400 | `invalid_request` | Invalid query parameters |
| 500 | `internal_error` | Database query failed |

**Validation Rules**:
- `rarity` must be valid RarityTier
- `unique` must be boolean
- `sort` must match pattern `field:(asc|desc)`
- Valid sort fields: `acquired_at`, `rarity`

**Performance Target**: <100ms p95 (complex join query)

---

## GET /api/v1/users/me/tickets

**Purpose**: Get user's current ticket balance with regeneration info

**Authentication**: Required

**Request Example**:
```http
GET /api/v1/users/me/tickets
Authorization: Bearer <twitch_jwt>
```

**Success Response** (`200 OK`):
```json
{
  "current_tickets": 7,
  "max_tickets": 10,
  "last_regen_at": "2025-12-24T13:00:00Z",
  "next_regen_at": "2025-12-24T15:00:00Z",
  "time_until_next_regen_ms": 3600000,
  "regen_interval_hours": 2,
  "can_draw": true
}
```

**Response Fields**:

| Field | Type | Description |
|-------|------|-------------|
| `current_tickets` | integer | Available tickets after lazy regeneration |
| `max_tickets` | integer | Maximum ticket capacity (10) |
| `last_regen_at` | ISO 8601 | Last regeneration timestamp |
| `next_regen_at` | ISO 8601 | When next ticket will regenerate |
| `time_until_next_regen_ms` | integer | Milliseconds until next regeneration |
| `regen_interval_hours` | integer | Hours between regenerations (2) |
| `can_draw` | boolean | Whether user has tickets to draw |

**Error Responses**:

| Status | Error Code | Scenario |
|--------|------------|----------|
| 401 | `unauthorized` | Missing or invalid auth token |
| 500 | `internal_error` | Database query failed |

**Server-Side Regeneration**:

Before returning response, backend MUST:
1. Fetch current ticket balance from database
2. Calculate elapsed time since `last_regen_at`
3. Compute tickets to add: `min(max_tickets, current + floor(elapsed / 2 hours))`
4. Update database if tickets changed
5. Return updated balance

**Performance Target**: <50ms p95

---

## GET /api/v1/users/me/transactions

**Purpose**: Get user's draw transaction history

**Authentication**: Required

**Query Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `rarity` | string | No | - | Filter by rarity tier |
| `start_date` | ISO 8601 | No | - | Filter transactions after this date |
| `end_date` | ISO 8601 | No | - | Filter transactions before this date |
| `page` | integer | No | 1 | Page number |
| `limit` | integer | No | 20 | Items per page |

**Request Example**:
```http
GET /api/v1/users/me/transactions?rarity=Legendary&limit=10
Authorization: Bearer <twitch_jwt>
```

**Success Response** (`200 OK`):
```json
{
  "data": [
    {
      "id": "tx-uuid-1",
      "card": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "emote_id": "25",
        "emote_name": "Kappa",
        "emote_cdn_url": "https://static-cdn.jtvnw.net/emoticons/v2/25/default/dark/1.0",
        "rarity": "Legendary",
        "created_at": "2025-12-24T15:00:00Z"
      },
      "rarity_rolled": "Legendary",
      "ticket_cost": 1,
      "created_at": "2025-12-24T14:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total_items": 50,
    "total_pages": 5,
    "has_next": true,
    "has_prev": false
  }
}
```

**Response Fields**:

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Transaction identifier |
| `card` | Card | Full card details |
| `rarity_rolled` | RarityTier | Rarity tier determined by RNG |
| `ticket_cost` | integer | Tickets consumed (always 1 for MVP) |
| `created_at` | ISO 8601 | Transaction timestamp |

**Error Responses**:

| Status | Error Code | Scenario |
|--------|------------|----------|
| 401 | `unauthorized` | Missing or invalid auth token |
| 400 | `invalid_request` | Invalid date format or query parameters |
| 500 | `internal_error` | Database query failed |

**Validation Rules**:
- `start_date` and `end_date` must be valid ISO 8601 timestamps
- `end_date` must be after `start_date`

**Performance Target**: <100ms p95

---

## Implementation Notes

### Database Queries

```sql
-- Get user with stats
SELECT 
  u.*,
  COUNT(uc.id) as total_cards,
  COUNT(DISTINCT uc.card_id) as unique_cards,
  COUNT(DISTINCT dt.id) as total_draws
FROM users u
LEFT JOIN user_collections uc ON uc.user_id = u.id
LEFT JOIN draw_transactions dt ON dt.user_id = u.id
WHERE u.twitch_id = $1
GROUP BY u.id;

-- Get collection with duplicates (unique=true)
SELECT 
  MIN(uc.id) as id,
  c.*,
  MIN(uc.acquired_at) as acquired_at,
  uc.source,
  COUNT(*) as duplicate_count
FROM user_collections uc
JOIN cards c ON c.id = uc.card_id
WHERE uc.user_id = $1
GROUP BY c.id, uc.source
ORDER BY acquired_at DESC;

-- Get ticket balance with lazy regeneration
-- (Regeneration logic in application layer, see data-model.md)
SELECT * FROM ticket_balances WHERE user_id = $1;
```

### TypeScript Types

```typescript
interface UserProfileResponse extends User {
  stats: {
    total_cards: number;
    unique_cards: number;
    completion_percentage: number;
    total_draws: number;
    rarity_counts: Record<RarityTier, number>;
  };
}

interface CollectionResponse {
  data: CollectionEntry[];
  pagination: PaginationMetadata;
  summary: {
    total_cards: number;
    unique_cards: number;
    displayed_cards: number;
  };
}

interface TicketBalanceResponse extends TicketBalance {
  time_until_next_regen_ms: number;
  regen_interval_hours: number;
  can_draw: boolean;
}

interface TransactionsResponse {
  data: DrawTransaction[];
  pagination: PaginationMetadata;
}
```

### Rate Limiting

User-specific endpoints are rate-limited:
- 100 requests per minute per user
- Ticket balance endpoint: 30 requests per minute (prevent polling abuse)
