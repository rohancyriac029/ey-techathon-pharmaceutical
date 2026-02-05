// backend/scripts/parseOrangeBook.ts

import * as fs from 'fs';
import * as path from 'path';

interface Product {
  applNo: string;
  productNo: string;
  ingredient: string;
  tradeName: string;
  applicant: string;
}

interface Patent {
  applType: string;
  applNo: string;
  productNo: string;
  patentNumber: string;
  patentExpireDate: string;
  drugSubstanceFlag: string;
  drugProductFlag: string;
  patentUseCode: string;
  delistFlag: string;
  submissionDate: string;
}

interface CombinedPatent extends Patent {
  ingredient?: string;
  tradeName?: string;
  applicant?: string;
}

function parseProducts(filePath: string): Product[] {
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  Products file not found: ${filePath}`);
    return [];
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const header = lines[0].split('~');
  
  console.log(`   Products file columns: ${header.join(', ')}`);
  
  const products: Product[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    const fields = line.split('~');
    if (fields.length < 5) continue;
    
    // Find column indices (flexible)
    const applNoIdx = header.findIndex(h => h.includes('Appl_No'));
    const productNoIdx = header.findIndex(h => h.includes('Product_No'));
    const ingredientIdx = header.findIndex(h => h.includes('Ingredient'));
    const tradeNameIdx = header.findIndex(h => h.includes('Trade_Name'));
    const applicantIdx = header.findIndex(h => h.includes('Applicant'));
    
    if (applNoIdx < 0 || productNoIdx < 0) continue;
    
    products.push({
      applNo: fields[applNoIdx]?.trim() || '',
      productNo: fields[productNoIdx]?.trim() || '',
      ingredient: ingredientIdx >= 0 ? fields[ingredientIdx]?.trim() || '' : '',
      tradeName: tradeNameIdx >= 0 ? fields[tradeNameIdx]?.trim() || '' : '',
      applicant: applicantIdx >= 0 ? fields[applicantIdx]?.trim() || '' : ''
    });
  }
  
  return products;
}

function parsePatents(filePath: string): Patent[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  // Header: Appl_Type~Appl_No~Product_No~Patent_No~Patent_Expire_Date_Text~Drug_Substance_Flag~Drug_Product_Flag~Patent_Use_Code~Delist_Flag~Submission_Date
  
  const patents: Patent[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    const fields = line.split('~');
    
    if (fields.length < 10) continue;
    
    const patentNumber = fields[3]?.trim() || '';
    if (!patentNumber) continue;
    
    patents.push({
      applType: fields[0]?.trim() || '',
      applNo: fields[1]?.trim() || '',
      productNo: fields[2]?.trim() || '',
      patentNumber: patentNumber,
      patentExpireDate: fields[4]?.trim() || '',
      drugSubstanceFlag: fields[5]?.trim() || '',
      drugProductFlag: fields[6]?.trim() || '',
      patentUseCode: fields[7]?.trim() || '',
      delistFlag: fields[8]?.trim() || '',
      submissionDate: fields[9]?.trim() || ''
    });
  }
  
  return patents;
}

function mapUseCodeToType(useCode: string, substanceFlag: string, productFlag: string): string {
  // If use code starts with U-, it's a use code
  if (useCode.startsWith('U-')) {
    // Common codes:
    // U-1 = Drug substance patent
    // U-2 = Drug product patent  
    // U-3 = Method of use patent
    
    if (substanceFlag === 'Y') return 'COMPOUND';
    if (productFlag === 'Y') return 'FORMULATION';
    return 'METHOD_OF_USE';
  }
  
  // Fallback to flags
  if (substanceFlag === 'Y') return 'COMPOUND';
  if (productFlag === 'Y') return 'FORMULATION';
  
  return 'UNKNOWN';
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║      FDA Orange Book Parser v2.0 (Combined)             ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');
  
  const dataDir = path.join(__dirname, '../src/data/orange-book');
  const productsPath = path.join(dataDir, 'products.txt');
  const patentsPath = path.join(dataDir, 'patent.txt');
  
  // Parse products
  console.log('📦 Parsing products.txt...');
  const products = parseProducts(productsPath);
  console.log(`   Found ${products.length} products`);
  
  // Parse patents
  console.log('📜 Parsing patent.txt...');
  const patents = parsePatents(patentsPath);
  console.log(`   Found ${patents.length} patents`);
  
  // Create lookup map
  console.log('\n🔗 Joining patents with product information...');
  const productMap = new Map<string, Product>();
  products.forEach(p => {
    const key = `${p.applNo}-${p.productNo}`;
    productMap.set(key, p);
  });
  
  // Combine
  const combined: CombinedPatent[] = patents.map(patent => {
    const key = `${patent.applNo}-${patent.productNo}`;
    const product = productMap.get(key);
    
    return {
      ...patent,
      ingredient: product?.ingredient,
      tradeName: product?.tradeName,
      applicant: product?.applicant
    };
  });
  
  const withNames = combined.filter(p => p.ingredient);
  console.log(`   Successfully matched ${withNames.length}/${patents.length} patents with product names`);
  
  // Add patent type classification
  const enriched = withNames.map(p => ({
    ...p,
    patentType: mapUseCodeToType(p.patentUseCode, p.drugSubstanceFlag, p.drugProductFlag)
  }));
  
  // Save
  const outputPath = path.join(dataDir, 'parsed-patents.json');
  fs.writeFileSync(outputPath, JSON.stringify(enriched, null, 2));
  console.log(`\n💾 Saved to: ${outputPath}`);
  
  // Show samples
  console.log('\n📋 Sample patents:');
  enriched.slice(0, 5).forEach((p, i) => {
    console.log(`\n${i+1}. ${p.ingredient} (${p.tradeName || 'N/A'})`);
    console.log(`   Patent: ${p.patentNumber}`);
    console.log(`   Expires: ${p.patentExpireDate}`);
    console.log(`   Type: ${p.patentType}`);
    console.log(`   Applicant: ${p.applicant || 'N/A'}`);
  });
  
  // Statistics
  console.log('\n📊 Statistics:');
  const byType = enriched.reduce((acc, p) => {
    acc[p.patentType] = (acc[p.patentType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  Object.entries(byType)
    .sort(([, a], [, b]) => b - a)
    .forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`);
    });
  
  // Check for key molecules
  console.log('\n🔍 Checking for target molecules:');
  const targetMolecules = [
    'TIOTROPIUM',
    'SEMAGLUTIDE', 
    'ADALIMUMAB',
    'SITAGLIPTIN',
    'EMPAGLIFLOZIN',
    'METFORMIN',
    'OSIMERTINIB',
    'PEMBROLIZUMAB',
    'ATORVASTATIN',
    'LISINOPRIL'
  ];
  
  targetMolecules.forEach(molecule => {
    const found = enriched.filter(p => 
      p.ingredient?.toUpperCase().includes(molecule)
    );
    
    if (found.length > 0) {
      console.log(`   ✅ ${molecule}: ${found.length} patents`);
    } else {
      console.log(`   ❌ ${molecule}: Not found`);
    }
  });
  
  console.log('\n✅ Parsing complete!');
  console.log('\nNext steps:');
  console.log('  1. Review: src/data/orange-book/parsed-patents.json');
  console.log('  2. Test patent fetcher: npm run test:patents');
  console.log('  3. Update seedRealData.ts to use this data');
}

main().catch(console.error);