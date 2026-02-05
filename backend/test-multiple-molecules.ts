// Test Indian Patents for Multiple Molecules

import { fetchRealPatents } from './src/services/realPatentFetcher';

async function testMultipleMolecules() {
  console.log('🧪 Testing Indian Patents for Multiple Molecules\n');
  console.log('='.repeat(80));
  
  const molecules = [
    { name: 'Semaglutide', generic: 'semaglutide', company: 'Novo Nordisk' },
    { name: 'Sitagliptin', generic: 'sitagliptin', company: 'Merck' },
    { name: 'Adalimumab', generic: 'adalimumab', company: 'AbbVie' },
    { name: 'Tiotropium', generic: 'tiotropium', company: 'Boehringer Ingelheim' },
    { name: 'Osimertinib', generic: 'osimertinib', company: 'AstraZeneca' }
  ];
  
  for (const mol of molecules) {
    console.log(`\n${'━'.repeat(80)}`);
    console.log(`📦 ${mol.name} (${mol.company})`);
    console.log('━'.repeat(80));
    
    const patents = await fetchRealPatents(mol.name, mol.generic, mol.company);
    
    const usPatents = patents.filter(p => p.country === 'US');
    const inPatents = patents.filter(p => p.country === 'IN');
    
    console.log(`\n📊 Total: ${patents.length} patents | 🇺🇸 US: ${usPatents.length} | 🇮🇳 India: ${inPatents.length}`);
    
    if (inPatents.length > 0) {
      console.log(`\n🇮🇳 Indian Patents:`);
      inPatents.forEach(p => {
        const statusIcon = p.status === 'Expired' ? '🔴' : '🟢';
        console.log(`  ${statusIcon} ${p.patentNumber} - ${p.patentType}`);
        console.log(`     Expires: ${p.expiryDate.toISOString().split('T')[0]} | Status: ${p.status}`);
        console.log(`     Title: ${p.title}`);
      });
    } else {
      console.log(`\n⚠️  No Indian patents in database for ${mol.name}`);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ Multi-molecule test complete!');
}

testMultipleMolecules().catch(console.error);
