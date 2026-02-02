import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface TrialFilters {
  indication?: string;  // Changed from condition
  country?: string;
  molecule?: string;
  phase?: string;
  status?: string;
}

class ClinicalDataService {
  async findTrials(filters: TrialFilters) {
    const where: any = {};

    if (filters.indication) {
      where.indication = {
        contains: filters.indication,
      };
    }
    if (filters.country) {
      where.country = filters.country;
    }
    if (filters.molecule) {
      where.molecule = {
        contains: filters.molecule,
      };
    }
    if (filters.phase) {
      where.phase = filters.phase;
    }
    if (filters.status) {
      where.status = filters.status;
    }

    return prisma.clinicalTrial.findMany({ where });
  }

  async getAllTrials() {
    return prisma.clinicalTrial.findMany();
  }

  async getTrialsByMolecule(molecule: string) {
    return prisma.clinicalTrial.findMany({
      where: {
        molecule: {
          contains: molecule,
        },
      },
      orderBy: { phase: 'desc' },
    });
  }

  async getTrialsByCountry(country: 'IN' | 'US') {
    return prisma.clinicalTrial.findMany({
      where: { country },
      orderBy: { phase: 'desc' },
    });
  }

  async getTrialsByIndication(indication: string) {
    return prisma.clinicalTrial.findMany({
      where: {
        indication: {
          contains: indication,
        },
      },
      orderBy: { phase: 'desc' },
    });
  }
}

export const clinicalDataService = new ClinicalDataService();
