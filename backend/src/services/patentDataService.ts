import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface PatentFilters {
  molecule?: string;
  jurisdiction?: string;
  status?: string;
  ftoFlag?: string;
}

class PatentDataService {
  async findPatents(filters: PatentFilters) {
    const where: any = {};

    if (filters.molecule) {
      where.molecule = {
        contains: filters.molecule,
      };
    }
    if (filters.jurisdiction) {
      where.jurisdiction = filters.jurisdiction;
    }
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.ftoFlag) {
      where.ftoFlag = filters.ftoFlag;
    }

    return prisma.patent.findMany({ where });
  }

  async getAllPatents() {
    return prisma.patent.findMany();
  }

  async getPatentsByMolecule(molecule: string) {
    return prisma.patent.findMany({
      where: {
        molecule: {
          contains: molecule,
        },
      },
    });
  }
}

export const patentDataService = new PatentDataService();
