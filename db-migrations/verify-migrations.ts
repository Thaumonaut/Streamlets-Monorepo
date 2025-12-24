#!/usr/bin/env tsx
/**
 * Verification script to check database migrations and seed data
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '../.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseSecretKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseSecretKey);

async function verifyMigrations() {
  console.log('=== Database Migration Verification ===\n');

  // Check tables exist
  const tables = ['users', 'cards', 'ticket_balances', 'user_collections', 'draw_transactions', 'rarity_distribution'];
  
  console.log('Checking tables...');
  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(1);
    
    if (error) {
      console.error(`  ❌ ${table}: ${error.message}`);
    } else {
      console.log(`  ✅ ${table}: OK`);
    }
  }

  // Check functions exist
  console.log('\nChecking functions...');
  const { data: drawCardResult, error: drawCardError } = await supabase.rpc('draw_card', {
    p_user_id: '00000000-0000-0000-0000-000000000000',
    p_drawn_rarity: 'Common'
  });
  
  if (drawCardError && drawCardError.message.includes('function')) {
    console.error(`  ❌ draw_card function: ${drawCardError.message}`);
  } else {
    console.log(`  ✅ draw_card function: OK`);
  }

  const { data: regenResult, error: regenError } = await supabase.rpc('regenerate_tickets', {
    p_user_id: '00000000-0000-0000-0000-000000000000'
  });
  
  if (regenError && regenError.message.includes('function')) {
    console.error(`  ❌ regenerate_tickets function: ${regenError.message}`);
  } else {
    console.log(`  ✅ regenerate_tickets function: OK`);
  }

  // Check seed data
  console.log('\nChecking seed data...');
  
  // Check rarity distribution
  const { data: rarityData, error: rarityError } = await supabase
    .from('rarity_distribution')
    .select('*');
  
  if (rarityError) {
    console.error(`  ❌ rarity_distribution: ${rarityError.message}`);
  } else {
    console.log(`  ✅ rarity_distribution: ${rarityData?.length || 0} row(s)`);
    if (rarityData && rarityData.length > 0) {
      console.log(`     Common: ${rarityData[0].common_weight}, Rare: ${rarityData[0].rare_weight}, Epic: ${rarityData[0].epic_weight}, Legendary: ${rarityData[0].legendary_weight}, Fabled: ${rarityData[0].fabled_weight}`);
    }
  }

  // Check cards
  const { data: cardsData, error: cardsError } = await supabase
    .from('cards')
    .select('rarity');
  
  if (cardsError) {
    console.error(`  ❌ cards: ${cardsError.message}`);
  } else {
    console.log(`  ✅ cards: ${cardsData?.length || 0} row(s)`);
    const rarityCounts: Record<string, number> = {};
    cardsData?.forEach(card => {
      rarityCounts[card.rarity] = (rarityCounts[card.rarity] || 0) + 1;
    });
    Object.entries(rarityCounts).forEach(([rarity, count]) => {
      console.log(`     ${rarity}: ${count} cards`);
    });
  }

  console.log('\n=== Verification Complete ===');
}

verifyMigrations().catch(error => {
  console.error('Fatal error during verification:', error);
  process.exit(1);
});
