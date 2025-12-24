# Draws API Contract

**Base Path**: `/api/v1/draws`

---

## POST /api/v1/draws

**Purpose**: Draw a random card using one ticket (core gacha mechanic)

**Authentication**: Required (Twitch JWT or Supabase Auth)

**Request Body**: None (ticket consumption is implicit)

**Request Example**:
```http
POST /api/v1/draws
Authorization: Bearer <twitch_jwt>
Content-Type: application/json
```

**Success Response** (`201 Created`):
```json
{
  "transaction_id": "tx-uuid-1",
  "card": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "emote_id": "25",
    "emote_name": "Kappa",
    "emote_cdn_url": "https://static-cdn.jtvnw.net/emoticons/v2/25/default/dark/1.0",
    "rarity": "Legendary",
    "created_at": "2025-12-24T15:00:00Z"
  },
  "rarity_rolled": "Legendary",
  "is_duplicate": true,
  "duplicate_count": 3,
  "remaining_tickets": 6,
  "ticket_balance": {
    "current_tickets": 6,
    "max_tickets": 10,
    "last_regen_at": "2025-12-24T13:00:00Z",
    "next_regen_at": "2025-12-24T15:00:00Z"
  },
  "drawn_at": "2025-12-24T14:30:00Z"
}
```

**Response Fields**:

| Field | Type | Description |
|-------|------|-------------|
| `transaction_id` | UUID | Unique transaction identifier (for audit trail) |
| `card` | Card | Full card details of drawn card |
| `rarity_rolled` | RarityTier | Rarity tier determined by RNG (denormalized) |
| `is_duplicate` | boolean | Whether user already owned this card |
| `duplicate_count` | integer | Total copies user owns (including this draw) |
| `remaining_tickets` | integer | Tickets remaining after draw |
| `ticket_balance` | TicketBalance | Full ticket balance with regeneration info |
| `drawn_at` | ISO 8601 | Transaction timestamp |

**Error Responses**:

| Status | Error Code | Scenario |
|--------|------------|----------|
| 401 | `unauthorized` | Missing or invalid auth token |
| 409 | `insufficient_tickets` | User has 0 tickets |
| 500 | `internal_error` | Database transaction failed |
| 503 | `service_unavailable` | Database or RNG service unavailable |

**Error Example - Insufficient Tickets**:
```json
{
  "error": {
    "code": "insufficient_tickets",
    "message": "You need at least 1 ticket to draw a card",
    "details": {
      "current_tickets": 0,
      "required_tickets": 1,
      "next_regen_at": "2025-12-24T17:00:00Z",
      "time_until_next_regen_ms": 7200000
    },
    "timestamp": "2025-12-24T15:30:00Z"
  }
}
```

**Error Example - Internal Error (Transaction Rollback)**:
```json
{
  "error": {
    "code": "internal_error",
    "message": "Draw transaction failed. Your ticket has not been consumed.",
    "details": {
      "transaction_id": null,
      "rollback_reason": "Database constraint violation"
    },
    "timestamp": "2025-12-24T15:30:00Z"
  }
}
```

**Success Status Code**: `201 Created` (new collection entry created)

**Idempotency**: Not idempotent (each POST creates new draw). Client must not retry on success.

**Rate Limiting**: 
- Standard user rate limit: 100 requests/minute
- Draw-specific limit: 60 draws/hour (prevents rapid ticket depletion)

**Performance Target**: <200ms p95 (includes RNG + database transaction)

---

## Draw Flow (Server-Side Authority)

This endpoint implements **Principle I (Server-Side Authority)** from the constitution. The entire draw process is server-controlled:

### Step 1: Authentication & User Validation
```typescript
// Extract user from JWT
const userId = authenticateRequest(req);
```

### Step 2: Lazy Ticket Regeneration
```typescript
// Calculate and update tickets based on elapsed time
const balance = await regenerateTickets(userId);
```

### Step 3: Ticket Check
```typescript
// Validate user has tickets (no early return to prevent timing attacks)
if (balance.current_tickets < 1) {
  throw new InsufficientTicketsError();
}
```

### Step 4: RNG - Determine Rarity (Server-Side)
```typescript
// Use Cloudflare Workers crypto API (CSPRNG)
const rng = new ProductionRNG();
const rarity = rng.drawRarity(); // Returns RarityTier based on distribution
```

### Step 5: Atomic Database Transaction
```typescript
// Execute PostgreSQL stored procedure (see data-model.md)
const result = await supabase.rpc('draw_card', {
  p_user_id: userId,
  p_drawn_rarity: rarity
});

// Transaction includes:
// 1. Decrement ticket (with row lock)
// 2. Select random card from rarity pool
// 3. Grant card to user collection
// 4. Log transaction
// 5. COMMIT (or ROLLBACK on failure)
```

### Step 6: Response Assembly
```typescript
// Check if duplicate
const isDuplicate = await checkDuplicateStatus(userId, result.card.id);

return {
  transaction_id: result.transaction_id,
  card: result.card,
  rarity_rolled: rarity,
  is_duplicate: isDuplicate,
  duplicate_count: await getCardCount(userId, result.card.id),
  remaining_tickets: result.remaining_tickets,
  ticket_balance: await getTicketBalance(userId),
  drawn_at: new Date().toISOString()
};
```

---

## Security Considerations

### Client Trust Model

**NEVER trust client for**:
- Rarity determination (client cannot send `rarity` in request)
- Card selection (client cannot send `card_id` in request)
- Ticket balance manipulation (server-side authoritative)

**Client ONLY sends**:
- Authentication token (JWT)
- Draw intent (POST to endpoint)

### Timing Attack Prevention

Avoid leaking information via response timing:
- Always regenerate tickets before validation
- Check ticket balance even if user has 0 tickets (constant-time comparison)
- RNG execution time should not vary by rarity tier

### Transaction Atomicity

Edge case: Client loses connection during draw
- **Guaranteed**: Ticket is either consumed + card granted, OR ticket refunded
- PostgreSQL transaction ensures atomicity (ACID compliance)
- Client can retry safely (idempotency key in future iteration)

### Fraud Detection

All draws logged to `draw_transactions` table:
- Detect suspicious patterns (rapid draws, unusual rarity distribution)
- Alert system if drop rates deviate >10% from configured weights
- Rate limiting prevents ticket draining attacks

---

## RNG Implementation (Per research.md)

### Rarity Distribution

Based on FR-006 from spec:
- Common: 50.00%
- Rare: 38.00%
- Epic: 10.00%
- Legendary: 1.99%
- Fabled: 0.01%

### Algorithm (Cumulative Probability)

```typescript
class ProductionRNG implements RNGService {
  drawRarity(): RarityTier {
    // Cloudflare Workers crypto.getRandomValues (CSPRNG)
    const rand = crypto.getRandomValues(new Uint32Array(1))[0] / (0xFFFFFFFF + 1);
    
    // Cumulative probability thresholds
    if (rand < 0.5000) return 'Common';      // [0.0000, 0.5000)
    if (rand < 0.8800) return 'Rare';        // [0.5000, 0.8800)
    if (rand < 0.9800) return 'Epic';        // [0.8800, 0.9800)
    if (rand < 0.9999) return 'Legendary';   // [0.9800, 0.9999)
    return 'Fabled';                         // [0.9999, 1.0000)
  }
}
```

### Card Selection Within Rarity

Once rarity is determined, select random card from pool:

```sql
SELECT * FROM cards
WHERE rarity = $1  -- Server-determined rarity
ORDER BY RANDOM()  -- PostgreSQL RANDOM() for card selection
LIMIT 1;
```

**Note**: PostgreSQL `RANDOM()` is sufficient for card selection within rarity (not cryptographic requirement). Rarity determination uses CSPRNG for fairness perception.

---

## Analytics & Monitoring

### Metrics to Track

**Per-User Metrics**:
- Draw frequency (draws per hour/day)
- Rarity distribution (% of each rarity drawn)
- Duplicate rate (% of draws resulting in duplicates)
- Ticket consumption rate

**Global Metrics**:
- Total draws per hour
- Drop rate accuracy (actual vs configured weights)
- Average draw latency (p50, p95, p99)
- Transaction failure rate

### Drop Rate Validation

Every 1000 draws, validate distribution:

```typescript
// Example monitoring query
SELECT 
  rarity,
  COUNT(*) as draws,
  COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () as actual_percentage
FROM draw_transactions
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY rarity;

// Expected vs Actual (5% tolerance)
// Common: 50% ± 2.5%
// Rare: 38% ± 1.9%
// etc.
```

If deviation >5%:
- Alert engineering team
- Check RNG implementation
- Verify rarity_distribution table values

---

## Testing Scenarios

### Unit Tests

```typescript
describe('POST /api/v1/draws', () => {
  it('should return 409 when user has 0 tickets', async () => {
    // Arrange: User with 0 tickets
    // Act: POST /api/v1/draws
    // Assert: 409 insufficient_tickets error
  });
  
  it('should decrement ticket on successful draw', async () => {
    // Arrange: User with 5 tickets
    // Act: POST /api/v1/draws
    // Assert: Response shows 4 remaining tickets
  });
  
  it('should respect rarity distribution over 1000 draws', async () => {
    // Arrange: Seed RNG for deterministic testing
    // Act: Perform 1000 draws
    // Assert: Common ~50%, Rare ~38%, etc. (within 5% margin)
  });
  
  it('should handle duplicate cards correctly', async () => {
    // Arrange: User owns card X
    // Act: Draw card X again
    // Assert: is_duplicate=true, duplicate_count incremented
  });
  
  it('should rollback on database error', async () => {
    // Arrange: Simulate database constraint violation
    // Act: POST /api/v1/draws
    // Assert: 500 error, ticket not consumed
  });
});
```

### Integration Tests

```typescript
describe('Draw Transaction Atomicity', () => {
  it('should guarantee atomic ticket consumption + card grant', async () => {
    // Arrange: User with 1 ticket
    // Act: Simulate connection loss mid-transaction
    // Assert: Either (0 tickets + card granted) OR (1 ticket + no card)
  });
});
```

### Load Tests

```typescript
// Scenario: 100 concurrent users drawing simultaneously
// Expected: All draws succeed without race conditions
// Target: <200ms p95 latency, 0% transaction failures
```

---

## Implementation Checklist

- [ ] Implement RNG service with crypto.getRandomValues()
- [ ] Create PostgreSQL stored procedure for atomic draw
- [ ] Add ticket regeneration logic before draw
- [ ] Implement duplicate detection
- [ ] Add rate limiting (60 draws/hour)
- [ ] Set up transaction logging
- [ ] Add monitoring for drop rate validation
- [ ] Create integration tests for atomicity
- [ ] Load test with 100 concurrent users
- [ ] Document error scenarios in API docs

---

## Future Enhancements (Post-MVP)

- **Idempotency Keys**: Prevent accidental double draws on retry
- **Multi-Ticket Draws**: Spend 5 tickets for guaranteed Epic+
- **Pity System**: Guaranteed Legendary after N draws without one
- **Draw Animations**: WebSocket for real-time draw reveal
- **Batch Draws**: Draw 10 cards at once with single transaction
