import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// --- DATA POOLS FOR RANDOM GENERATION ---

const CONDITIONS = [
  'Non-Small Cell Lung Cancer',
  'Asthma',
  'COPD',
  'Type 2 Diabetes',
  'Hypertension',
  'Rheumatoid Arthritis',
  'Tuberculosis',
  'Idiopathic Pulmonary Fibrosis',
];

const MOLECULE_PREFIXES = ['Respi', 'Cardio', 'Onco', 'Metabo', 'Immuno', 'Neuro'];
const MOLECULE_SUFFIXES = ['vir', 'mab', 'nib', 'fen', 'stat', 'zone'];

const PHASES = ['Phase I', 'Phase II', 'Phase III', 'Phase IV'];

const SPONSORS = [
  'Pfizer',
  'Novartis',
  'Roche',
  'Sun Pharma',
  'Cipla',
  'Dr. Reddys',
  'AstraZeneca',
  'Apex Research Labs',
  'University of Oxford',
  'Bharat Biotech',
];

const COUNTRIES = ['India', 'USA', 'China', 'Germany', 'Japan', 'UK'];

const JURISDICTIONS = ['IN', 'US', 'EP', 'WO'];

const FTO_FLAGS = ['LOW', 'MEDIUM', 'HIGH'];

// --- HELPER FUNCTIONS ---

function getRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function generateMoleculeName(): string {
  const prefix = getRandom(MOLECULE_PREFIXES);
  const suffix = getRandom(MOLECULE_SUFFIXES);
  const number = Math.floor(Math.random() * 900) + 100;
  return `${prefix}${suffix}-${number}`;
}

// Generate a shared pool of molecules so Patents and Trials overlap
const SHARED_MOLECULES = Array.from({ length: 30 }, generateMoleculeName);

async function main() {
  console.log('🌱 Starting database seed...');

  // Clear existing data
  await prisma.report.deleteMany();
  await prisma.job.deleteMany();
  await prisma.clinicalTrial.deleteMany();
  await prisma.patent.deleteMany();

  // ---------------------------------------------------------
  // 1. CREATE "GOLDEN SCENARIO" DATA (For your Demo)
  // ---------------------------------------------------------
  console.log('Creating demo scenarios...');

  // Scenario A: "The Golden Opportunity"
  const goldenMolecule = "Respiflow-X";
  
  await prisma.clinicalTrial.create({
    data: {
      condition: "COPD",
      molecule: goldenMolecule,
      phase: "Phase III",
      sponsor: "Apex Research Labs",
      country: "India",
      citations: "PMID:11223344"
    }
  });

  await prisma.patent.create({
    data: {
      molecule: goldenMolecule,
      jurisdiction: "IN",
      status: "Active",
      expiryDate: new Date('2024-01-01'),
      ftoFlag: "LOW",
      citations: "US-PAT-99999"
    }
  });

  // Scenario B: "The Blocked Path"
  const blockedMolecule = "OncoBlock-99";

  await prisma.clinicalTrial.create({
    data: {
      condition: "Non-Small Cell Lung Cancer",
      molecule: blockedMolecule,
      phase: "Phase II",
      sponsor: "Roche",
      country: "USA",
      citations: "PMID:55667788"
    }
  });

  await prisma.patent.create({
    data: {
      molecule: blockedMolecule,
      jurisdiction: "US",
      status: "Active",
      expiryDate: new Date('2038-05-20'),
      ftoFlag: "HIGH",
      citations: "US-PAT-88888"
    }
  });

  // Scenario C: "India Respiratory Focus"
  const indianMolecule = "Respimab-IN";

  await prisma.clinicalTrial.create({
    data: {
      condition: "Asthma",
      molecule: indianMolecule,
      phase: "Phase II",
      sponsor: "Sun Pharma",
      country: "India",
      citations: "PMID:33445566"
    }
  });

  await prisma.clinicalTrial.create({
    data: {
      condition: "COPD",
      molecule: indianMolecule,
      phase: "Phase I",
      sponsor: "Cipla",
      country: "India",
      citations: "PMID:33445567"
    }
  });

  await prisma.patent.create({
    data: {
      molecule: indianMolecule,
      jurisdiction: "IN",
      status: "Expired",
      expiryDate: new Date('2022-06-15'),
      ftoFlag: "LOW",
      citations: "IN-PAT-77777"
    }
  });

  // ---------------------------------------------------------
  // 2. GENERATE SYNTHETIC VOLUME DATA (~100 each)
  // ---------------------------------------------------------
  console.log('Generating synthetic volume data...');

  const trialsData = [];
  const patentsData = [];

  // Generate 100 Clinical Trials
  for (let i = 0; i < 100; i++) {
    trialsData.push({
      condition: getRandom(CONDITIONS),
      molecule: getRandom(SHARED_MOLECULES),
      phase: getRandom(PHASES),
      sponsor: getRandom(SPONSORS),
      country: getRandom(COUNTRIES),
      citations: `PMID:${Math.floor(Math.random() * 10000000)}`
    });
  }

  // Generate 100 Patents
  for (let i = 0; i < 100; i++) {
    const expiry = getRandomDate(new Date('2020-01-01'), new Date('2040-01-01'));
    const isExpired = expiry < new Date();
    let calculatedFto = getRandom(FTO_FLAGS);
    
    if (isExpired) calculatedFto = "LOW";

    patentsData.push({
      molecule: getRandom(SHARED_MOLECULES),
      jurisdiction: getRandom(JURISDICTIONS),
      status: isExpired ? "Expired" : "Active",
      expiryDate: expiry,
      ftoFlag: calculatedFto,
      citations: `US-PAT-${Math.floor(Math.random() * 1000000)}`
    });
  }

  // Batch insert
  await prisma.clinicalTrial.createMany({ data: trialsData });
  await prisma.patent.createMany({ data: patentsData });

  console.log(`✅ Seeding finished.`);
  console.log(`   - Created 3 Demo Scenarios`);
  console.log(`   - Created ${trialsData.length} Random Clinical Trials`);
  console.log(`   - Created ${patentsData.length} Random Patents`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
