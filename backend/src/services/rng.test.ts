/**
 * Test RNG Implementation
 * 
 * Uses a seeded pseudo-random number generator for deterministic testing.
 * Allows tests to reproduce specific scenarios (e.g., always draw a Legendary).
 * 
 * Reference: research.md section 2 - Test doubles for RNG
 */

import { BaseRNG } from './rng.interface';
import { RarityTier } from '../../../shared/types';

/**
 * Seeded PRNG implementation for testing
 * 
 * Uses a simple Linear Congruential Generator (LCG) algorithm
 * for reproducible random sequences.
 * 
 * NOT cryptographically secure - only for testing!
 */
export class TestRNG extends BaseRNG {
  private seed: number;
  private readonly a = 1664525;      // LCG multiplier
  private readonly c = 1013904223;   // LCG increment
  private readonly m = 2 ** 32;      // LCG modulus (2^32)

  constructor(seed: number = 12345) {
    super();
    this.seed = seed;
  }

  /**
   * Generate a deterministic random number in [0, 1)
   * Each call advances the internal seed state
   */
  random(): number {
    // LCG formula: seed = (a * seed + c) mod m
    this.seed = (this.a * this.seed + this.c) % this.m;
    
    // Normalize to [0, 1)
    return this.seed / this.m;
  }

  /**
   * Reset the RNG to a specific seed
   * Useful for test setup
   */
  reset(seed: number = 12345) {
    this.seed = seed;
  }
}

/**
 * Mock RNG that always returns a specific rarity
 * Useful for targeted testing scenarios
 */
export class MockRNG extends BaseRNG {
  constructor(private fixedRarity: RarityTier) {
    super();
  }

  random(): number {
    // Return a value that will always produce the desired rarity
    switch (this.fixedRarity) {
      case 'Common':
        return 0.25; // Within [0, 0.5)
      case 'Rare':
        return 0.65; // Within [0.5, 0.88)
      case 'Epic':
        return 0.90; // Within [0.88, 0.98)
      case 'Legendary':
        return 0.985; // Within [0.98, 0.9999)
      case 'Fabled':
        return 0.9999; // Within [0.9999, 1.0)
    }
  }

  /**
   * Change the fixed rarity for subsequent draws
   */
  setRarity(rarity: RarityTier) {
    this.fixedRarity = rarity;
  }
}

/**
 * Sequence RNG that returns predetermined values
 * Useful for testing edge cases and specific scenarios
 */
export class SequenceRNG extends BaseRNG {
  private index = 0;

  constructor(private sequence: number[]) {
    super();
    if (sequence.length === 0) {
      throw new Error('Sequence must not be empty');
    }
  }

  random(): number {
    const value = this.sequence[this.index % this.sequence.length];
    if (value === undefined) {
      throw new Error('Sequence access failed');
    }
    this.index++;
    return value;
  }

  /**
   * Reset to the beginning of the sequence
   */
  reset() {
    this.index = 0;
  }

  /**
   * Set a new sequence
   */
  setSequence(sequence: number[]) {
    if (sequence.length === 0) {
      throw new Error('Sequence must not be empty');
    }
    this.sequence = sequence;
    this.index = 0;
  }
}

/**
 * Helper functions for test RNG creation
 */

/**
 * Create a TestRNG configured to always draw a specific rarity
 */
export function createMockRNG(rarity: RarityTier): MockRNG {
  return new MockRNG(rarity);
}

/**
 * Create a TestRNG with a specific seed for reproducible tests
 */
export function createSeededRNG(seed: number): TestRNG {
  return new TestRNG(seed);
}

/**
 * Create a SequenceRNG that will draw specific rarities in order
 * 
 * Example:
 *   const rng = createRaritySequenceRNG(['Common', 'Rare', 'Legendary']);
 *   rng.drawRarity(); // Returns 'Common'
 *   rng.drawRarity(); // Returns 'Rare'
 *   rng.drawRarity(); // Returns 'Legendary'
 *   rng.drawRarity(); // Returns 'Common' (wraps around)
 */
export function createRaritySequenceRNG(rarities: RarityTier[]): SequenceRNG {
  const sequence = rarities.map((rarity) => {
    switch (rarity) {
      case 'Common':
        return 0.25;
      case 'Rare':
        return 0.65;
      case 'Epic':
        return 0.90;
      case 'Legendary':
        return 0.985;
      case 'Fabled':
        return 0.9999;
    }
  });

  return new SequenceRNG(sequence);
}
