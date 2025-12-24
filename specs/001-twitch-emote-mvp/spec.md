# Feature Specification: Twitch Emote MVP

**Feature Branch**: `001-twitch-emote-mvp`  
**Created**: 2025-12-24  
**Status**: Draft  
**Input**: User description: "I want to create an mvp using the twitch common emotes as a base for all common and rares. I also want to get the app running on twitch as soon as possible for testing."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View and Collect Twitch Emote Cards (Priority: P1)

A viewer opens the Twitch extension and sees a collection of cards based on Twitch's standard emotes (like Kappa, PogChamp, LUL, etc.). They can view their current collection, see which cards they own, and understand which cards are available to collect.

**Why this priority**: This is the absolute minimum viable product. Without viewable cards and a basic collection interface, there is no product to test. This delivers immediate value by allowing viewers to see the core concept.

**Independent Test**: Can be fully tested by opening the extension and verifying that emote-based cards are displayed with clear visual distinction between owned and unowned cards. Delivers standalone value of "I can see what Streamlets is about."

**Acceptance Scenarios**:

1. **Given** a viewer opens the Twitch extension for the first time, **When** they navigate to the collection view, **Then** they see a grid/list of cards based on Twitch common emotes
2. **Given** a viewer has cards in their collection, **When** they view their collection, **Then** owned cards are visually distinct from unowned cards (grayed out, locked icon, or similar)
3. **Given** a viewer clicks on a card, **When** the card details open, **Then** they see the emote artwork, card name, rarity tier (Common/Rare/Epic/Legendary/Fabled), and ownership status
4. **Given** a viewer has no cards yet, **When** they first open the extension, **Then** they see helpful onboarding text explaining how to collect cards

---

### User Story 2 - Draw Cards from Emote Pool (Priority: P1)

A viewer can use an available ticket/energy to draw a card from the pool of Twitch emote cards. The draw mechanism provides a random card from the available pool, respecting rarity tiers (Common vs Rare).

**Why this priority**: Card drawing is the core mechanic. Without it, viewers cannot collect cards, making the extension non-functional. This is essential for testing the engagement loop.

**Independent Test**: Can be tested by providing a viewer with tickets and verifying they can draw cards that are added to their collection. Delivers the core value proposition: "I can collect cards."

**Acceptance Scenarios**:

1. **Given** a viewer has at least one available ticket, **When** they initiate a card draw, **Then** the system randomly selects a card respecting rarity distribution and adds it to their collection
2. **Given** a viewer draws a card, **When** the draw completes, **Then** they see the result displayed prominently with card artwork and rarity tier
3. **Given** a viewer draws a duplicate card, **When** the draw completes, **Then** the card is added to their collection (cards accumulate and can be used for multiple purposes including upgrading power level, crafting, and other future features)
4. **Given** a viewer has zero tickets, **When** they attempt to draw, **Then** the draw button is disabled with clear messaging about when tickets regenerate
5. **Given** a viewer draws a card, **When** the transaction completes, **Then** their ticket count decreases by one

---

### User Story 3 - Ticket Regeneration System (Priority: P1)

Viewers receive tickets on a time-based schedule, allowing them to draw cards without requiring continuous watching. The system tracks when tickets were last granted and regenerates them at defined intervals.

**Why this priority**: Without ticket regeneration, viewers can only draw once and then the game stops. This enables sustained engagement testing and allows viewers to return periodically.

**Independent Test**: Can be tested by depleting tickets, waiting for regeneration period, and verifying tickets are restored. Delivers the retention mechanism: "I have a reason to come back."

**Acceptance Scenarios**:

1. **Given** a viewer's ticket count is below the maximum, **When** 2 hours pass since the last ticket regeneration, **Then** they receive one additional ticket (up to the maximum cap)
2. **Given** a viewer checks their ticket count, **When** they view the interface, **Then** they see their current ticket count and time remaining until the next 2-hour regeneration interval completes
3. **Given** a viewer has 10 tickets (maximum), **When** the regeneration interval passes, **Then** no additional tickets are granted (cap is enforced)
4. **Given** a new viewer joins, **When** they first activate the extension, **Then** they start with 5 draw tickets

---

### User Story 4 - Twitch Extension Deployment (Priority: P2)

The extension is deployed to Twitch's extension platform and accessible to viewers on participating channels. The deployment supports both overlay and panel placement options.

**Why this priority**: This is required to test the product with real Twitch viewers, but can be done after core mechanics are working locally. Getting it live enables user feedback.

**Independent Test**: Can be tested by installing the extension on a test Twitch channel and verifying it loads correctly in overlay/panel positions. Delivers: "Real users can access this."

**Acceptance Scenarios**:

1. **Given** a streamer installs the extension, **When** they configure it for their channel, **Then** viewers see the extension in the designated position (overlay or panel)
2. **Given** the extension is installed, **When** a viewer opens it, **Then** it loads within 2 seconds with all core functionality available
3. **Given** the extension is running, **When** a viewer interacts with it, **Then** all actions (viewing cards, drawing, etc.) work as expected in the live Twitch environment
4. **Given** multiple viewers are watching, **When** they each use the extension, **Then** their collections and tickets are isolated per user (no cross-contamination)

---

### User Story 5 - Progress Visibility and Stats (Priority: P3)

Viewers can see their collection progress, including total cards collected, completion percentage, and collection milestones. This provides feedback on their progress and encourages continued collection.

**Why this priority**: Enhances engagement but is not required for basic functionality. Can be added after core mechanics are proven to work.

**Independent Test**: Can be tested by collecting various numbers of cards and verifying stats update correctly. Delivers: "I can see my progress."

**Acceptance Scenarios**:

1. **Given** a viewer owns some cards, **When** they view their collection stats, **Then** they see total cards owned, total available, and completion percentage
2. **Given** a viewer completes a rarity tier (owns all cards of a specific rarity), **When** they check their stats, **Then** they see a completion badge or indicator for that tier
3. **Given** a viewer draws their first card, **When** the draw completes, **Then** their stats increment immediately

---

### Edge Cases

- What happens when a viewer draws a card but loses connection during the transaction? (System must guarantee atomic transaction - card is either granted or draw is refunded)
- How does the system handle viewers with no starting tickets attempting to draw? (Draw button must be disabled with clear messaging)
- What happens when Twitch's available emotes change over time? (Card pool should be immutable for MVP - changes are out of scope)
- How does the system handle clock skew or time manipulation for ticket regeneration? (Server time must be authoritative)
- What happens if a viewer tries to access the extension while backend is unavailable? (Graceful error message with retry option)
- How does duplicate detection work if the same card is drawn multiple times in quick succession? (Server-side transaction log prevents race conditions)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST generate cards based on all Twitch global emote artwork
- **FR-002**: System MUST classify cards into five rarity tiers based on emote usage frequency: Common, Rare, Epic, Legendary, and Fabled (less frequently used emotes = Common rarity, more frequently used emotes = higher rarity tiers)
- **FR-003**: System MUST assign each viewer a persistent collection that tracks which cards they own
- **FR-004**: System MUST provide viewers with a ticket-based resource that regenerates over time
- **FR-005**: System MUST enforce server-side draw mechanics where card selection happens on backend (client cannot manipulate results)
- **FR-006**: System MUST respect rarity distribution during draws (Common: 50%, Rare: 38%, Epic: 10%, Legendary: 1.99%, Fabled: 0.01%)
- **FR-006a**: System MUST regenerate one ticket every 2 hours when viewer ticket count is below maximum
- **FR-006b**: System MUST cap ticket accumulation at 10 tickets maximum
- **FR-007**: System MUST display viewer's current ticket count and time until next ticket regenerates (2-hour intervals)
- **FR-008**: System MUST display viewer's collection with visual distinction between owned and unowned cards
- **FR-009**: System MUST persist all viewer data (collection state, ticket count, last regeneration time) across sessions
- **FR-010**: System MUST authenticate viewers using Twitch Extension JWT to ensure user identity
- **FR-011**: System MUST allow duplicate cards to accumulate in viewer collections (cards can be used for upgrading power level, crafting, and other future features)
- **FR-012**: System MUST enforce ticket consumption (one ticket per draw)
- **FR-013**: System MUST cap ticket accumulation at a maximum value to prevent unlimited hoarding
- **FR-014**: System MUST track all card acquisition events for economy balancing and analytics
- **FR-015**: System MUST deploy as a Twitch Extension accessible in both overlay and panel positions
- **FR-016**: System MUST provide a companion website with global leaderboard and streamer backend management functionality

### Key Entities

- **Card**: Represents a collectible based on a Twitch global emote. Attributes include unique identifier, emote reference, rarity tier (assigned based on emote usage frequency), artwork reference, display name. Cards are immutable templates that viewers collect instances of.

- **User Collection**: Represents a viewer's owned cards. Attributes include viewer identifier (Twitch ID), list of owned card instances, acquisition timestamps. Tracks which cards the viewer has obtained.

- **Ticket Balance**: Represents a viewer's available draw resources. Attributes include current ticket count (max: 10 tickets), maximum ticket cap, last regeneration timestamp, regeneration interval (2 hours). Controls draw frequency.

- **Draw Transaction**: Represents a single card draw event. Attributes include viewer identifier, timestamp, ticket cost, card awarded, rarity rolled, transaction ID. Provides audit trail for economy monitoring.

- **Rarity Distribution**: Defines probability weights for card draws. Attributes include rarity tier, probability weight (Common: 50%, Rare: 38%, Epic: 10%, Legendary: 1.99%, Fabled: 0.01%). Used by server-side RNG for fair draws.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: MVP must be deployed to Twitch Extension platform and installable on test channels within the first development iteration
- **SC-002**: Viewers can complete their first card draw within 30 seconds of opening the extension (including initial onboarding)
- **SC-003**: System handles 100 concurrent viewers on a single channel drawing cards without response time degradation beyond 2 seconds per draw
- **SC-004**: 90% of draw transactions complete successfully without errors (10% tolerance for network issues)
- **SC-005**: Ticket regeneration occurs within 30 seconds of scheduled time (server clock synchronization tolerance)
- **SC-006**: Viewers can distinguish between owned and unowned cards at a glance (visual design passes basic usability test)
- **SC-007**: Collection data persists correctly across browser sessions (100% accuracy for stored data)
- **SC-008**: All Twitch global emotes are available as collectible cards in the initial pool
- **SC-009**: Card rarity distribution matches configured probabilities across 1000 test draws (within 5% margin): Common 50%, Rare 38%, Epic 10%, Legendary 1.99%, Fabled 0.01%
- **SC-010**: Extension loads on Twitch within 3 seconds on standard broadband connection (p95)

## Technical Architecture *(mandatory)*

### Technology Stack

**Backend**:
- **Framework**: Hono (lightweight web framework)
- **Database**: Supabase (PostgreSQL-based backend-as-a-service)
- **Deployment/Hosting**: Cloudflare (edge deployment and CDN)

**Frontend - Twitch Extension**:
- **Framework**: React
- **Build Type**: Static build (optimized for Twitch Extension hosting)
- **Purpose**: Primary viewer entry point for card viewing, drawing, and collection management

**Frontend - Companion Website**:
- **Framework**: React
- **Build Type**: Dynamic/server-rendered
- **Purpose**: Global leaderboard display and streamer backend management interface
- **Features**: Cross-channel statistics, streamer configuration panel

### Integration Points

- **Twitch Extension API**: JWT authentication, viewer identity, channel context
- **Twitch API**: Emote metadata retrieval, usage statistics (for rarity assignment)
- **Backend API**: RESTful endpoints for card draws, collection queries, ticket management

## Clarifications

### Session 2025-12-24

- Q: What should be the ticket regeneration interval for the MVP? → A: 2 hours
- Q: What should be the maximum ticket cap (the limit on how many tickets viewers can accumulate)? → A: 10 tickets
- Q: Which specific Twitch emotes should be included in the MVP card pool? → A: Use all Twitch global emotes, with rarity based on usage frequency (less used = Common, more used = higher rarity)
- Q: How many rarity tiers should be defined, and what should their draw probability distribution be? → A: 5 tiers - Common (50%), Rare (38%), Epic (10%), Legendary (1.99%), Fabled (0.01%)
- Q: What technology stack should be used for the Twitch Extension MVP? → A: Backend uses Hono framework; Two React frontends: (1) Static build for Twitch Extension (viewer entry point), (2) Dynamic website for global leaderboard and streamer backend page
- Q: Database and hosting infrastructure → A: Supabase for database (PostgreSQL), Cloudflare for deployment and edge hosting
