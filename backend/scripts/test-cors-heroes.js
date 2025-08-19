const axios = require('axios');

async function testCorsAndHeroes() {
  try {
    console.log('🧪 Testing hero data transformation...');
    
    // Test the same API call as the frontend
    const response = await axios.get('https://omeda.city/heroes.json');
    const heroesData = response.data;
    
    console.log(`✅ API Success: ${heroesData.length} heroes loaded`);
    
    // Transform exactly like the frontend does
    const transformedHeroes = heroesData.map(hero => ({
      id: hero.name.toLowerCase(),
      name: hero.display_name || hero.name,
      role: hero.roles?.[0] || 'Unknown',
      image: `https://omeda.city${hero.image}`,
      omedaId: hero.id,
      classes: hero.classes || [],
      roles: hero.roles || []
    }));
    
    console.log('\n🎯 Transformation Results:');
    console.log(`Transformed ${transformedHeroes.length} heroes`);
    
    // Show sample transformed heroes
    console.log('\nSample heroes:');
    transformedHeroes.slice(0, 5).forEach(hero => {
      console.log(`  ${hero.name} (${hero.role}): ${hero.image}`);
    });
    
    // Test image URL accessibility
    console.log('\n🖼️  Testing image URL accessibility...');
    const sampleHero = transformedHeroes[0];
    
    try {
      const imageResponse = await axios.head(sampleHero.image);
      console.log(`✅ Image accessible: ${sampleHero.image}`);
      console.log(`   Content-Type: ${imageResponse.headers['content-type']}`);
    } catch (imageError) {
      console.log(`❌ Image not accessible: ${sampleHero.image}`);
      console.log(`   Error: ${imageError.message}`);
    }
    
    // Check for CORS headers
    console.log('\n🌐 CORS Headers Check:');
    const corsHeaders = [
      'access-control-allow-origin',
      'access-control-allow-methods',
      'access-control-allow-headers'
    ];
    
    corsHeaders.forEach(header => {
      const value = response.headers[header];
      console.log(`${header}: ${value || 'NOT SET'}`);
    });
    
    if (!response.headers['access-control-allow-origin']) {
      console.log('\n⚠️  CORS Issue Detected:');
      console.log('The Omeda.city API does not set CORS headers.');
      console.log('This will cause the frontend fetch to fail in browsers.');
      console.log('\n🔧 Solutions:');
      console.log('1. Use a CORS proxy');
      console.log('2. Fetch heroes from backend and serve to frontend');
      console.log('3. Use a different hero data source');
    }
    
  } catch (error) {
    console.error('❌ Error testing heroes:', error.message);
    if (error.code === 'ENOTFOUND') {
      console.log('DNS resolution failed - check internet connectivity');
    }
  }
  process.exit(0);
}

testCorsAndHeroes();