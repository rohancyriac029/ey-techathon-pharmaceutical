/**
 * Seed Epidemiology Data Script
 * 
 * Seeds patient-level epidemiology data from verified public sources:
 * - CDC, WHO, GOLD, IDF, SEER, GLOBOCAN, ICMR
 * 
 * Usage: npx ts-node prisma/seedEpidemiologyData.ts
 */

import { PrismaClient } from '@prisma/client';
import {
  ALL_EPIDEMIOLOGY_DATA,
  DRUG_UTILIZATION_DATA,
  HISTORICAL_TRENDS,
} from '../src/services/epidemiologyDataService';

const prisma = new PrismaClient();

async function seedDiseaseEpidemiology() {
  console.log('\n🏥 Seeding disease epidemiology data...');
  
  let created = 0;
  let updated = 0;
  
  for (const epi of ALL_EPIDEMIOLOGY_DATA) {
    try {
      await prisma.diseaseEpidemiology.upsert({
        where: {
          disease_country_year: {
            disease: epi.disease,
            country: epi.country,
            year: epi.year,
          },
        },
        update: {
          prevalenceTotal: epi.prevalenceTotal,
          incidenceAnnual: epi.incidenceAnnual,
          mortalityAnnual: epi.mortalityAnnual,
          prevalenceRate: epi.prevalenceRate,
          incidenceRate: epi.incidenceRate,
          mortalityRate: epi.mortalityRate,
          diagnosedPercent: epi.diagnosedPercent,
          treatedPercent: epi.treatedPercent,
          controlledPercent: epi.controlledPercent,
          malePercent: epi.malePercent,
          femalePercent: epi.femalePercent,
          avgAgeAtDiagnosis: epi.avgAgeAtDiagnosis,
          age65PlusPercent: epi.age65PlusPercent,
          prevalenceChangeYoY: epi.prevalenceChangeYoY,
          incidenceChangeYoY: epi.incidenceChangeYoY,
          mortalityChangeYoY: epi.mortalityChangeYoY,
          dataSource: epi.dataSource,
          sourceUrl: epi.sourceUrl,
          publicationYear: epi.publicationYear,
          confidence: epi.confidence,
          notes: epi.notes,
        },
        create: {
          disease: epi.disease,
          country: epi.country,
          year: epi.year,
          prevalenceTotal: epi.prevalenceTotal,
          incidenceAnnual: epi.incidenceAnnual,
          mortalityAnnual: epi.mortalityAnnual,
          prevalenceRate: epi.prevalenceRate,
          incidenceRate: epi.incidenceRate,
          mortalityRate: epi.mortalityRate,
          diagnosedPercent: epi.diagnosedPercent,
          treatedPercent: epi.treatedPercent,
          controlledPercent: epi.controlledPercent,
          malePercent: epi.malePercent,
          femalePercent: epi.femalePercent,
          avgAgeAtDiagnosis: epi.avgAgeAtDiagnosis,
          age65PlusPercent: epi.age65PlusPercent,
          prevalenceChangeYoY: epi.prevalenceChangeYoY,
          incidenceChangeYoY: epi.incidenceChangeYoY,
          mortalityChangeYoY: epi.mortalityChangeYoY,
          dataSource: epi.dataSource,
          sourceUrl: epi.sourceUrl,
          publicationYear: epi.publicationYear,
          confidence: epi.confidence,
          notes: epi.notes,
        },
      });
      created++;
    } catch (error: any) {
      console.error(`   ❌ Error seeding ${epi.disease} (${epi.country}):`, error.message);
    }
  }
  
  console.log(`   ✅ Created/updated ${created} disease epidemiology records`);
}

async function seedDrugUtilization() {
  console.log('\n💊 Seeding drug utilization data...');
  
  let created = 0;
  
  for (const util of DRUG_UTILIZATION_DATA) {
    try {
      await prisma.drugUtilization.upsert({
        where: {
          molecule_country_year: {
            molecule: util.molecule,
            country: util.country,
            year: util.year,
          },
        },
        update: {
          totalPatientsOnDrug: util.totalPatientsOnDrug,
          newPatientsAnnual: util.newPatientsAnnual,
          discontinuationRate: util.discontinuationRate,
          totalPrescriptions: util.totalPrescriptions,
          prescriptionsPerPatient: util.prescriptionsPerPatient,
          patientCountChangeYoY: util.patientCountChangeYoY,
          prescriptionChangeYoY: util.prescriptionChangeYoY,
          marketSharePercent: util.marketSharePercent,
          dataSource: util.dataSource,
          sourceUrl: util.sourceUrl,
          confidence: util.confidence,
        },
        create: {
          molecule: util.molecule,
          country: util.country,
          year: util.year,
          totalPatientsOnDrug: util.totalPatientsOnDrug,
          newPatientsAnnual: util.newPatientsAnnual,
          discontinuationRate: util.discontinuationRate,
          totalPrescriptions: util.totalPrescriptions,
          prescriptionsPerPatient: util.prescriptionsPerPatient,
          patientCountChangeYoY: util.patientCountChangeYoY,
          prescriptionChangeYoY: util.prescriptionChangeYoY,
          marketSharePercent: util.marketSharePercent,
          dataSource: util.dataSource,
          sourceUrl: util.sourceUrl,
          confidence: util.confidence,
        },
      });
      created++;
    } catch (error: any) {
      console.error(`   ❌ Error seeding ${util.molecule}:`, error.message);
    }
  }
  
  console.log(`   ✅ Created/updated ${created} drug utilization records`);
}

async function seedHistoricalTrends() {
  console.log('\n📈 Seeding historical trends...');
  
  let created = 0;
  
  for (const trend of HISTORICAL_TRENDS) {
    for (let i = 0; i < trend.years.length; i++) {
      try {
        await prisma.epidemiologyTrend.upsert({
          where: {
            disease_country_metric_year: {
              disease: trend.disease,
              country: trend.country,
              metric: trend.metric,
              year: trend.years[i],
            },
          },
          update: {
            value: trend.values[i],
            dataSource: trend.dataSource,
          },
          create: {
            disease: trend.disease,
            country: trend.country,
            metric: trend.metric,
            year: trend.years[i],
            value: trend.values[i],
            dataSource: trend.dataSource,
          },
        });
        created++;
      } catch (error: any) {
        console.error(`   ❌ Error seeding trend:`, error.message);
      }
    }
  }
  
  console.log(`   ✅ Created/updated ${created} historical trend records`);
}

async function main() {
  console.log('🌱 Starting epidemiology data seed...\n');
  console.log('Data sources:');
  console.log('  - CDC MMWR, NHANES (US)');
  console.log('  - GOLD Report (COPD)');
  console.log('  - IDF Diabetes Atlas');
  console.log('  - NCI SEER (Cancer)');
  console.log('  - GLOBOCAN / IARC (Global Cancer)');
  console.log('  - ICMR (India)');
  console.log('  - WHO Global Health Observatory');
  console.log('  - CMS Medicare Part D (Drug Utilization)');
  
  await seedDiseaseEpidemiology();
  await seedDrugUtilization();
  await seedHistoricalTrends();
  
  console.log('\n✅ Epidemiology data seeding complete!');
  
  // Print summary
  const epiCount = await prisma.diseaseEpidemiology.count();
  const utilCount = await prisma.drugUtilization.count();
  const trendCount = await prisma.epidemiologyTrend.count();
  
  console.log('\n📊 Summary:');
  console.log(`   - ${epiCount} disease epidemiology records`);
  console.log(`   - ${utilCount} drug utilization records`);
  console.log(`   - ${trendCount} historical trend data points`);
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
