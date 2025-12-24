<!--
SYNC IMPACT REPORT
==================
Version Change: 1.0.0 → 1.1.0
Type: Constitutional Amendment (Minor)
Date: 2025-12-24

Changes Made:
- Expanded Principle VI (Streamer Autonomy) to include dedicated streamer management backend requirements
- Modified Principle VII (Engagement-Driven Design) to clarify anti-FOMO platform policy
- Added Principle VIII (Algorithmic-Only Production) - no AI/ML in production runtime
- Added Principle IX (Resource-Conscious Design) - asset storage constraints and WebP requirements

Amendment Rationale:
- Principle VI enhancement: Ensures streamers have proper tools for brand control without technical knowledge
- Principle VII clarification: Platform must NOT create artificial scarcity; streamer autonomy to choose their own mechanics
- Principle VIII (NEW): Enforces deterministic, algorithmic logic for predictability, cost control, and transparency
- Principle IX (NEW): Establishes cost management practices before revenue/scaling phase

Version Bump Justification:
- MINOR (1.1.0): Additive changes only - expanded existing principles and added new ones
- No breaking changes to existing principles
- New principles provide additional guidance without invalidating existing work
- Template synchronization required for new principles VIII and IX

-->

<!--
SYNC IMPACT REPORT
==================
Version Change: N/A → 1.0.0
Type: Initial Constitution Creation
Date: 2025-12-24

Changes Made:
- Created initial constitution for Streamlets project
- Established 7 core principles:
  1. Server-Side Authority (game integrity)
  2. TypeScript-First Development (type safety)
  3. Edge-Native Architecture (performance)
  4. Data Integrity & ACID Compliance (PostgreSQL/Supabase)
  5. Balanced Economy Design (fair progression, no pay-to-win)
  6. Streamer Autonomy (customization and control)
  7. Engagement-Driven Design (viewer retention focus)

Template Compatibility:
- plan-template.md: Constitution Check section references this file ✓
- spec-template.md: Requirements format aligns with testable principles ✓
- tasks-template.md: Task organization supports phased development model ✓

Notes:
- All placeholders filled with Streamlets-specific content
- Principles are declarative, testable, and measurable
- Governance section establishes constitution as highest authority
- Database technology updated to Supabase (PostgreSQL) per latest feedback
-->

# Streamlets Constitution

A Twitch extension for collecting digital cards based on streamer artwork and emotes. Streamlets is a Gacha/Idle RPG/Collection game designed to increase viewer engagement and watch time through addictive gameplay loops and streamer-branded content.

## Core Principles

### I. Server-Side Authority (NON-NEGOTIABLE)

**All game-critical logic MUST execute server-side with cryptographic verification.**

- Card draws, quest rewards, crafting results are computed server-side only
- Client receives deterministic results signed by server
- No trust in client-side state for economy-affecting operations
- RNG seeds must be server-generated and verifiable
- Transaction logs required for all currency/inventory changes

**Rationale**: Prevents cheating, ensures fair economy, maintains game integrity across all players. Client-side calculations are inherently insecure in competitive/economy-driven games.

**Test**: Attempt to modify client requests; server must reject invalid state transitions.

---

### II. TypeScript-First Development

**All code MUST be written in TypeScript with strict mode enabled.**

- `strict: true` in all tsconfig.json files
- No `any` types without explicit justification and comment
- Prefer type inference over explicit types where clear
- Zod or similar runtime validators for external data boundaries
- Export types alongside implementation for shared contracts

**Rationale**: TypeScript prevents entire classes of runtime bugs, serves as living documentation, and enables safe refactoring. The Hono + Cloudflare Workers ecosystem has excellent TypeScript support.

**Test**: `tsc --noEmit` must pass with zero errors; linter must enforce no-explicit-any.

---

### III. Edge-Native Architecture

**Application MUST leverage Cloudflare Workers' edge computing model.**

- No global state; all data from request context or durable storage
- Stateless request handlers; state in Supabase or Cloudflare KV/Durable Objects
- Optimize for cold-start performance (minimize dependencies)
- Geographic data locality via Supabase connection pooling
- Response times target <100ms p95 for non-database operations

**Rationale**: Edge computing provides low-latency responses globally, essential for real-time Twitch extension UX. Cloudflare Workers' V8 isolate model enforces good architectural practices.

**Test**: Deploy to Workers; verify cold start <50ms, warm requests <10ms (excluding DB).

---

### IV. Data Integrity & ACID Compliance

**PostgreSQL (Supabase) MUST enforce data constraints at database level.**

- Use ENUMs for constrained values (rarity, resonance, variant, status)
- Foreign key constraints with ON DELETE CASCADE/RESTRICT as appropriate
- NOT NULL constraints on required fields
- UNIQUE constraints on natural keys (e.g., users.twitch_id)
- CHECK constraints for valid ranges (e.g., durability_current <= durability_max)
- Row Level Security (RLS) policies to enforce user data isolation
- Transactions for multi-step operations (e.g., quest completion + reward distribution)

**Rationale**: Database-level constraints prevent invalid state from ever being stored, even with buggy application code. PostgreSQL's ACID guarantees ensure consistency during concurrent operations.

**Test**: Attempt to insert invalid data via SQL; constraints must reject. Concurrent operations must not create race conditions.

---

### V. Balanced Economy Design

**Game economy MUST prioritize fair progression and engagement over monetization.**

- No pay-to-win mechanics; purchases are cosmetic only
- Energy (tickets) regenerate on fixed schedule (no purchased refills)
- Drop rates and quest rewards balanced for consistent progression
- Duplicate cards convert to crafting materials (no dead pulls)
- Pity systems for rare cards (deterministic eventually)
- Economy simulation tools to validate balance before deployment

**Rationale**: Streamlets succeeds when viewers engage authentically with content. Pay-to-win alienates viewers and undermines the engagement loop. Fair economies create long-term retention.

**Test**: Simulate 1000 player sessions; P50 player should obtain rare card within 2 hours of active play.

---

### VI. Streamer Autonomy

**Streamers MUST control their card ecosystem with minimal friction.**

- Auto-generation of cards from existing emotes/artwork (AI-assisted development tool only)
- Streamer approval workflow before cards go live
- Per-streamer customization: card pools, drop rates, quest themes
- Streamer dashboard for analytics: card popularity, engagement metrics
- Ability to retire/update cards without breaking existing collections
- No manual card creation required (but available for advanced users)
- **Dedicated streamer management backend** (separate from viewer interface):
  - Upload and select custom artwork for cards
  - Configure card settings and parameters
  - Customize game mechanics without technical knowledge
  - Brand control through intuitive admin panel

**Rationale**: Streamlets' value scales with streamer adoption. Low barrier to entry + customization drives adoption. Streamers must feel ownership over their branded content. A dedicated management interface ensures streamers can maintain brand control without requiring technical expertise.

**Test**: New streamer can generate and activate card set within 15 minutes of signup. Streamer admin panel accessible and functional for non-technical users.

---

### VII. Engagement-Driven Design

**All features MUST optimize for viewer watch time and interaction.**

- Idle mechanics reward passive watching (quest timers tick while watching)
- Active mechanics reward participation (chat commands, channel point integration)
- Social features encourage community (leaderboards, trading, showcasing)
- Progress visible in-stream (overlay shows collection completion %)
- Notifications bring viewers back (quest completed, rare card available)
- **Anti-FOMO Platform Policy**:
  - Platform itself MUST NOT create artificial scarcity or time-limited exclusives
  - All core features remain accessible long-term
  - Streamers MAY choose to implement their own FOMO mechanics (their business decision)
  - Platform provides tools; streamers decide engagement strategy

**Rationale**: Streamlets exists to increase viewer engagement. Every design decision should be evaluated through this lens: does it encourage viewers to watch longer or return more frequently? However, the platform respects ethical design by not forcing manipulative mechanics—streamers maintain autonomy over their engagement strategies.

**Test**: A/B test features; engagement metric (watch time, return rate) must not decrease. Verify no platform-wide time-limited content.

---

### VIII. Algorithmic-Only Production

**Production runtime MUST use deterministic, rule-based logic only—NO AI/ML models.**

- AI tools permitted ONLY for development assistance (code generation with human oversight)
- Card generation, matching, and recommendations MUST be algorithmic (rule-based, deterministic)
- No machine learning models in production runtime
- No LLM API calls for game logic or content generation
- No external AI services for player-facing features
- All game behavior must be predictable and reproducible

**Rationale**: Predictability ensures consistent player experience. Cost control prevents unpredictable API expenses. Transparency allows players to understand game mechanics. Deterministic systems are easier to debug, test, and maintain.

**Test**: Code review must verify no ML/AI imports in production code. Runtime monitoring must show no external AI API calls.

---

### IX. Resource-Conscious Design

**Asset storage and processing MUST be constrained to control costs before revenue.**

- **Upload limits**: Maximum 50-100 custom card artworks per streamer
- **Image format**: ALL uploaded images MUST be converted to WebP server-side
- **WebP rationale**: Smaller file sizes, animation support, transparency, superior compression efficiency
- Storage quotas enforced at database/application level
- Image processing pipeline auto-converts and optimizes on upload
- Streamer dashboard shows quota usage and remaining capacity

**Rationale**: Cost management is critical before monetization/scaling. WebP provides optimal balance of quality, features, and file size. Explicit limits prevent runaway storage costs while supporting reasonable streamer customization needs.

**Test**: Upload non-WebP image; verify server converts to WebP. Attempt to exceed quota; system must reject. Storage metrics dashboard displays accurate quota usage.

---

## Technical Stack Requirements

**Mandatory Technologies**:

- **Backend Framework**: Hono (TypeScript)
- **Edge Runtime**: Cloudflare Workers
- **Database**: Supabase (PostgreSQL 15+)
- **Authentication**: Twitch Extension JWT + Supabase Auth integration
- **Frontend**: Twitch Extension SDK (Overlay + Panel components)
- **Type Safety**: Zod for runtime validation
- **Testing**: Vitest (unit), Playwright (E2E for extension UI)

**Forbidden Without Justification**:

- Client-side RNG for game mechanics
- Storing game state in browser localStorage
- Direct database access from frontend
- Synchronous blocking operations in Workers
- Global mutable state in Workers code

**Performance Targets**:

- API response time: <100ms p95 (excluding external DB latency)
- Database query time: <50ms p95 for indexed reads
- Cold start: <50ms for Worker initialization
- Extension load time: <1s for initial render
- Concurrent users: 10,000+ per streamer without degradation

---

## Development Workflow

**Feature Development Lifecycle**:

1. **Specification**: Create spec in `/specs/[###-feature]/spec.md` with user stories
2. **Planning**: Generate implementation plan via `/speckit.plan`
3. **Constitution Check**: Verify compliance with all 9 principles
4. **Design**: Complete research, data model, contracts (Phase 0-1)
5. **Task Breakdown**: Generate tasks via `/speckit.tasks`
6. **Implementation**: Execute tasks in priority order (MVP-first)
7. **Testing**: Validate against acceptance criteria and principles
8. **Deployment**: Edge deployment with feature flags for gradual rollout

**Branching Strategy**:

- Feature branches: `[###-feature-name]` (e.g., `001-card-draw-system`)
- Constitution compliance verified before merge
- No direct commits to main branch

**Code Review Requirements**:

- TypeScript strict mode compliance
- Server-side authority validation for economy operations
- Database constraints present for data integrity
- Edge-native patterns (no global state)
- Performance regression check (response time budgets)

---

## Governance

**Constitutional Authority**:

This constitution is the highest authority for all Streamlets development decisions. Any feature, pattern, or technology choice that conflicts with these principles MUST be justified in writing with:

1. **Specific problem** that cannot be solved within constitutional bounds
2. **Alternatives considered** and why they were rejected
3. **Mitigation plan** to minimize constitutional deviation
4. **Approval** from project lead before implementation

**Amendment Process**:

1. Propose amendment with rationale in GitHub issue
2. Discuss impact on existing codebase and templates
3. Update constitution with version bump (semantic versioning)
4. Update dependent templates (plan, spec, tasks) for consistency
5. Add migration guide for existing features if needed
6. Commit with message: `chore: amend constitution to v[X.Y.Z] - [brief reason]`

**Complexity Budget**:

Violations of simplicity principles (e.g., introducing new runtime dependencies, adding layers of abstraction) MUST be tracked in implementation plans under "Complexity Tracking" section with explicit justification.

**Template Synchronization**:

- `plan-template.md`: Constitution Check gate references all 9 principles
- `spec-template.md`: Functional requirements must align with principles
- `tasks-template.md`: Task phases respect Server-Side Authority and Data Integrity

**Enforcement**:

- All PRs must pass constitution checklist before merge
- CI pipeline enforces TypeScript strict mode and linting
- Database migrations reviewed for constraint coverage
- Performance budgets monitored in staging environment

---

**Version**: 1.1.0 | **Ratified**: 2025-12-24 | **Last Amended**: 2025-12-24
