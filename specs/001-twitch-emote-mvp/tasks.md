# Tasks: Twitch Emote MVP

**Input**: Design documents from `/specs/001-twitch-emote-mvp/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Based on plan.md structure:
- **Backend**: `backend/src/`
- **Frontend Extension**: `frontend-extension/src/`
- **Frontend Website**: `frontend-website/src/`
- **Shared**: `shared/`
- **Database**: `db-migrations/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create monorepo structure with backend/, frontend-extension/, frontend-website/, shared/ directories
- [x] T002 Initialize backend project with Hono, Wrangler, and TypeScript in backend/package.json
- [x] T003 [P] Initialize frontend-extension project with React, Vite, and Twitch Extension SDK in frontend-extension/package.json
- [x] T004 [P] Initialize frontend-website project with React and Vite in frontend-website/package.json
- [x] T005 [P] Initialize shared types package with TypeScript in shared/package.json
- [x] T006 [P] Configure TypeScript strict mode in all tsconfig.json files per constitution
- [x] T007 [P] Configure ESLint and Prettier in backend/.eslintrc.json and backend/.prettierrc
- [x] T008 [P] Configure ESLint and Prettier in frontend-extension/.eslintrc.json
- [x] T009 [P] Configure ESLint and Prettier in frontend-website/.eslintrc.json
- [x] T010 Setup workspace package manager (pnpm) with pnpm-workspace.yaml
- [x] T011 Create backend/wrangler.toml for Cloudflare Workers configuration
- [x] T012 [P] Create environment templates: backend/.env.example, frontend-extension/.env.example, frontend-website/.env.example

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Database Foundation

- [x] T013 Create database migration file db-migrations/001_initial_schema.sql with all tables from data-model.md
- [x] T014 Create database seed script db-migrations/seed-emotes.ts to fetch Twitch global emotes
- [x] T015 Create database seed script db-migrations/seed-rarity.ts to populate rarity_distribution table
- [x] T016 Create PostgreSQL stored procedure draw_card() in db-migrations/002_draw_card_function.sql per data-model.md

### Shared Types and Constants

- [x] T017 [P] Create shared RarityTier type in shared/types.ts
- [x] T018 [P] Create shared Card interface in shared/types.ts
- [x] T019 [P] Create shared User interface in shared/types.ts
- [x] T020 [P] Create shared TicketBalance interface in shared/types.ts
- [x] T021 [P] Create shared CollectionEntry interface in shared/types.ts
- [x] T022 [P] Create shared DrawTransaction interface in shared/types.ts
- [x] T023 [P] Create rarity distribution constants in shared/constants.ts
- [x] T024 [P] Create ticket configuration constants in shared/constants.ts
- [x] T025 [P] Create Zod validation schemas in shared/validation.ts for API contracts

### Backend Infrastructure

- [x] T026 Create Supabase client configuration in backend/src/db/client.ts
- [x] T027 Create Twitch JWT authentication middleware in backend/src/middleware/auth.ts
- [x] T028 [P] Create error handling middleware in backend/src/middleware/error.ts
- [x] T029 [P] Create CORS middleware in backend/src/middleware/cors.ts
- [x] T030 [P] Create logging middleware in backend/src/middleware/logger.ts
- [x] T031 Create Hono app initialization in backend/src/index.ts with middleware registration
- [x] T032 Create RNG service interface in backend/src/services/rng.interface.ts
- [x] T033 Create ProductionRNG implementation in backend/src/services/rng.production.ts using crypto.getRandomValues()
- [x] T034 [P] Create TestRNG implementation in backend/src/services/rng.test.ts with seeded PRNG
- [x] T035 Create ticket regeneration service in backend/src/services/ticket-regeneration.ts per research.md section 6
- [x] T036 Create health check endpoint in backend/src/api/routes/health.ts

### Frontend Extension Infrastructure

- [x] T037 Create Twitch Extension SDK integration in frontend-extension/src/App.tsx
- [x] T038 Create API client service in frontend-extension/src/services/api.ts with JWT integration
- [x] T039 [P] Create error handling utilities in frontend-extension/src/utils/errors.ts
- [x] T040 [P] Create date formatting utilities in frontend-extension/src/utils/format.ts

### Frontend Website Infrastructure

- [x] T041 Create Supabase Auth client in frontend-website/src/services/supabase.ts
- [x] T042 Create API client service in frontend-website/src/services/api.ts
- [x] T043 Create routing configuration in frontend-website/src/App.tsx

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - View and Collect Twitch Emote Cards (Priority: P1) 🎯 MVP

**Goal**: Viewers can see a collection of cards based on Twitch emotes, view their current collection, and understand which cards are available to collect

**Independent Test**: Open extension and verify emote-based cards are displayed with clear visual distinction between owned and unowned cards

### Backend Implementation for User Story 1

- [ ] T044 [P] [US1] Create Card model types in backend/src/models/card.ts
- [ ] T045 [P] [US1] Create User model types in backend/src/models/user.ts
- [ ] T046 [US1] Create CardService in backend/src/services/card.service.ts with getCards() and getCardById() methods
- [ ] T047 [US1] Create UserService in backend/src/services/user.service.ts with getOrCreateUser() method
- [ ] T048 [US1] Implement GET /api/v1/cards endpoint in backend/src/api/routes/cards.ts per contracts/cards.md
- [ ] T049 [US1] Implement GET /api/v1/cards/:id endpoint in backend/src/api/routes/cards.ts with stats
- [ ] T050 [US1] Implement GET /api/v1/users/me/collection endpoint in backend/src/api/routes/users.ts per contracts/users.md
- [ ] T051 [US1] Register cards and users routes in backend/src/api/index.ts

### Frontend Extension Implementation for User Story 1

- [ ] T052 [P] [US1] Create CardGrid component in frontend-extension/src/components/CardGrid.tsx
- [ ] T053 [P] [US1] Create CardDetails component in frontend-extension/src/components/CardDetails.tsx
- [ ] T054 [P] [US1] Create useCardCollection hook in frontend-extension/src/hooks/useCardCollection.ts
- [ ] T055 [US1] Create Collection page in frontend-extension/src/pages/Collection.tsx integrating CardGrid
- [ ] T056 [US1] Add loading states and error handling to Collection page
- [ ] T057 [US1] Add visual distinction for owned vs unowned cards in CardGrid component

### Frontend Website Implementation for User Story 1

- [ ] T058 [P] [US1] Create Leaderboard component in frontend-website/src/components/Leaderboard.tsx
- [ ] T059 [US1] Create Leaderboard page in frontend-website/src/pages/Leaderboard.tsx

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Draw Cards from Emote Pool (Priority: P1) 🎯 MVP

**Goal**: Viewers can use tickets to draw random cards from the pool, respecting rarity tiers

**Independent Test**: Provide viewer with tickets and verify they can draw cards that are added to their collection

### Backend Implementation for User Story 2

- [ ] T060 [P] [US2] Create DrawTransaction model types in backend/src/models/draw-transaction.ts
- [ ] T061 [P] [US2] Create TicketBalance model types in backend/src/models/ticket-balance.ts
- [ ] T062 [US2] Create DrawService in backend/src/services/draw.service.ts implementing full draw flow per contracts/draws.md
- [ ] T063 [US2] Implement duplicate detection logic in DrawService
- [ ] T064 [US2] Implement POST /api/v1/draws endpoint in backend/src/api/routes/draws.ts with atomic transaction
- [ ] T065 [US2] Register draws route in backend/src/api/index.ts
- [ ] T066 [US2] Add rate limiting for draw endpoint (60 draws/hour) in backend/src/middleware/rate-limit.ts

### Frontend Extension Implementation for User Story 2

- [ ] T067 [P] [US2] Create DrawButton component in frontend-extension/src/components/DrawButton.tsx
- [ ] T068 [P] [US2] Create DrawResult modal component in frontend-extension/src/components/DrawResult.tsx
- [ ] T069 [P] [US2] Create useDrawCard hook in frontend-extension/src/hooks/useDrawCard.ts
- [ ] T070 [US2] Create Draw page in frontend-extension/src/pages/Draw.tsx integrating DrawButton
- [ ] T071 [US2] Add draw animation and result display in DrawResult modal
- [ ] T072 [US2] Add error handling for insufficient tickets in DrawButton component
- [ ] T073 [US2] Integrate draw functionality with Collection page to update owned cards

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Ticket Regeneration System (Priority: P1) 🎯 MVP

**Goal**: Viewers receive tickets on a time-based schedule, allowing sustained engagement

**Independent Test**: Deplete tickets, wait for regeneration period, and verify tickets are restored

### Backend Implementation for User Story 3

- [ ] T074 [US3] Implement GET /api/v1/users/me/tickets endpoint in backend/src/api/routes/users.ts with lazy regeneration
- [ ] T075 [US3] Integrate ticket regeneration in DrawService before draw execution
- [ ] T076 [US3] Add ticket balance validation and error responses per contracts/users.md

### Frontend Extension Implementation for User Story 3

- [ ] T077 [P] [US3] Create TicketDisplay component in frontend-extension/src/components/TicketDisplay.tsx
- [ ] T078 [P] [US3] Create useTicketBalance hook in frontend-extension/src/hooks/useTicketBalance.ts
- [ ] T079 [US3] Add countdown timer for next ticket regeneration in TicketDisplay component
- [ ] T080 [US3] Integrate TicketDisplay in Draw page header
- [ ] T081 [US3] Add ticket balance polling (30 requests/minute max) in useTicketBalance hook
- [ ] T082 [US3] Disable draw button when tickets are zero with clear messaging

**Checkpoint**: All P1 user stories (MVP core) should now be independently functional

---

## Phase 6: User Story 4 - Twitch Extension Deployment (Priority: P2)

**Goal**: Extension is deployed to Twitch platform and accessible to viewers on participating channels

**Independent Test**: Install extension on test Twitch channel and verify it loads correctly in overlay/panel positions

### Deployment Tasks for User Story 4

- [ ] T083 [US4] Configure Twitch Extension manifest with extension client ID and permissions
- [ ] T084 [US4] Create production build configuration for frontend-extension in vite.config.ts
- [ ] T085 [US4] Optimize bundle size for Twitch Extension (static assets) in frontend-extension/
- [ ] T086 [US4] Deploy backend to Cloudflare Workers staging environment
- [ ] T087 [US4] Build and package frontend-extension static assets
- [ ] T088 [US4] Upload extension assets to Twitch CDN via Twitch Developer Console
- [ ] T089 [US4] Configure extension overlay and panel views in Twitch Developer Console
- [ ] T090 [US4] Test extension installation on test Twitch channel
- [ ] T091 [US4] Verify multi-viewer isolation (collections are per-user) in live environment
- [ ] T092 [US4] Configure production Cloudflare Workers environment variables
- [ ] T093 [US4] Deploy backend to Cloudflare Workers production environment

**Checkpoint**: Extension should be live and testable by real Twitch viewers

---

## Phase 7: User Story 5 - Progress Visibility and Stats (Priority: P3)

**Goal**: Viewers can see their collection progress, completion percentage, and collection milestones

**Independent Test**: Collect various numbers of cards and verify stats update correctly

### Backend Implementation for User Story 5

- [ ] T094 [US5] Implement GET /api/v1/users/me endpoint in backend/src/api/routes/users.ts with stats aggregation per contracts/users.md
- [ ] T095 [US5] Implement GET /api/v1/users/me/transactions endpoint in backend/src/api/routes/users.ts
- [ ] T096 [US5] Add rarity counts aggregation in UserService
- [ ] T097 [US5] Add completion percentage calculation in UserService

### Frontend Extension Implementation for User Story 5

- [ ] T098 [P] [US5] Create CollectionStats component in frontend-extension/src/components/CollectionStats.tsx
- [ ] T099 [P] [US5] Create RarityBadge component in frontend-extension/src/components/RarityBadge.tsx
- [ ] T100 [US5] Integrate CollectionStats in Collection page header
- [ ] T101 [US5] Add rarity completion indicators to Collection page
- [ ] T102 [US5] Add animated stats updates when new cards are drawn

### Frontend Website Implementation for User Story 5

- [ ] T103 [P] [US5] Create StreamerDashboard component in frontend-website/src/components/StreamerDashboard.tsx
- [ ] T104 [US5] Create StreamerBackend page in frontend-website/src/pages/StreamerBackend.tsx
- [ ] T105 [US5] Add global statistics view to Leaderboard page

**Checkpoint**: All user stories should now be independently functional with complete feature set

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T106 [P] Add comprehensive API documentation in specs/001-twitch-emote-mvp/contracts/README.md
- [ ] T107 [P] Create developer quickstart validation script to test all setup steps from quickstart.md
- [ ] T108 [P] Add performance monitoring for API endpoints (p95 latency tracking)
- [ ] T109 [P] Add drop rate validation monitoring (1000 draw analysis) per contracts/draws.md
- [ ] T110 [P] Optimize database queries with proper indexes verification
- [ ] T111 [P] Add Cloudflare CDN caching headers for card endpoints per contracts/cards.md
- [ ] T112 [P] Security audit: Verify RLS policies in Supabase per data-model.md
- [ ] T113 [P] Security audit: Verify server-side authority (no client-side rarity/card selection)
- [ ] T114 [P] Add error tracking integration (Sentry or equivalent)
- [ ] T115 [P] Create backup and disaster recovery plan for Supabase database
- [ ] T116 Code cleanup: Remove unused imports and dead code across all projects
- [ ] T117 Code cleanup: Ensure consistent code formatting with Prettier
- [ ] T118 Documentation: Update README.md with feature overview and quick start
- [ ] T119 Documentation: Add inline JSDoc comments for all public APIs
- [ ] T120 Final validation: Run quickstart.md steps on clean environment

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - P1 stories (US1, US2, US3) are MVP-critical - prioritize these
  - P2 story (US4) enables real-world testing
  - P3 story (US5) adds engagement features
- **Polish (Phase 8)**: Depends on desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - Integrates with US1 collection display
- **User Story 3 (P1)**: Can start after Foundational (Phase 2) - Integrates with US2 draw mechanics
- **User Story 4 (P2)**: Can start after US1, US2, US3 complete - Requires working MVP
- **User Story 5 (P3)**: Can start after Foundational (Phase 2) - Independent from other stories

### Within Each User Story

- Backend models before services
- Services before endpoints
- Endpoints before frontend integration
- Frontend hooks before components
- Components before pages
- Story complete before moving to next priority

### Parallel Opportunities

**Setup Phase**:
- T003, T004, T005 (frontend projects)
- T006, T007, T008, T009 (linting configs)
- T012 (environment templates)

**Foundational Phase**:
- T017-T024 (shared types and constants - all parallel)
- T028, T029, T030, T034 (middleware - parallel)
- T039, T040 (frontend utilities - parallel)

**User Story 1**:
- T044, T045 (models - parallel)
- T052, T053, T054 (frontend components/hooks - parallel)
- T058 (website components - parallel with extension work)

**User Story 2**:
- T060, T061 (models - parallel)
- T067, T068, T069 (frontend components/hooks - parallel)

**User Story 3**:
- T077, T078 (frontend components/hooks - parallel)

**User Story 5**:
- T098, T099 (frontend components - parallel)
- T103 (website component - parallel with extension work)

**Polish Phase**:
- T106-T115 (documentation, monitoring, security - all parallel)

---

## Parallel Example: User Story 1

```bash
# Launch all models for User Story 1 together:
Task T044: "Create Card model types in backend/src/models/card.ts"
Task T045: "Create User model types in backend/src/models/user.ts"

# Launch all frontend components for User Story 1 together:
Task T052: "Create CardGrid component in frontend-extension/src/components/CardGrid.tsx"
Task T053: "Create CardDetails component in frontend-extension/src/components/CardDetails.tsx"
Task T054: "Create useCardCollection hook in frontend-extension/src/hooks/useCardCollection.ts"
```

## Parallel Example: User Story 2

```bash
# Launch all models for User Story 2 together:
Task T060: "Create DrawTransaction model types in backend/src/models/draw-transaction.ts"
Task T061: "Create TicketBalance model types in backend/src/models/ticket-balance.ts"

# Launch all frontend components for User Story 2 together:
Task T067: "Create DrawButton component in frontend-extension/src/components/DrawButton.tsx"
Task T068: "Create DrawResult modal component in frontend-extension/src/components/DrawResult.tsx"
Task T069: "Create useDrawCard hook in frontend-extension/src/hooks/useDrawCard.ts"
```

---

## Implementation Strategy

### MVP First (P1 User Stories Only)

1. Complete Phase 1: Setup (T001-T012)
2. Complete Phase 2: Foundational (T013-T043) - CRITICAL - blocks all stories
3. Complete Phase 3: User Story 1 (T044-T059)
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Complete Phase 4: User Story 2 (T060-T073)
6. **STOP and VALIDATE**: Test User Story 2 with User Story 1
7. Complete Phase 5: User Story 3 (T074-T082)
8. **STOP and VALIDATE**: Test complete MVP (US1 + US2 + US3)
9. Deploy to staging for testing

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (Cards viewable!)
3. Add User Story 2 → Test independently → Deploy/Demo (Drawing works!)
4. Add User Story 3 → Test independently → Deploy/Demo (MVP complete!)
5. Add User Story 4 → Deploy to Twitch platform → Real user testing
6. Add User Story 5 → Add engagement features → Full feature set
7. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (View/Collect Cards)
   - Developer B: User Story 2 (Draw Mechanics)
   - Developer C: User Story 3 (Ticket Regeneration)
3. Stories complete and integrate independently
4. Team validates MVP together
5. Proceed with User Stories 4 and 5

---

## Notes

- **[P] tasks**: Different files, no dependencies - can run in parallel
- **[Story] label**: Maps task to specific user story for traceability
- **Each user story**: Independently completable and testable
- **Tests**: Not included (not explicitly requested in spec)
- **Commit strategy**: Commit after each task or logical group
- **Checkpoints**: Stop at any checkpoint to validate story independently
- **MVP scope**: User Stories 1, 2, 3 (all P1) constitute the minimum viable product
- **File paths**: All paths are relative to project root per plan.md structure
- **Constitution compliance**: Server-side authority (Principle I), TypeScript strict mode (Principle II), Edge-native (Principle III), ACID transactions (Principle IV)
