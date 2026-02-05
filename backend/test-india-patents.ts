// Test Indian Patent Integration

import { fetchRealPatents, fetchIndiaPatents } from './src/services/realPatentFetcher';

async function testIndiaPatents() {
  console.log('🧪 Testing Indian Patent Integration\n');
  console.log('='.repeat(70));
  
  // Test 1: Direct Indian patent loader
  console.log('\n📋 Test 1: Loading Indian patents directly');
  console.log('-'.repeat(70));
  const indiaPatents = fetchIndiaPatents('Semaglutide');
  console.log(`Found ${indiaPatents.length} Indian patents for Semaglutide:`);
  indiaPatents.forEach(p => {
    console.log(`  • ${p.patentNumber} - ${p.patentType} - Expires: ${p.expiryDate.toISOString().split('T')[0]} - Status: ${p.status}`);
  });
  
  // Test 2: Combined US + India patents
  console.log('\n📋 Test 2: Fetching all patents (US + India)');
  console.log('-'.repeat(70));
  const allPatents = await fetchRealPatents('Semaglutide', 'semaglutide', 'Novo Nordisk');
  
  const usPatents = allPatents.filter(p => p.country === 'US');
  const inPatents = allPatents.filter(p => p.country === 'IN');
  
  console.log(`\n📊 Summary:`);
  console.log(`  Total patents: ${allPatents.length}`);
  console.log(`  🇺🇸 US patents: ${usPatents.length}`);
  console.log(`  🇮🇳 Indian patents: ${inPatents.length}`);
  
  console.log(`\n🇮🇳 Indian Patents:`);
  inPatents.forEach(p => {
    console.log(`  • ${p.patentNumber} - ${p.patentType}`);
    console.log(`    Expires: ${p.expiryDate.toISOString().split('T')[0]}`);
    console.log(`    Status: ${p.status}`);
    console.log(`    Title: ${p.title}`);
    console.log(`    Confidence: ${p.confidenceLevel} | Quality: ${p.dataQuality}`);
    console.log('');
  });
  
  console.log(`\n🇺🇸 US Patents (first 3):`);
  usPatents.slice(0, 3).forEach(p => {
    console.log(`  • ${p.patentNumber} - ${p.patentType} - Expires: ${p.expiryDate.toISOString().split('T')[0]}`);
  });
  
  console.log('\n✅ Indian patent integration test complete!');
  console.log('='.repeat(70));
}

testIndiaPatents().catch(console.error);
