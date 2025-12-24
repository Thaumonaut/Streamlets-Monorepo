#!/usr/bin/env tsx
/**
 * Seed script to fetch Twitch global emotes and insert into database
 * 
 * Usage: pnpm seed:emotes
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

// Mock data for development (since we don't have Twitch API credentials)
// In production, this would fetch from Twitch API
const mockGlobalEmotes = [
  { id: '25', name: 'Kappa', images: { url_1x: 'https://static-cdn.jtvnw.net/emoticons/v2/25/static/light/1.0' } },
  { id: '30', name: 'PogChamp', images: { url_1x: 'https://static-cdn.jtvnw.net/emoticons/v2/30/static/light/1.0' } },
  { id: '33', name: 'LUL', images: { url_1x: 'https://static-cdn.jtvnw.net/emoticons/v2/33/static/light/1.0' } },
  { id: '36', name: 'TriHard', images: { url_1x: 'https://static-cdn.jtvnw.net/emoticons/v2/36/static/light/1.0' } },
  { id: '40', name: 'BibleThump', images: { url_1x: 'https://static-cdn.jtvnw.net/emoticons/v2/40/static/light/1.0' } },
  { id: '41', name: '4Head', images: { url_1x: 'https://static-cdn.jtvnw.net/emoticons/v2/41/static/light/1.0' } },
  { id: '45', name: 'Kreygasm', images: { url_1x: 'https://static-cdn.jtvnw.net/emoticons/v2/45/static/light/1.0' } },
  { id: '46', name: 'ResidentSleeper', images: { url_1x: 'https://static-cdn.jtvnw.net/emoticons/v2/46/static/light/1.0' } },
  { id: '47', name: 'DansGame', images: { url_1x: 'https://static-cdn.jtvnw.net/emoticons/v2/47/static/light/1.0' } },
  { id: '49', name: 'EleGiggle', images: { url_1x: 'https://static-cdn.jtvnw.net/emoticons/v2/49/static/light/1.0' } },
  { id: '52', name: 'FailFish', images: { url_1x: 'https://static-cdn.jtvnw.net/emoticons/v2/52/static/light/1.0' } },
  { id: '53', name: 'NotLikeThis', images: { url_1x: 'https://static-cdn.jtvnw.net/emoticons/v2/53/static/light/1.0' } },
  { id: '55', name: 'SeemsGood', images: { url_1x: 'https://static-cdn.jtvnw.net/emoticons/v2/55/static/light/1.0' } },
  { id: '57', name: 'WutFace', images: { url_1x: 'https://static-cdn.jtvnw.net/emoticons/v2/57/static/light/1.0' } },
  { id: '60', name: 'VoHiYo', images: { url_1x: 'https://static-cdn.jtvnw.net/emoticons/v2/60/static/light/1.0' } },
  { id: '61', name: 'PogBones', images: { url_1x: 'https://static-cdn.jtvnw.net/emoticons/v2/61/static/light/1.0' } },
  { id: '64', name: 'PJSalt', images: { url_1x: 'https://static-cdn.jtvnw.net/emoticons/v2/64/static/light/1.0' } },
  { id: '65', name: 'KappaPride', images: { url_1x: 'https://static-cdn.jtvnw.net/emoticons/v2/65/static/light/1.0' } },
  { id: '66', name: 'Keepo', images: { url_1x: 'https://static-cdn.jtvnw.net/emoticons/v2/66/static/light/1.0' } },
  { id: '69', name: 'FrankerZ', images: { url_1x: 'https://static-cdn.jtvnw.net/emoticons/v2/69/static/light/1.0' } },
];

// Manual rarity mapping (based on community knowledge)
const rarityMap: Record<string, 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Fabled'> = {
  'Kappa': 'Legendary',
  'PogChamp': 'Legendary',
  'LUL': 'Epic',
  'TriHard': 'Rare',
  'BibleThump': 'Rare',
  '4Head': 'Common',
  'Kreygasm': 'Epic',
  'ResidentSleeper': 'Common',
  'DansGame': 'Common',
  'EleGiggle': 'Common',
  'FailFish': 'Common',
  'NotLikeThis': 'Common',
  'SeemsGood': 'Common',
  'WutFace': 'Common',
  'VoHiYo': 'Common',
  'PogBones': 'Common',
  'PJSalt': 'Common',
  'KappaPride': 'Rare',
  'Keepo': 'Common',
  'FrankerZ': 'Common',
};

async function seedEmotes() {
  console.log('Starting emote seed...');
  
  // Check if cards already exist
  const { data: existingCards, error: checkError } = await supabase
    .from('cards')
    .select('emote_id')
    .limit(1);
    
  if (checkError) {
    console.error('Error checking existing cards:', checkError);
    process.exit(1);
  }
  
  if (existingCards && existingCards.length > 0) {
    console.log('Cards already exist in database. Skipping seed.');
    return;
  }
  
  const cardsToInsert = mockGlobalEmotes.map(emote => {
    const rarity = rarityMap[emote.name] || 'Common';
    return {
      emote_id: emote.id,
      emote_name: emote.name,
      emote_cdn_url: emote.images.url_1x,
      rarity,
    };
  });
  
  console.log(`Inserting ${cardsToInsert.length} cards...`);
  
  // Insert in batches of 10
  const batchSize = 10;
  for (let i = 0; i < cardsToInsert.length; i += batchSize) {
    const batch = cardsToInsert.slice(i, i + batchSize);
    const { error } = await supabase
      .from('cards')
      .insert(batch);
      
    if (error) {
      console.error(`Error inserting batch ${i / batchSize + 1}:`, error);
      process.exit(1);
    }
    
    console.log(`Inserted batch ${i / batchSize + 1} of ${Math.ceil(cardsToInsert.length / batchSize)}`);
  }
  
  // Count by rarity
  const { data: rarityCounts, error: countError } = await supabase
    .from('cards')
    .select('rarity')
    .then(result => {
      if (result.error) throw result.error;
      const counts: Record<string, number> = {};
      result.data?.forEach(card => {
        counts[card.rarity] = (counts[card.rarity] || 0) + 1;
      });
      return { data: counts, error: null };
    });
    
  if (countError) {
    console.error('Error counting rarities:', countError);
  } else {
    console.log('Rarity distribution:');
    Object.entries(rarityCounts || {}).forEach(([rarity, count]) => {
      console.log(`  ${rarity}: ${count} cards`);
    });
  }
  
  console.log('✅ Emote seed completed successfully!');
}

seedEmotes().catch(error => {
  console.error('Fatal error during seed:', error);
  process.exit(1);
});
