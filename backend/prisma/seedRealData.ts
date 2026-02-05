/**
 * Real Data Seed Script
 * 
 * Fetches real pharmaceutical data from:
 * - ClinicalTrials.gov (clinical trial data)
 * - OpenFDA (regulatory/approval data)
 * 
 * And seeds the database with actual drug information.
 * 
 * Usage: npx ts-node prisma/seedRealData.ts
 */

import { PrismaClient } from '@prisma/client';
import { 
  fetchAllMoleculesData,
  MoleculeData,
  TARGET_MOLECULES,
  validateMoleculeData,
} from '../src/services/externalDataService';
import {
  transformMolecule,
  transformClinicalTrials,
  transformRegulatoryStatus,
  generateDiseaseMarketData,
  MoleculeCreate,
  ClinicalTrialCreate,
  PatentCreate,
  RegulatoryStatusCreate,
  DiseaseMarketCreate,
} from '../src/services/dataTransformService';
import { fetchRealPatents } from '../src/services/realPatentFetcher';

const prisma = new PrismaClient();

// ============================================
// DATABASE SEEDING FUNCTIONS
// ============================================

async function clearDatabase() {
  console.log('🗑️  Clearing existing data...');
  
  // Delete in correct order to respect foreign keys
  await prisma.report.deleteMany();
  await prisma.job.deleteMany();
  await prisma.regulatoryStatus.deleteMany();
  await prisma.clinicalTrial.deleteMany();
  await prisma.patent.deleteMany();
  await prisma.diseaseMarket.deleteMany();
  await prisma.molecule.deleteMany();
  
  console.log('   ✅ Database cleared');
}

async function seedMolecules(molecules: MoleculeCreate[]) {
  console.log('\n📦 Seeding molecules...');
  
  for (const mol of molecules) {
    await prisma.molecule.create({
      data: {
        name: mol.name,
        genericName: mol.genericName,
        brandName: mol.brandName,
        indication: mol.indication,
        modality: mol.modality,
        innovatorCompany: mol.innovatorCompany,
        launchYear: mol.launchYear,
      },
    });
  }
  
  console.log(`   ✅ Created ${molecules.length} molecules`);
}

async function seedClinicalTrials(trials: ClinicalTrialCreate[]) {
  console.log('\n🔬 Seeding clinical trials...');
  
  let created = 0;
  for (const trial of trials) {
    try {
      await prisma.clinicalTrial.create({
        data: {
          molecule: trial.molecule,
          indication: trial.indication,
          phase: trial.phase,
          status: trial.status,
          country: trial.country,
          sponsor: trial.sponsor,
          trialId: trial.trialId,
          startDate: trial.startDate,
          completionDate: trial.completionDate,
          primaryEndpoint: trial.primaryEndpoint,
          outcome: trial.outcome,
          citations: trial.citations,
        },
      });
      created++;
    } catch (error: any) {
      // Skip duplicate trial IDs
      if (!error.message?.includes('Unique constraint')) {
        console.error(`   Error creating trial ${trial.trialId}:`, error.message);
      }
    }
  }
  
  console.log(`   ✅ Created ${created} clinical trials`);
}

async function seedPatents(patents: PatentCreate[]) {
  console.log('\n📜 Seeding patents...');
  
  for (const patent of patents) {
    await prisma.patent.create({
      data: {
        molecule: patent.molecule,
        country: patent.country,
        patentNumber: patent.patentNumber,
        patentType: patent.patentType,
        isPrimary: patent.isPrimary,
        status: patent.status,
        filingDate: patent.filingDate,
        expiryDate: patent.expiryDate,
        title: patent.title,
        assignee: patent.assignee,
      },
    });
  }
  
  console.log(`   ✅ Created ${patents.length} patents`);
}

async function seedRegulatoryStatus(statuses: RegulatoryStatusCreate[]) {
  console.log('\n📋 Seeding regulatory statuses...');
  
  for (const status of statuses) {
    await prisma.regulatoryStatus.create({
      data: {
        molecule: status.molecule,
        country: status.country,
        status: status.status,
        approvalDate: status.approvalDate,
        approvalType: status.approvalType,
        referenceProduct: status.referenceProduct,
      },
    });
  }
  
  console.log(`   ✅ Created ${statuses.length} regulatory statuses`);
}

async function seedDiseaseMarkets(markets: DiseaseMarketCreate[]) {
  console.log('\n📊 Seeding disease market data...');
  
  for (const market of markets) {
    await prisma.diseaseMarket.create({
      data: {
        disease: market.disease,
        country: market.country,
        year: market.year,
        prevalenceMillions: market.prevalenceMillions,
        incidenceMillions: market.incidenceMillions,
        treatedRatePercent: market.treatedRatePercent,
        avgAnnualTherapyCostUSD: market.avgAnnualTherapyCostUSD,
        marketSizeUSD: market.marketSizeUSD,
        dataSource: market.dataSource,
      },
    });
  }
  
  console.log(`   ✅ Created ${markets.length} disease market records`);
}

// ============================================
// MAIN SEED FUNCTION
// ============================================

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('   REAL DATA SEED - Pharmaceutical Decision Platform');
  console.log('   Fetching data from ClinicalTrials.gov and OpenFDA');
  console.log('═══════════════════════════════════════════════════════════════\n');

  try {
    // Step 1: Fetch data from external APIs
    console.log('📡 STEP 1: Fetching data from external APIs...\n');
    const moleculesData = await fetchAllMoleculesData();
    
    if (moleculesData.length === 0) {
      throw new Error('No data fetched from external APIs');
    }

    // Step 2: Validate fetched data
    console.log('\n✅ STEP 2: Validating fetched data...\n');
    let validCount = 0;
    for (const data of moleculesData) {
      const validation = validateMoleculeData(data);
      if (validation.isValid) {
        validCount++;
      } else {
        console.log(`   ⚠️  ${data.molecule.name} has issues: ${validation.issues.join(', ')}`);
      }
    }
    console.log(`   Valid molecules: ${validCount}/${moleculesData.length}`);

    // Step 3: Transform data for database
    console.log('\n🔄 STEP 3: Transforming data for database...\n');
    
    const molecules: MoleculeCreate[] = moleculesData.map(transformMolecule);
    
    const clinicalTrials: ClinicalTrialCreate[] = [];
    const patents: PatentCreate[] = [];
    const regulatoryStatuses: RegulatoryStatusCreate[] = [];
    
    for (const data of moleculesData) {
      // Transform trials
      const usTrials = transformClinicalTrials(data, 'US');
      const inTrials = transformClinicalTrials(data, 'IN');
      clinicalTrials.push(...usTrials, ...inTrials);
      
      // Fetch REAL patents from Orange Book (no synthetic generation)
      const realPatents = await fetchRealPatents(
        data.molecule.name, 
        data.molecule.genericName, 
        data.molecule.innovator
      );
      
      // Convert to PatentCreate format for database seeding
      const moleculePatents: PatentCreate[] = realPatents.map(p => ({
        molecule: data.molecule.name,
        patentNumber: p.patentNumber,
        filingDate: p.filingDate || new Date('1900-01-01'), // Default if not available
        expiryDate: p.expiryDate,
        patentType: p.patentType as any, // Already matches enum
        isPrimary: p.isPrimary,
        status: p.status === 'Active' ? 'ACTIVE' : (p.status === 'Expired' ? 'EXPIRED' : 'UNDER_REVIEW'),
        claims: `Patent covering ${p.patentType.toLowerCase()} aspects`,
        applicant: p.assignee || data.molecule.innovator,
        country: p.country,
        devicePatent: p.devicePatent,
        litigationHistory: p.litigationHistory,
        litigationRisk: p.litigationRisk as any,
        dataQuality: p.dataQuality as any,
        confidenceLevel: p.confidenceLevel as any,
        dataSource: p.dataSource,
        reviewedBy: p.reviewedBy,
        notes: p.notes,
      }));
      patents.push(...moleculePatents);
      
      // Transform regulatory status
      const regStatuses = transformRegulatoryStatus(data);
      regulatoryStatuses.push(...regStatuses);
    }
    
    // Generate disease market data
    const diseaseMarkets = generateDiseaseMarketData();
    
    console.log(`   Molecules: ${molecules.length}`);
    console.log(`   Clinical Trials: ${clinicalTrials.length}`);
    console.log(`   Patents: ${patents.length}`);
    console.log(`   Regulatory Statuses: ${regulatoryStatuses.length}`);
    console.log(`   Disease Markets: ${diseaseMarkets.length}`);

    // Step 4: Clear existing database
    console.log('\n🗑️  STEP 4: Clearing existing database...\n');
    await clearDatabase();

    // Step 5: Seed database
    console.log('\n💾 STEP 5: Seeding database with real data...\n');
    
    await seedMolecules(molecules);
    await seedClinicalTrials(clinicalTrials);
    await seedPatents(patents);
    await seedRegulatoryStatus(regulatoryStatuses);
    await seedDiseaseMarkets(diseaseMarkets);

    // Step 6: Verify seeded data
    console.log('\n📊 STEP 6: Verifying seeded data...\n');
    
    const counts = {
      molecules: await prisma.molecule.count(),
      clinicalTrials: await prisma.clinicalTrial.count(),
      patents: await prisma.patent.count(),
      regulatoryStatuses: await prisma.regulatoryStatus.count(),
      diseaseMarkets: await prisma.diseaseMarket.count(),
    };
    
    console.log('   Database Statistics:');
    console.log(`   ├── Molecules: ${counts.molecules}`);
    console.log(`   ├── Clinical Trials: ${counts.clinicalTrials}`);
    console.log(`   ├── Patents: ${counts.patents}`);
    console.log(`   ├── Regulatory Statuses: ${counts.regulatoryStatuses}`);
    console.log(`   └── Disease Markets: ${counts.diseaseMarkets}`);

    // Show sample data
    console.log('\n📋 Sample Data:');
    const sampleMolecule = await prisma.molecule.findFirst();
    if (sampleMolecule) {
      console.log(`   Molecule: ${sampleMolecule.name} (${sampleMolecule.brandName})`);
      console.log(`   └── Indication: ${sampleMolecule.indication}`);
      console.log(`   └── Innovator: ${sampleMolecule.innovatorCompany}`);
      console.log(`   └── Launch Year: ${sampleMolecule.launchYear || 'N/A'}`);
    }
    
    const sampleTrial = await prisma.clinicalTrial.findFirst({
      where: { status: 'Completed' },
    });
    if (sampleTrial) {
      console.log(`\n   Trial: ${sampleTrial.trialId}`);
      console.log(`   └── Molecule: ${sampleTrial.molecule}`);
      console.log(`   └── Phase: ${sampleTrial.phase}`);
      console.log(`   └── Sponsor: ${sampleTrial.sponsor}`);
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('   ✅ SEED COMPLETED SUCCESSFULLY!');
    console.log('═══════════════════════════════════════════════════════════════\n');

  } catch (error: any) {
    console.error('\n❌ SEED FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed
main();
