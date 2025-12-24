/**
 * Production RNG Implementation
 * 
 * Uses Cloudflare Workers crypto.getRandomValues() for cryptographically
 * secure random number generation.
 * 
 * Reference: research.md section 2 - Hybrid RNG approach
 * Constitution Principle VIII: Algorithmic-Only Production (CSPRNG is deterministic)
 */

import { BaseRNG } from './rng.interface';

/**
 * Production RNG using Cloudflare Workers crypto API
 * 
 * This implementation uses crypto.getRandomValues() which is a CSPRNG
 * (Cryptographically Secure Pseudo-Random Number Generator).
 * 
 * While the output is unpredictable, the algorithm itself is deterministic
 * and satisfies Constitution Principle VIII (no ML/AI).
 */
export class ProductionRNG extends BaseRNG {
  /**
   * Generate a cryptographically secure random number in [0, 1)
   * 
   * Uses crypto.getRandomValues() to fill a Uint32Array with random bits,
   * then normalizes to [0, 1) range.
   */
  random(): number {
    // Get 32 bits of random data
    const randomBuffer = new Uint32Array(1);
    crypto.getRandomValues(randomBuffer);
    
    // Normalize to [0, 1) by dividing by max uint32 value + 1
    // Max uint32: 0xFFFFFFFF (4,294,967,295)
    const randomValue = randomBuffer[0];
    if (randomValue === undefined) {
      throw new Error('Failed to generate random value');
    }
    
    // Divide by 2^32 to get value in [0, 1)
    return randomValue / (0xFFFFFFFF + 1);
  }
}

/**
 * Singleton instance for production use
 * Reuse across requests for consistency
 */
let productionRNGInstance: ProductionRNG | null = null;

export function getProductionRNG(): ProductionRNG {
  if (!productionRNGInstance) {
    productionRNGInstance = new ProductionRNG();
  }
  return productionRNGInstance;
}
