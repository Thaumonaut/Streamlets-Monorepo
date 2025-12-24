# Developer Quickstart: Twitch Emote MVP

**Feature**: 001-twitch-emote-mvp  
**Target Audience**: New developers onboarding to the project  
**Estimated Setup Time**: 30-45 minutes

---

## Prerequisites

### Required Software

| Tool | Version | Purpose | Installation |
|------|---------|---------|--------------|
| **Node.js** | 18.x or 20.x | Runtime for development | [nodejs.org](https://nodejs.org) |
| **pnpm** | 8.x+ | Package manager (monorepo support) | `npm install -g pnpm` |
| **Git** | 2.x+ | Version control | [git-scm.com](https://git-scm.com) |
| **Wrangler** | 3.x+ | Cloudflare Workers CLI | `pnpm install -g wrangler` |
| **PostgreSQL Client** | 15+ | Database CLI (optional) | [postgresql.org](https://www.postgresql.org/download/) |

### Required Accounts

1. **Supabase Account**: [supabase.com](https://supabase.com)
   - Free tier sufficient for development
   - Create new project: "streamlets-dev"
   
2. **Cloudflare Account**: [cloudflare.com](https://www.cloudflare.com)
   - Workers free tier sufficient for development
   - Enable Workers in dashboard
   
3. **Twitch Developer Account**: [dev.twitch.tv](https://dev.twitch.tv)
   - Register extension (name: "Streamlets Dev")
   - Generate extension secret for JWT validation

### Recommended Tools

- **VS Code** with extensions:
  - ESLint
  - Prettier
  - TypeScript and JavaScript Language Features
  - Hono extension (syntax highlighting)
- **Postman** or **Insomnia**: API testing
- **Twitch Extension Helper**: Browser extension for local testing

---

## Project Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-org/streamlets.git
cd streamlets

# Checkout feature branch
git checkout 001-twitch-emote-mvp
```

### 2. Install Dependencies

```bash
# Install all workspace dependencies
pnpm install

# Verify installation
pnpm list --depth=0
```

**Expected Output**:
```
streamlets
├── backend (workspace dependencies)
├── frontend-extension (workspace dependencies)
├── frontend-website (workspace dependencies)
└── shared (workspace dependencies)
```

### 3. Environment Configuration

Create environment files for each component:

#### Backend (.env)

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Twitch Extension Configuration
TWITCH_EXTENSION_CLIENT_ID=your-extension-client-id
TWITCH_EXTENSION_SECRET=your-extension-secret

# Environment
NODE_ENV=development
API_BASE_URL=http://localhost:8787

# Cloudflare Workers (local dev)
CLOUDFLARE_ACCOUNT_ID=your-account-id
```

**Where to find values**:
- `SUPABASE_URL` + `SUPABASE_ANON_KEY`: Supabase project settings → API
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase project settings → API → service_role (keep secret!)
- `TWITCH_EXTENSION_*`: Twitch Developer Console → Extensions → Your Extension
- `CLOUDFLARE_ACCOUNT_ID`: Cloudflare Dashboard → Workers → Overview

#### Frontend Extension (.env)

```bash
cd ../frontend-extension
cp .env.example .env
```

Edit `frontend-extension/.env`:

```bash
# API Configuration
VITE_API_BASE_URL=http://localhost:8787/api/v1

# Twitch Extension
VITE_TWITCH_EXTENSION_CLIENT_ID=your-extension-client-id

# Environment
VITE_NODE_ENV=development
```

#### Frontend Website (.env)

```bash
cd ../frontend-website
cp .env.example .env
```

Edit `frontend-website/.env`:

```bash
# API Configuration
VITE_API_BASE_URL=http://localhost:8787/api/v1

# Supabase (for website auth)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Environment
VITE_NODE_ENV=development
```

---

## Database Setup

### 1. Initialize Supabase Project

```bash
cd backend

# Login to Supabase
pnpm supabase login

# Link to your project
pnpm supabase link --project-ref your-project-ref

# Run migrations
pnpm supabase db push
```

**Alternative**: Manually run SQL from `data-model.md`:

1. Open Supabase Dashboard → SQL Editor
2. Copy migration SQL from `specs/001-twitch-emote-mvp/data-model.md` (section: Migration Scripts)
3. Execute SQL
4. Verify tables created in Table Editor

### 2. Seed Initial Data

```bash
# Seed emote cards (fetches from Twitch API)
pnpm run seed:emotes

# Seed rarity distribution
pnpm run seed:rarity
```

**Expected Output**:
```
✓ Fetched 147 global emotes from Twitch API
✓ Classified rarities (manual mapping)
✓ Inserted 147 cards into database
✓ Seeded rarity distribution: Common 50%, Rare 38%, Epic 10%, Legendary 1.99%, Fabled 0.01%
```

### 3. Create Test User

```bash
# Create test user with 10 tickets
pnpm run seed:test-user

# Output: Test user created
# Twitch ID: test-user-12345
# Username: test_viewer
# Tickets: 10
```

---

## Local Development

### Start All Services

**Option A: Concurrently (Recommended)**

```bash
# From project root
pnpm dev

# This starts:
# - Backend (Cloudflare Workers): http://localhost:8787
# - Frontend Extension (Vite): http://localhost:5173
# - Frontend Website (Vite): http://localhost:5174
```

**Option B: Individual Terminals**

```bash
# Terminal 1: Backend
cd backend
pnpm dev
# → http://localhost:8787

# Terminal 2: Extension Frontend
cd frontend-extension
pnpm dev
# → http://localhost:5173

# Terminal 3: Website Frontend
cd frontend-website
pnpm dev
# → http://localhost:5174
```

### Verify Services Running

```bash
# Check backend health
curl http://localhost:8787/health

# Expected response:
# {"status":"healthy","timestamp":"2025-12-24T15:30:00Z","services":{"database":"healthy"}}

# Check frontend extension
open http://localhost:5173
# Should display card collection UI

# Check website
open http://localhost:5174
# Should display landing page
```

---

## Testing Workflows

### Backend API Testing

#### Using curl

```bash
# List all cards (public endpoint)
curl http://localhost:8787/api/v1/cards

# Get user profile (requires auth - use test JWT)
curl -H "Authorization: Bearer <test-jwt>" \
  http://localhost:8787/api/v1/users/me

# Draw a card (requires auth)
curl -X POST \
  -H "Authorization: Bearer <test-jwt>" \
  -H "Content-Type: application/json" \
  http://localhost:8787/api/v1/draws
```

#### Generate Test JWT

```bash
# Create test Twitch Extension JWT
pnpm run test:generate-jwt

# Output:
# Test JWT (expires in 1 hour):
# eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Copy JWT and use in Authorization header.

#### Using Postman Collection

```bash
# Import Postman collection
open specs/001-twitch-emote-mvp/contracts/postman-collection.json

# Environment variables:
# - base_url: http://localhost:8787/api/v1
# - test_jwt: <generated-jwt>
```

### Frontend Testing

#### Extension E2E Tests

```bash
cd frontend-extension

# Run Playwright tests
pnpm test:e2e

# Open Playwright UI
pnpm test:e2e:ui
```

**Test Scenarios**:
- View card collection
- Draw card with tickets
- Handle insufficient tickets error
- Display ticket regeneration timer

#### Unit Tests

```bash
# Backend unit tests (Vitest)
cd backend
pnpm test

# Frontend unit tests
cd frontend-extension
pnpm test

# Watch mode
pnpm test:watch
```

### Integration Tests

```bash
# Run full integration test suite
pnpm test:integration

# Tests:
# - Draw transaction atomicity
# - Ticket regeneration logic
# - Database constraints
# - RNG distribution accuracy
```

---

## Twitch Extension Local Testing

### Setup Twitch Extension Helpers

1. Install **Twitch Extension Developer Rig**: [dev.twitch.tv/docs/extensions/rig](https://dev.twitch.tv/docs/extensions/rig/)
2. Configure extension in rig:
   - Extension ID: `your-extension-id`
   - Frontend URL: `http://localhost:5173`
   - Backend URL: `http://localhost:8787`

### Testing in Rig

```bash
# Start frontend extension
cd frontend-extension
pnpm dev

# Start backend
cd backend
pnpm dev

# Open Extension Rig → Add your extension → Select "Panel" view
# Extension should load with test viewer context
```

### Mock Twitch Context

```typescript
// frontend-extension/src/test/mockTwitchContext.ts
export const mockTwitchContext = {
  userId: 'test-user-12345',
  channelId: 'test-channel-67890',
  token: 'test-jwt-token',  // Generated via backend test script
};
```

---

## Database Management

### View Data (Supabase Dashboard)

1. Open Supabase Dashboard → Table Editor
2. Tables to inspect:
   - `users`: Viewer accounts
   - `cards`: Available card pool
   - `ticket_balances`: User ticket counts
   - `user_collections`: Owned cards
   - `draw_transactions`: Draw history

### Query Database (SQL)

```bash
# Connect to database
pnpm supabase db connect

# Example queries
SELECT COUNT(*) FROM cards;
SELECT * FROM users WHERE twitch_username = 'test_viewer';
SELECT rarity, COUNT(*) FROM cards GROUP BY rarity;
```

### Reset Database (Development)

```bash
# WARNING: Deletes all data
pnpm supabase db reset

# Re-run migrations and seeds
pnpm run seed:all
```

---

## Common Development Tasks

### Add New API Endpoint

1. **Define contract**: Edit `specs/001-twitch-emote-mvp/contracts/`
2. **Add route**: `backend/src/api/routes/your-route.ts`
3. **Implement handler**: Business logic in `backend/src/services/`
4. **Add tests**: `backend/tests/api/your-route.test.ts`
5. **Update types**: `shared/types.ts` for shared interfaces

**Example**:
```typescript
// backend/src/api/routes/cards.ts
import { Hono } from 'hono';

const cardsRouter = new Hono();

cardsRouter.get('/', async (c) => {
  const cards = await c.env.DB.getCards();
  return c.json({ data: cards });
});

export default cardsRouter;
```

### Modify Database Schema

1. **Create migration**: `pnpm supabase migration new your_change`
2. **Write SQL**: Edit `supabase/migrations/YYYYMMDDHHMMSS_your_change.sql`
3. **Apply locally**: `pnpm supabase db push`
4. **Update data-model.md**: Document schema changes
5. **Test**: Verify constraints and RLS policies

### Debug Common Issues

#### Issue: "Supabase connection failed"

**Solution**:
```bash
# Check environment variables
cat backend/.env | grep SUPABASE

# Verify API keys in Supabase Dashboard → Settings → API
# Ensure SUPABASE_URL and SUPABASE_ANON_KEY are correct
```

#### Issue: "Twitch JWT validation failed"

**Solution**:
```bash
# Verify extension secret matches Twitch Developer Console
cat backend/.env | grep TWITCH_EXTENSION_SECRET

# Generate fresh test JWT
pnpm run test:generate-jwt
```

#### Issue: "Draw transaction failed"

**Solution**:
```bash
# Check database constraints
pnpm supabase db inspect

# View transaction logs
SELECT * FROM draw_transactions ORDER BY created_at DESC LIMIT 10;

# Check ticket balance
SELECT * FROM ticket_balances WHERE user_id = 'your-user-id';
```

#### Issue: "Frontend can't connect to backend"

**Solution**:
```bash
# Verify backend is running
curl http://localhost:8787/health

# Check CORS configuration in backend/src/middleware/cors.ts
# Ensure localhost:5173 is in allowed origins

# Check frontend .env
cat frontend-extension/.env | grep VITE_API_BASE_URL
# Should be: http://localhost:8787/api/v1
```

---

## Code Quality & Standards

### Linting

```bash
# Run ESLint
pnpm lint

# Auto-fix issues
pnpm lint:fix
```

### Type Checking

```bash
# TypeScript strict mode check
pnpm type-check

# Should pass with 0 errors (Constitution Principle II)
```

### Formatting

```bash
# Format code with Prettier
pnpm format

# Check formatting
pnpm format:check
```

### Pre-commit Hooks

```bash
# Install Husky hooks
pnpm prepare

# Hooks run automatically on commit:
# - ESLint
# - TypeScript type check
# - Prettier format check
# - Unit tests
```

---

## Deployment (Staging)

### Deploy Backend to Cloudflare Workers

```bash
cd backend

# Authenticate with Cloudflare
wrangler login

# Deploy to staging
pnpm deploy:staging

# Expected output:
# ✓ Built successfully
# ✓ Deployed to https://api-staging.streamlets.app
```

### Deploy Frontend Extension (Twitch)

```bash
cd frontend-extension

# Build static assets
pnpm build

# Upload to Twitch CDN
pnpm deploy:twitch

# Update extension asset URLs in Twitch Developer Console
```

### Deploy Website (Cloudflare Pages)

```bash
cd frontend-website

# Build production assets
pnpm build

# Deploy to Cloudflare Pages
pnpm deploy:pages

# Expected output:
# ✓ Deployed to https://streamlets-staging.pages.dev
```

---

## Performance Monitoring

### Local Performance Profiling

```bash
# Backend API benchmarks
cd backend
pnpm benchmark

# Expected results:
# GET /api/v1/cards: 15ms p95
# POST /api/v1/draws: 120ms p95
# GET /api/v1/users/me/collection: 80ms p95
```

### Load Testing

```bash
# Install k6 (load testing tool)
# macOS: brew install k6
# Linux: https://k6.io/docs/getting-started/installation/

# Run load test (100 concurrent users)
k6 run backend/tests/load/draw-simulation.js

# Expected:
# 95th percentile latency: <200ms
# Error rate: <1%
```

---

## Helpful Resources

### Documentation

- **Hono Framework**: [hono.dev](https://hono.dev)
- **Cloudflare Workers**: [developers.cloudflare.com/workers](https://developers.cloudflare.com/workers)
- **Supabase Docs**: [supabase.com/docs](https://supabase.com/docs)
- **Twitch Extension Docs**: [dev.twitch.tv/docs/extensions](https://dev.twitch.tv/docs/extensions)

### Project Documentation

- **Feature Spec**: `specs/001-twitch-emote-mvp/spec.md`
- **Implementation Plan**: `specs/001-twitch-emote-mvp/plan.md`
- **Data Model**: `specs/001-twitch-emote-mvp/data-model.md`
- **API Contracts**: `specs/001-twitch-emote-mvp/contracts/`
- **Constitution**: `.specify/memory/constitution.md`

### Team Communication

- **GitHub Issues**: Feature requests, bugs
- **GitHub Discussions**: Technical questions
- **Discord**: Real-time help (link in README)

---

## Next Steps

After completing quickstart:

1. ✅ All services running locally
2. ✅ Backend API responding to test requests
3. ✅ Frontend extension displaying cards
4. ✅ Database seeded with test data
5. ✅ Tests passing

**Ready for development!** Pick a task from `specs/001-twitch-emote-mvp/tasks.md` (generated via `/speckit.tasks`).

### Suggested First Tasks

For new developers:

1. **Backend**: Implement `/api/v1/cards/:id` endpoint (see `contracts/cards.md`)
2. **Frontend**: Create `CardGrid` component (display collection)
3. **Database**: Add test for ticket regeneration logic

### Need Help?

- Check `CONTRIBUTING.md` for workflow guidelines
- Review constitution for architecture principles
- Ask in Discord #dev-help channel
- Open GitHub Discussion for design questions
