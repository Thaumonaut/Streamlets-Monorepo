#!/usr/bin/env tsx
/**
 * Seed script to populate rarity distribution table
 * 
 * Usage: pnpm seed:rarity
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '../backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  console.error('Make sure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in backend/.env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seedRarityDistribution() {
  console.log('Seeding rarity distribution...');
  
  // Check if distribution already exists
  const { data: existingDistribution, error: checkError } = await supabase
    .from('rarity_distribution')
    .select('id')
    .limit(1);
    
  if (checkError) {
    console.error('Error checking existing distribution:', checkError);
    process.exit(1);
  }
  
  if (existingDistribution && existingDistribution.length > 0) {
    console.log('Rarity distribution already exists. Skipping seed.');
    return;
  }
  
  // Insert default distribution (from spec FR-006)
  const { error } = await supabase
    .from('rarity_distribution')
    .insert({
      common_weight: 0.5000,      // 50%
      rare_weight: 0.3800,        // 38%
      epic_weight: 0.1000,        // 10%
      legendary_weight: 0.0199,   // 1.99%
      fabled_weight: 0.0001,      // 0.01%
    });
    
  if (error) {
    console.error('Error inserting rarity distribution:', error);
    process.exit(1);
  }
  
  console.log('✅ Rarity distribution seeded successfully!');
  console.log('Distribution: Common 50%, Rare 38%, Epic 10%, Legendary 1.99%, Fabled 0.01%');
}

seedRarityDistribution().catch(error => {
  console.error('Fatal error during seed:', error);
  process.exit(1);
});
