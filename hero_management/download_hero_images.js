#!/usr/bin/env node

/**
 * Hero Image Downloader
 * Downloads hero images from Omeda City API and saves them locally
 * 
 * Usage:
 * node download_hero_images.js [--update-all] [--hero-name]
 */

const fs = require('fs').promises;
const https = require('https');
const path = require('path');

// Configuration
const API_URL = 'https://omeda.city/heroes.json';
const IMAGES_DIR = path.join(__dirname, '..', 'phoenix_draft', 'priv', 'static', 'images', 'heroes');
const TEMP_DIR = path.join(__dirname, 'temp_images');

// Role mapping to match Phoenix app
const ROLE_MAPPING = {
  'Carry': 'Carry',
  'Support': 'Support', 
  'Midlane': 'Midlane',
  'Offlane': 'Offlane',
  'Jungle': 'Jungle'
};

/**
 * Download a file from URL to local path
 */
function downloadFile(url, localPath) {
  return new Promise((resolve, reject) => {
    const file = require('fs').createWriteStream(localPath);
    
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      } else {
        reject(new Error(`HTTP ${response.statusCode}: ${url}`));
      }
    }).on('error', reject);
  });
}

/**
 * Generate hero ID from display name (matches Phoenix logic)
 */
function generateHeroId(displayName) {
  return displayName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Fetch hero data from Omeda City API
 */
async function fetchHeroData() {
  console.log('Fetching hero data from Omeda City API...');
  
  return new Promise((resolve, reject) => {
    https.get(API_URL, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        try {
          const heroes = JSON.parse(data);
          console.log(`Found ${heroes.length} heroes in API`);
          resolve(heroes);
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', reject);
  });
}

/**
 * Process heroes data to match our format
 */
function processHeroes(heroesData) {
  return heroesData.map(hero => {
    const validRoles = hero.roles.filter(role => ROLE_MAPPING[role]);
    const combinedRoles = validRoles.map(role => ROLE_MAPPING[role]).join('/');
    const heroId = generateHeroId(hero.display_name);
    
    return {
      id: heroId,
      name: hero.display_name,
      role: combinedRoles,
      image: hero.image,
      api_url: `https://omeda.city${hero.image}`
    };
  }).filter(hero => hero.role !== '');
}

/**
 * Download hero images
 */
async function downloadHeroImages(heroes, options = {}) {
  // Create directories if they don't exist
  await fs.mkdir(IMAGES_DIR, { recursive: true });
  await fs.mkdir(TEMP_DIR, { recursive: true });
  
  console.log(`Starting download of ${heroes.length} hero images...`);
  
  let downloaded = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const hero of heroes) {
    const localPath = path.join(IMAGES_DIR, `${hero.id}.jpg`);
    const tempPath = path.join(TEMP_DIR, `${hero.id}.jpg`);
    
    try {
      // Check if file exists and we're not updating all
      if (!options.updateAll) {
        try {
          await fs.access(localPath);
          console.log(`⏭️  Skipping ${hero.name} (${hero.id}.jpg) - already exists`);
          skipped++;
          continue;
        } catch (err) {
          // File doesn't exist, continue with download
        }
      }
      
      // Filter by specific hero if specified
      if (options.heroName && !hero.name.toLowerCase().includes(options.heroName.toLowerCase())) {
        continue;
      }
      
      console.log(`📥 Downloading ${hero.name} (${hero.id}.jpg)...`);
      
      // Download to temp first
      await downloadFile(hero.api_url, tempPath);
      
      // Move to final location
      await fs.rename(tempPath, localPath);
      
      console.log(`✅ Downloaded ${hero.name}`);
      downloaded++;
      
    } catch (error) {
      console.error(`❌ Failed to download ${hero.name}: ${error.message}`);
      errors++;
    }
  }
  
  // Clean up temp directory
  try {
    await fs.rmdir(TEMP_DIR, { recursive: true });
  } catch (err) {
    // Ignore cleanup errors
  }
  
  console.log('\n📊 Download Summary:');
  console.log(`✅ Downloaded: ${downloaded}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log(`❌ Errors: ${errors}`);
  console.log(`📁 Images saved to: ${IMAGES_DIR}`);
}

/**
 * Generate hero list for reference
 */
async function generateHeroList(heroes) {
  const listPath = path.join(__dirname, 'hero_list.json');
  const heroList = heroes.map(hero => ({
    id: hero.id,
    name: hero.name,
    roles: hero.role,
    filename: `${hero.id}.jpg`
  }));
  
  await fs.writeFile(listPath, JSON.stringify(heroList, null, 2));
  console.log(`📝 Hero list saved to: ${listPath}`);
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const options = {
    updateAll: args.includes('--update-all'),
    heroName: args.find(arg => arg.startsWith('--hero='))?.replace('--hero=', '')
  };
  
  console.log('🎮 Predecessor Hero Image Downloader');
  console.log('=====================================');
  
  if (options.updateAll) {
    console.log('🔄 Update all mode: Will re-download existing images');
  }
  
  if (options.heroName) {
    console.log(`🔍 Filtering for hero: ${options.heroName}`);
  }
  
  try {
    // Fetch hero data
    const heroesData = await fetchHeroData();
    
    // Process heroes
    const heroes = processHeroes(heroesData);
    
    // Download images
    await downloadHeroImages(heroes, options);
    
    // Generate hero list
    await generateHeroList(heroes);
    
    console.log('\n🎉 All done!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}