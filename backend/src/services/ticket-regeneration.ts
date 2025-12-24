/**
 * Ticket Regeneration Service
 * 
 * Implements lazy regeneration pattern for ticket balance management.
 * Calculates tickets based on elapsed time without background jobs.
 * 
 * Reference: research.md section 6 - Lazy regeneration on request
 * Spec: FR-006a - One ticket every 2 hours when below maximum
 */

import { TicketBalance } from '../../../shared/types';
import { TICKET_CONFIG } from '../../../shared/constants';

/**
 * Result of ticket regeneration calculation
 */
export interface RegenerationResult {
  balance: TicketBalance;
  ticketsAdded: number;
  intervalsElapsed: number;
  nextRegenAt: Date;
}

/**
 * Calculate regenerated tickets based on elapsed time
 * 
 * Formula: min(max_tickets, current_tickets + floor((now - last_regen) / 2 hours))
 * 
 * @param balance - Current ticket balance
 * @param now - Current timestamp (defaults to Date.now(), injectable for testing)
 * @returns Updated balance with regenerated tickets
 */
export function regenerateTickets(
  balance: TicketBalance,
  now: Date = new Date()
): RegenerationResult {
  const lastRegenAt = new Date(balance.last_regen_at);
  const nowMs = now.getTime();
  const lastRegenMs = lastRegenAt.getTime();

  // Calculate elapsed time in milliseconds
  const elapsed = nowMs - lastRegenMs;

  // Calculate how many 2-hour intervals have passed
  const intervals = Math.floor(elapsed / TICKET_CONFIG.REGENERATION_INTERVAL_MS);

  // If no intervals have passed, no regeneration needed
  if (intervals === 0) {
    return {
      balance,
      ticketsAdded: 0,
      intervalsElapsed: 0,
      nextRegenAt: calculateNextRegeneration(lastRegenAt),
    };
  }

  // Calculate new ticket count (capped at max_tickets)
  const potentialTickets = balance.current_tickets + intervals;
  const newTickets = Math.min(balance.max_tickets, potentialTickets);
  const ticketsAdded = newTickets - balance.current_tickets;

  // Calculate new last_regen_at (advance by completed intervals)
  const newLastRegenMs = lastRegenMs + (intervals * TICKET_CONFIG.REGENERATION_INTERVAL_MS);
  const newLastRegenAt = new Date(newLastRegenMs);

  // Return updated balance
  const updatedBalance: TicketBalance = {
    ...balance,
    current_tickets: newTickets,
    last_regen_at: newLastRegenAt.toISOString(),
    updated_at: now.toISOString(),
  };

  return {
    balance: updatedBalance,
    ticketsAdded,
    intervalsElapsed: intervals,
    nextRegenAt: calculateNextRegeneration(newLastRegenAt),
  };
}

/**
 * Calculate when the next ticket will regenerate
 * 
 * @param lastRegenAt - Last regeneration timestamp
 * @returns Next regeneration time
 */
export function calculateNextRegeneration(lastRegenAt: Date | string): Date {
  const lastRegen = typeof lastRegenAt === 'string' ? new Date(lastRegenAt) : lastRegenAt;
  return new Date(lastRegen.getTime() + TICKET_CONFIG.REGENERATION_INTERVAL_MS);
}

/**
 * Check if tickets are eligible for regeneration
 * 
 * @param balance - Current ticket balance
 * @param now - Current timestamp
 * @returns true if at least one interval has elapsed
 */
export function canRegenerateTickets(
  balance: TicketBalance,
  now: Date = new Date()
): boolean {
  const lastRegenAt = new Date(balance.last_regen_at);
  const elapsed = now.getTime() - lastRegenAt.getTime();
  const intervals = Math.floor(elapsed / TICKET_CONFIG.REGENERATION_INTERVAL_MS);
  
  return intervals > 0 && balance.current_tickets < balance.max_tickets;
}

/**
 * Calculate time remaining until next regeneration
 * 
 * @param balance - Current ticket balance
 * @param now - Current timestamp
 * @returns Milliseconds until next ticket regenerates (0 if ready now)
 */
export function timeUntilNextRegeneration(
  balance: TicketBalance,
  now: Date = new Date()
): number {
  const nextRegen = calculateNextRegeneration(balance.last_regen_at);
  const remaining = nextRegen.getTime() - now.getTime();
  
  return Math.max(0, remaining);
}

/**
 * Format time remaining for display
 * 
 * @param ms - Milliseconds remaining
 * @returns Human-readable string (e.g., "1h 30m")
 */
export function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return 'Now';

  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((ms % (1000 * 60)) / 1000);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Create initial ticket balance for new user
 * 
 * @param userId - User UUID
 * @returns Initial ticket balance
 */
export function createInitialTicketBalance(userId: string): Omit<TicketBalance, 'id'> {
  const now = new Date().toISOString();
  
  return {
    user_id: userId,
    current_tickets: TICKET_CONFIG.STARTING_TICKETS,  // 5 tickets for new users
    max_tickets: TICKET_CONFIG.MAX_TICKETS,            // 10 ticket cap
    last_regen_at: now,
    created_at: now,
    updated_at: now,
  };
}

/**
 * Validate ticket balance constraints
 * 
 * @param balance - Ticket balance to validate
 * @throws Error if validation fails
 */
export function validateTicketBalance(balance: TicketBalance): void {
  if (balance.current_tickets < 0) {
    throw new Error('Ticket balance cannot be negative');
  }

  if (balance.current_tickets > balance.max_tickets) {
    throw new Error(`Ticket balance (${balance.current_tickets}) exceeds maximum (${balance.max_tickets})`);
  }

  if (balance.max_tickets !== TICKET_CONFIG.MAX_TICKETS) {
    throw new Error(`Invalid max_tickets: expected ${TICKET_CONFIG.MAX_TICKETS}, got ${balance.max_tickets}`);
  }

  const lastRegenAt = new Date(balance.last_regen_at);
  const now = new Date();
  
  if (lastRegenAt > now) {
    throw new Error('last_regen_at cannot be in the future');
  }
}
