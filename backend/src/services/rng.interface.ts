/**
 * RNG Service Interface
 * 
 * Abstraction for random number generation in card draws.
 * Allows for production CSPRNG and test seeded PRNG implementations.
 * 
 * Reference: research.md section 2 - RNG Implementation
 */

import { RarityTier } from '../../../shared/types';
import { Card } from '../../../shared/types';

/**
 * Random Number Generator service interface
 * 
 * Implementations:
 * - ProductionRNG: Uses crypto.getRandomValues() for secure randomness
 * - TestRNG: Uses seeded PRNG for deterministic testing
 */
export interface RNGService {
  /**
   * Generate a random number in the range [0, 1)
   * Used for rarity tier selection
   */
  random(): number;

  /**
   * Determine rarity tier based on configured distribution
   * Uses cumulative probability distribution from shared/constants.ts
   * 
   * @returns The selected rarity tier
   */
  drawRarity(): RarityTier;

  /**
   * Select a random card from a pool of cards
   * Used for selecting a specific card within a rarity tier
   * 
   * @param pool - Array of cards to select from
   * @returns A randomly selected card from the pool
   * @throws Error if pool is empty
   */
  selectCard<T extends Card>(pool: T[]): T;

  /**
   * Generate a random integer in the range [min, max] (inclusive)
   * Utility method for various random selections
   */
  randomInt(min: number, max: number): number;
}

/**
 * Rarity distribution configuration
 * Loaded from database or constants
 */
export interface RarityDistribution {
  Common: number;      // 0.5000 (50%)
  Rare: number;        // 0.3800 (38%)
  Epic: number;        // 0.1000 (10%)
  Legendary: number;   // 0.0199 (1.99%)
  Fabled: number;      // 0.0001 (0.01%)
}

/**
 * Base RNG implementation with shared utility methods
 */
export abstract class BaseRNG implements RNGService {
  /**
   * Abstract method - must be implemented by subclasses
   */
  abstract random(): number;

  /**
   * Draw a rarity tier using cumulative probability distribution
   */
  drawRarity(): RarityTier {
    const rand = this.random();

    // Cumulative probabilities (from shared/constants.ts)
    if (rand < 0.5000) return 'Common';      // 50%
    if (rand < 0.8800) return 'Rare';        // 38%
    if (rand < 0.9800) return 'Epic';        // 10%
    if (rand < 0.9999) return 'Legendary';   // 1.99%
    return 'Fabled';                         // 0.01%
  }

  /**
   * Select a random card from a pool
   */
  selectCard<T extends Card>(pool: T[]): T {
    if (pool.length === 0) {
      throw new Error('Cannot select card from empty pool');
    }

    const index = this.randomInt(0, pool.length - 1);
    const card = pool[index];
    if (!card) {
      throw new Error('Card selection failed - invalid index');
    }
    return card;
  }

  /**
   * Generate random integer in range [min, max] inclusive
   */
  randomInt(min: number, max: number): number {
    if (min > max) {
      throw new Error(`Invalid range: min (${min}) > max (${max})`);
    }

    const range = max - min + 1;
    return Math.floor(this.random() * range) + min;
  }
}
