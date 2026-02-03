/**
 * Seed Market Data Script
 * 
 * Seeds the new DrugPricing, GenericCompetition, and MarketGrowth tables
 * with real data from CMS Medicare Part D, FDA Orange Book, NPPA, and industry reports.
 * 
 * This is designed to be called from the main seed script or run independently.
 * 
 * Usage: npx ts-node prisma/seedMarketData.ts
 */

import { PrismaClient } from '@prisma/client';
import {
  US_DRUG_PRICING_2023,
  INDIA_DRUG_PRICING_2023,
  US_GENERIC_COMPETITION_2024,
  INDIA_GENERIC_COMPETITION_2024,
  MARKET_GROWTH_DATA_2024,
} from '../src/services/marketDataService';

const prisma = new PrismaClient();

// ============================================
// SEEDING FUNCTIONS
// ============================================

async function seedDrugPricing() {
  console.log('\n💰 Seeding drug pricing data...');
  
  const allPricing = [...US_DRUG_PRICING_2023, ...INDIA_DRUG_PRICING_2023];
  let created = 0;
  let skipped = 0;
  
  for (const pricing of allPricing) {
    try {
      // Check if molecule exists in database
      const molecule = await prisma.molecule.findUnique({
        where: { name: pricing.molecule },
      });
      
      if (!molecule) {
        console.log(`   ⚠️  Skipping ${pricing.molecule} (${pricing.country}) - molecule not in database`);
        skipped++;
        continue;
      }
      
      await prisma.drugPricing.upsert({
        where: {
          molecule_country_year: {
            molecule: pricing.molecule,
            country: pricing.country,
            year: pricing.year,
          },
        },
        update: {
          totalSpendingUSD: pricing.totalSpendingUSD,
          totalClaims: pricing.totalClaims,
          costPerClaimUSD: pricing.costPerClaimUSD,
          beneficiaries: pricing.beneficiaries,
          brandPriceUSD: pricing.brandPriceUSD,
          genericPriceUSD: pricing.genericPriceUSD,
          priceErosionPct: pricing.priceErosionPct,
          mrpINR: pricing.mrpINR,
          ceilingPriceINR: pricing.ceilingPriceINR,
          dataSource: pricing.dataSource,
          dataConfidence: pricing.dataConfidence,
        },
        create: {
          molecule: pricing.molecule,
          country: pricing.country,
          year: pricing.year,
          totalSpendingUSD: pricing.totalSpendingUSD,
          totalClaims: pricing.totalClaims,
          costPerClaimUSD: pricing.costPerClaimUSD,
          beneficiaries: pricing.beneficiaries,
          brandPriceUSD: pricing.brandPriceUSD,
          genericPriceUSD: pricing.genericPriceUSD,
          priceErosionPct: pricing.priceErosionPct,
          mrpINR: pricing.mrpINR,
          ceilingPriceINR: pricing.ceilingPriceINR,
          dataSource: pricing.dataSource,
          dataConfidence: pricing.dataConfidence,
        },
      });
      created++;
    } catch (error: any) {
      console.error(`   ❌ Error seeding pricing for ${pricing.molecule}:`, error.message);
    }
  }
  
  console.log(`   ✅ Created/updated ${created} drug pricing records (${skipped} skipped)`);
}

async function seedGenericCompetition() {
  console.log('\n🏭 Seeding generic competition data...');
  
  const allCompetition = [...US_GENERIC_COMPETITION_2024, ...INDIA_GENERIC_COMPETITION_2024];
  let created = 0;
  let skipped = 0;
  
  for (const competition of allCompetition) {
    try {
      // Check if molecule exists in database
      const molecule = await prisma.molecule.findUnique({
        where: { name: competition.molecule },
      });
      
      if (!molecule) {
        console.log(`   ⚠️  Skipping ${competition.molecule} (${competition.country}) - molecule not in database`);
        skipped++;
        continue;
      }
      
      await prisma.genericCompetition.upsert({
        where: {
          molecule_country_year: {
            molecule: competition.molecule,
            country: competition.country,
            year: competition.year,
          },
        },
        update: {
          genericApprovals: competition.genericApprovals,
          biosimilarApprovals: competition.biosimilarApprovals,
          activeManufacturers: competition.activeManufacturers,
          topCompetitors: competition.topCompetitors ? JSON.stringify(competition.topCompetitors) : null,
          firstGenericDate: competition.firstGenericDate,
          brandMarketSharePct: competition.brandMarketSharePct,
          genericPenetrationPct: competition.genericPenetrationPct,
          avgGenericPriceVsBrandPct: competition.avgGenericPriceVsBrandPct,
          competitionIntensity: competition.competitionIntensity,
          dataSource: competition.dataSource,
        },
        create: {
          molecule: competition.molecule,
          country: competition.country,
          year: competition.year,
          genericApprovals: competition.genericApprovals,
          biosimilarApprovals: competition.biosimilarApprovals,
          activeManufacturers: competition.activeManufacturers,
          topCompetitors: competition.topCompetitors ? JSON.stringify(competition.topCompetitors) : null,
          firstGenericDate: competition.firstGenericDate,
          brandMarketSharePct: competition.brandMarketSharePct,
          genericPenetrationPct: competition.genericPenetrationPct,
          avgGenericPriceVsBrandPct: competition.avgGenericPriceVsBrandPct,
          competitionIntensity: competition.competitionIntensity,
          dataSource: competition.dataSource,
        },
      });
      created++;
    } catch (error: any) {
      console.error(`   ❌ Error seeding competition for ${competition.molecule}:`, error.message);
    }
  }
  
  console.log(`   ✅ Created/updated ${created} generic competition records (${skipped} skipped)`);
}

async function seedMarketGrowth() {
  console.log('\n📈 Seeding market growth data...');
  
  let created = 0;
  
  for (const growth of MARKET_GROWTH_DATA_2024) {
    try {
      await prisma.marketGrowth.upsert({
        where: {
          disease_country_year: {
            disease: growth.disease,
            country: growth.country,
            year: growth.year,
          },
        },
        update: {
          cagr5YearHistoric: growth.cagr5YearHistoric,
          cagr5YearProjected: growth.cagr5YearProjected,
          genericErosionRate: growth.genericErosionRate,
          dataSource: growth.dataSource,
        },
        create: {
          disease: growth.disease,
          country: growth.country,
          year: growth.year,
          cagr5YearHistoric: growth.cagr5YearHistoric,
          cagr5YearProjected: growth.cagr5YearProjected,
          genericErosionRate: growth.genericErosionRate,
          dataSource: growth.dataSource,
        },
      });
      created++;
    } catch (error: any) {
      console.error(`   ❌ Error seeding growth for ${growth.disease} (${growth.country}):`, error.message);
    }
  }
  
  console.log(`   ✅ Created/updated ${created} market growth records`);
}

// ============================================
// MAIN FUNCTION
// ============================================

export async function seedAllMarketData() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('   MARKET DATA SEED - Real Pricing & Competition Data');
  console.log('   Sources: CMS Medicare Part D, FDA Orange Book, NPPA, IQVIA');
  console.log('═══════════════════════════════════════════════════════════════');
  
  try {
    await seedDrugPricing();
    await seedGenericCompetition();
    await seedMarketGrowth();
    
    // Print summary
    const pricingCount = await prisma.drugPricing.count();
    const competitionCount = await prisma.genericCompetition.count();
    const growthCount = await prisma.marketGrowth.count();
    
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('   MARKET DATA SEED COMPLETE');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`   💰 Drug Pricing records: ${pricingCount}`);
    console.log(`   🏭 Generic Competition records: ${competitionCount}`);
    console.log(`   📈 Market Growth records: ${growthCount}`);
    console.log('═══════════════════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('❌ Error seeding market data:', error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  seedAllMarketData()
    .then(() => prisma.$disconnect())
    .catch((error) => {
      console.error(error);
      prisma.$disconnect();
      process.exit(1);
    });
}

export default { seedAllMarketData };
