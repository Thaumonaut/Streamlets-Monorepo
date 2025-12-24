/**
 * Cards API Routes
 * 
 * Endpoints for retrieving card information:
 * - GET /api/v1/cards - List all available cards (public)
 * - GET /api/v1/cards/:id - Get specific card details (public)
 * 
 * @see specs/001-twitch-emote-mvp/contracts/cards.md
 */

import { Hono } from 'hono';
import type { Env } from '../../index';
import { CardService } from '../../services/card.service';
import { createServiceRoleClient } from '../../db/client';
import { ValidationError } from '../../middleware/error';
import { isRarityTier } from '../../../../shared/types';

const cardsRouter = new Hono<{ Bindings: Env }>();

/**
 * GET /api/v1/cards
 * List all available cards with optional filtering
 * 
 * Query params:
 * - rarity: RarityTier (optional)
 * - page: number (default: 1)
 * - limit: number (default: 20, max: 100)
 * 
 * Response: CardListResponse with pagination
 */
cardsRouter.get('/', async (c) => {
  try {
    // Parse query parameters
    const rarity = c.req.query('rarity');
    const page = parseInt(c.req.query('page') || '1', 10);
    const limit = parseInt(c.req.query('limit') || '20', 10);

    // Validate rarity if provided
    if (rarity && !isRarityTier(rarity)) {
      throw new ValidationError(
        `Invalid rarity tier. Must be one of: Common, Rare, Epic, Legendary, Fabled`,
        {
          parameter: 'rarity',
          provided: rarity,
          allowed: ['Common', 'Rare', 'Epic', 'Legendary', 'Fabled'],
        }
      );
    }

    // Validate pagination parameters
    if (page < 1) {
      throw new ValidationError('Page must be >= 1', { parameter: 'page', provided: page });
    }

    if (limit < 1 || limit > 100) {
      throw new ValidationError('Limit must be between 1 and 100', {
        parameter: 'limit',
        provided: limit,
      });
    }

    // Get Supabase client
    const supabase = createServiceRoleClient(c.env);

    // Create service and fetch cards
    const cardService = new CardService(supabase);
    const result = await cardService.getCards({
      rarity: rarity as any,
      page,
      limit,
    });

    // Set cache headers (cards are immutable)
    c.header('Cache-Control', 'public, max-age=3600'); // 1 hour
    c.header('ETag', `cards-${rarity || 'all'}-${page}-${limit}`);

    return c.json(result);
  } catch (error) {
    throw error; // Let error middleware handle it
  }
});

/**
 * GET /api/v1/cards/:id
 * Get specific card details with statistics
 * 
 * Path params:
 * - id: Card UUID
 * 
 * Response: CardWithStats
 */
cardsRouter.get('/:id', async (c) => {
  try {
    const cardId = c.req.param('id');

    // Basic UUID validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(cardId)) {
      throw new ValidationError('Invalid card ID format', {
        parameter: 'id',
        provided: cardId,
        expected: 'UUID',
      });
    }

    // Get Supabase client
    const supabase = createServiceRoleClient(c.env);

    // Create service and fetch card
    const cardService = new CardService(supabase);
    const card = await cardService.getCardById(cardId);

    // Set cache headers
    c.header('Cache-Control', 'public, max-age=3600'); // 1 hour
    c.header('ETag', `card-${cardId}`);

    return c.json(card);
  } catch (error) {
    throw error; // Let error middleware handle it
  }
});

export default cardsRouter;
