// Quick seed for respiratory molecules with Indian patents
import { PrismaClient } from '@prisma/client';
import { fetchRealPatents } from './src/services/realPatentFetcher';

const prisma = new PrismaClient();

const RESPIRATORY_MOLECULES = [
  { name: 'Tiotropium', generic: 'tiotropium', brand: 'Spiriva', company: 'Boehringer Ingelheim' },
  { name: 'Umeclidinium', generic: 'umeclidinium', brand: 'Incruse Ellipta', company: 'GlaxoSmithKline' },
  { name: 'Indacaterol', generic: 'indacaterol', brand: 'Arcapta', company: 'Novartis' },
  { name: 'Roflumilast', generic: 'roflumilast', brand: 'Daliresp', company: 'AstraZeneca' }
];

async function quickSeed() {
  console.log('🚀 Quick seeding respiratory molecules with Indian patents...\n');
  
  for (const mol of RESPIRATORY_MOLECULES) {
    console.log(`\n📦 Seeding ${mol.name}...`);
    
    // Create molecule
    const molecule = await prisma.molecule.create({
      data: {
        name: mol.name,
        genericName: mol.generic,
        brandName: mol.brand,
        innovatorCompany: mol.company,
        indication: 'COPD',
        modality: 'small-molecule',
        launchYear: 2010
      }
    });
    
    console.log(`   ✅ Created molecule: ${molecule.name}`);
    
    // Fetch and create patents
    const patents = await fetchRealPatents(mol.name, mol.generic, mol.company);
    console.log(`   📋 Found ${patents.length} patents (US + IN)`);
    
    for (const p of patents) {
      await prisma.patent.create({
        data: {
          molecule: molecule.name,
          patentNumber: p.patentNumber,
          patentType: p.patentType,
          country: p.country,
          filingDate: p.filingDate,
          expiryDate: p.expiryDate,
          isPrimary: p.isPrimary,
          devicePatent: p.devicePatent,
          status: p.status,
          title: p.title || 'Patent',
          assignee: p.assignee || mol.company
        }
      });
    }
    
    const usCount = patents.filter(p => p.country === 'US').length;
    const inCount = patents.filter(p => p.country === 'IN').length;
    console.log(`   ✅ Created patents: ${usCount} US, ${inCount} IN`);
  }
  
  // Summary
  const totalMolecules = await prisma.molecule.count();
  const totalPatents = await prisma.patent.count();
  const patentsByCountry = await prisma.patent.groupBy({
    by: ['country'],
    _count: true
  });
  
  console.log('\n' + '='.repeat(70));
  console.log('✅ SEED COMPLETE');
  console.log('='.repeat(70));
  console.log(`Molecules: ${totalMolecules}`);
  console.log(`Patents: ${totalPatents}`);
  patentsByCountry.forEach(g => {
    console.log(`  🌍 ${g.country}: ${g._count} patents`);
  });
  console.log('');
}

quickSeed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
