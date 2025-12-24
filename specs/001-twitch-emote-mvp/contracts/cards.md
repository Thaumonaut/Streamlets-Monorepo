# Cards API Contract

**Base Path**: `/api/v1/cards`

---

## GET /api/v1/cards

**Purpose**: Retrieve list of all available cards in the pool

**Authentication**: Not required (public endpoint)

**Query Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `rarity` | string | No | - | Filter by rarity tier (Common/Rare/Epic/Legendary/Fabled) |
| `page` | integer | No | 1 | Page number (min: 1) |
| `limit` | integer | No | 20 | Items per page (min: 1, max: 100) |

**Request Example**:
```http
GET /api/v1/cards?rarity=Legendary&page=1&limit=10
```

**Success Response** (`200 OK`):
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "emote_id": "25",
      "emote_name": "Kappa",
      "emote_cdn_url": "https://static-cdn.jtvnw.net/emoticons/v2/25/default/dark/1.0",
      "rarity": "Legendary",
      "created_at": "2025-12-24T15:00:00Z"
    },
    {
      "id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "emote_id": "88",
      "emote_name": "PogChamp",
      "emote_cdn_url": "https://static-cdn.jtvnw.net/emoticons/v2/88/default/dark/1.0",
      "rarity": "Legendary",
      "created_at": "2025-12-24T15:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total_items": 15,
    "total_pages": 2,
    "has_next": true,
    "has_prev": false
  }
}
```

**Error Responses**:

| Status | Error Code | Scenario |
|--------|------------|----------|
| 400 | `invalid_request` | Invalid `rarity` value or pagination parameters |
| 500 | `internal_error` | Database query failed |

**Error Example**:
```json
{
  "error": {
    "code": "invalid_request",
    "message": "Invalid rarity tier. Must be one of: Common, Rare, Epic, Legendary, Fabled",
    "details": {
      "parameter": "rarity",
      "provided": "SuperRare",
      "allowed": ["Common", "Rare", "Epic", "Legendary", "Fabled"]
    },
    "timestamp": "2025-12-24T15:30:00Z"
  }
}
```

**Validation Rules**:
- `rarity` must be valid RarityTier ENUM value
- `page` must be >= 1
- `limit` must be between 1 and 100

**Performance Target**: <50ms p95

---

## GET /api/v1/cards/:id

**Purpose**: Retrieve details for a specific card

**Authentication**: Not required (public endpoint)

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | UUID | Yes | Card UUID |

**Request Example**:
```http
GET /api/v1/cards/550e8400-e29b-41d4-a716-446655440000
```

**Success Response** (`200 OK`):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "emote_id": "25",
  "emote_name": "Kappa",
  "emote_cdn_url": "https://static-cdn.jtvnw.net/emoticons/v2/25/default/dark/1.0",
  "rarity": "Legendary",
  "created_at": "2025-12-24T15:00:00Z",
  "stats": {
    "total_owners": 342,
    "drop_rate": 0.0199,
    "first_appeared": "2025-12-24T15:00:00Z"
  }
}
```

**Response Fields**:

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Card identifier |
| `emote_id` | string | Twitch emote ID |
| `emote_name` | string | Emote display name |
| `emote_cdn_url` | string | Twitch CDN URL (1x resolution) |
| `rarity` | RarityTier | Rarity tier |
| `created_at` | ISO 8601 | Card creation timestamp |
| `stats.total_owners` | integer | Number of users who own this card |
| `stats.drop_rate` | decimal | Probability of drawing this card |
| `stats.first_appeared` | ISO 8601 | When card was first added to pool |

**Error Responses**:

| Status | Error Code | Scenario |
|--------|------------|----------|
| 400 | `invalid_request` | Invalid UUID format |
| 404 | `not_found` | Card ID does not exist |
| 500 | `internal_error` | Database query failed |

**Error Example**:
```json
{
  "error": {
    "code": "not_found",
    "message": "Card not found",
    "details": {
      "card_id": "550e8400-e29b-41d4-a716-446655440000"
    },
    "timestamp": "2025-12-24T15:30:00Z"
  }
}
```

**Validation Rules**:
- `id` must be valid UUID format

**Performance Target**: <30ms p95 (single row lookup)

---

## Implementation Notes

### Caching Strategy

Cards are immutable templates - cache aggressively:

- **Cache-Control**: `public, max-age=3600` (1 hour)
- **ETag**: Use card `created_at` timestamp hash
- **Cloudflare CDN**: Cache at edge for global low latency

### Database Query Optimization

```sql
-- List cards with rarity filter
SELECT id, emote_id, emote_name, emote_cdn_url, rarity, created_at
FROM cards
WHERE rarity = $1  -- Optional filter
ORDER BY rarity DESC, emote_name ASC
LIMIT $2 OFFSET $3;

-- Get card with stats
SELECT 
  c.*,
  COUNT(DISTINCT uc.user_id) as total_owners,
  rd.legendary_weight as drop_rate  -- Example for Legendary
FROM cards c
LEFT JOIN user_collections uc ON uc.card_id = c.id
JOIN rarity_distribution rd ON true
WHERE c.id = $1
GROUP BY c.id;
```

### Rate Limiting

No rate limiting on public endpoints (cached at CDN layer).

### TypeScript Types

```typescript
interface CardsListResponse {
  data: Card[];
  pagination: PaginationMetadata;
}

interface CardDetailsResponse extends Card {
  stats: {
    total_owners: number;
    drop_rate: number;
    first_appeared: string;
  };
}
```
