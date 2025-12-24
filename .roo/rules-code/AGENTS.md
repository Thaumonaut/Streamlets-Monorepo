# AGENTS.md - Code Mode

This file provides coding-specific guidance for the Streamlets project.

## Code Structure

### Backend (Hono + Cloudflare Workers)
- Entry point: `backend/src/index.ts`
- Routes: `backend/src/api/routes/` - Each route module exports a Hono router
- Services: `backend/src/services/` - Business logic layer
- Middleware: `backend/src/middleware/` - Cross-cutting concerns
- Models: `backend/src/models/` - TypeScript types for database rows

### Frontend Extension (React + Vite)
- Entry: `frontend-extension/src/main.tsx`
- Components: `frontend-extension/src/components/`
- Services: `frontend-extension/src/services/` - API client, Twitch SDK integration
- Utils: `frontend-extension/src/utils/` - Error handling, formatting

### Frontend Website (React + Vite)
- Entry: `frontend-website/src/main.tsx`
- Components: `frontend-website/src/components/`
- Services: `frontend-website/src/services/` - API client, Supabase auth
- Utils: `frontend-website/src/utils/`

### Shared
- `shared/types.ts` - All shared TypeScript types
- `shared/validation.ts` - Zod schemas for runtime validation
- `shared/constants.ts` - Configuration constants

## Coding Patterns

### RNG Service Injection
Always inject RNG service for testability:
```typescript
import { getProductionRNG } from './services/rng.production';
import type { RNGService } from './services/rng.interface';

// In production
const rng = getProductionRNG();

// In tests
import { TestRNG } from './services/rng.test';
const rng = new TestRNG(12345); // seeded
```

### Database Client Selection
Choose the right client based on operation:
```typescript
import { createServiceRoleClient, createAnonClient, createAuthenticatedClient } from './db/client';

// Server-side admin operations (bypass RLS)
const adminClient = createServiceRoleClient(env);

// Public operations (respect RLS)
const publicClient = createAnonClient(env);

// User operations (pass JWT for RLS)
const userClient = createAuthenticatedClient(env, authorizationHeader);
```

### Ticket Regeneration
Always use lazy regeneration - no background jobs:
```typescript
import { regenerateTickets } from './services/ticket-regeneration';

// On every ticket-related request
const result = regenerateTickets(balance);
// result.balance has updated tickets
// result.ticketsAdded shows how many were regenerated
```

### Error Handling
Use custom error classes from `backend/src/middleware/error.ts`:
```typescript
import { ValidationError, NotFoundError, BusinessRuleError } from './middleware/error';
import { ERROR_CODES } from '../../../shared/constants';

throw new ValidationError('Invalid card ID');
throw new NotFoundError('User');
throw new BusinessRuleError(ERROR_CODES.INSUFFICIENT_TICKETS, 'Not enough tickets');
```

### API Response Format
All API responses follow this structure:
```typescript
// Success
{ data: T }

// Error
{ error: { code: string, message: string, details?: Record<string, unknown>, timestamp: string } }
```

## File Naming Conventions

- Route modules: `*.routes.ts` (e.g., `cards.routes.ts`)
- Services: `*.service.ts` (e.g., `card.service.ts`)
- Middleware: `*.middleware.ts` (e.g., `auth.middleware.ts`)
- Models: `*.model.ts` (e.g., `user.model.ts`)
- Utilities: `*.util.ts` or `*.utils.ts`

## Import Patterns

- Use `@streamlets/shared` for shared types/constants
- Use relative imports within packages
- Import types explicitly: `import type { Card } from ...`

## Testing

### Backend Tests
- Use Vitest
- Mock RNG with `TestRNG`, `MockRNG`, or `SequenceRNG`
- Mock database with test fixtures

### Frontend Tests
- Use Vitest for unit tests
- Use Playwright for E2E tests (extension only)
- Mock API responses with MSW or similar

## Environment-Specific Code

Use `c.env.NODE_ENV` in backend, `import.meta.env.DEV` in frontends:
```typescript
// Backend
if (c.env.NODE_ENV === 'development') {
  // dev-only code
}

// Frontend
if (import.meta.env.DEV) {
  // dev-only code
}
```
