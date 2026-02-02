import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface PatentFilters {
  molecule?: string;
  country?: string;   // Changed from jurisdiction
  status?: string;
  patentType?: string;
  isPrimary?: boolean;
}

class PatentDataService {
  async findPatents(filters: PatentFilters) {
    const where: any = {};

    if (filters.molecule) {
      where.molecule = {
        contains: filters.molecule,
      };
    }
    if (filters.country) {
      where.country = filters.country;
    }
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.patentType) {
      where.patentType = filters.patentType;
    }
    if (filters.isPrimary !== undefined) {
      where.isPrimary = filters.isPrimary;
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
      orderBy: { expiryDate: 'asc' },
    });
  }

  async getPatentsByCountry(country: 'IN' | 'US') {
    return prisma.patent.findMany({
      where: { country },
      orderBy: { expiryDate: 'asc' },
    });
  }

  async getExpiringPatents(yearsFromNow: number) {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + yearsFromNow);
    
    return prisma.patent.findMany({
      where: {
        expiryDate: {
          lte: futureDate,
          gte: new Date(),
        },
        status: 'Active',
      },
      orderBy: { expiryDate: 'asc' },
    });
  }
}

export const patentDataService = new PatentDataService();
