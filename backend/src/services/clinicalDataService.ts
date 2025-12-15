import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface TrialFilters {
  condition?: string;
  country?: string;
  molecule?: string;
  phase?: string;
}

class ClinicalDataService {
  async findTrials(filters: TrialFilters) {
    const where: any = {};

    if (filters.condition) {
      where.condition = {
        contains: filters.condition,
      };
    }
    if (filters.country) {
      where.country = {
        contains: filters.country,
      };
    }
    if (filters.molecule) {
      where.molecule = {
        contains: filters.molecule,
      };
    }
    if (filters.phase) {
      where.phase = filters.phase;
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
    });
  }
}

export const clinicalDataService = new ClinicalDataService();
