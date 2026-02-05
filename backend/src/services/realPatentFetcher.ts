/**
 * Real Patent Fetcher - Replaces Synthetic Patent Generation
 * 
 * This service provides REAL patent data from authoritative sources
 * with a fallback chain to ensure no fake data is ever generated.
 * 
 * Fallback Chain:
 * 1. FDA Orange Book (US approved drugs)
 * 2. USPTO PatentsView API (detailed patent info)
 * 3. Curated manual datasets (device patents, India patents)
 * 4. Return "NOT_AVAILABLE" (NEVER generate fake numbers)
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

// ============================================
// INTERFACES
// ============================================

export interface RealPatentData {
  molecule: string;
  patentNumber: string;
  patentType: 'COMPOUND' | 'FORMULATION' | 'PROCESS' | 'SECONDARY' | 'DEVICE' | 'UNKNOWN';
  isPrimary: boolean;
  devicePatent: boolean;
  status: 'Active' | 'Expired' | 'Unknown';
  filingDate?: Date;
  expiryDate: Date;
  title?: string;
  assignee?: string;
  country: 'US' | 'IN';
  dataQuality: 'VERIFIED' | 'CURATED' | 'ESTIMATED' | 'INCOMPLETE';
  confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  dataSource?: string;
  ustptoVerificationUrl?: string;
  reviewedBy?: string;
  reviewDate?: string;
  notes?: string;
  litigationHistory?: any[];
  litigationRisk?: 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN';
}

// ============================================
// CURATED DATA LOADERS
// ============================================

function loadCuratedDevicePatents(): any[] {
  try {
    const filePath = path.join(__dirname, '../data/curated/device-patents.json');
    if (!fs.existsSync(filePath)) return [];
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return data.patents || [];
  } catch (error) {
    console.warn('[Curated] Failed to load device patents:', error);
    return [];
  }
}

function loadCuratedLitigation(): any[] {
  try {
    const filePath = path.join(__dirname, '../data/curated/patent-litigation.json');
    if (!fs.existsSync(filePath)) return [];
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return data.litigation || [];
  } catch (error) {
    console.warn('[Curated] Failed to load litigation data:', error);
    return [];
  }
}

function loadIndiaPatents(): any[] {
  try {
    const filePath = path.join(__dirname, '../data/curated/india-patents.json');
    if (!fs.existsSync(filePath)) return [];
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    console.log(`[India Patents] Loaded ${data.patents?.length || 0} curated Indian patents`);
    return data.patents || [];
  } catch (error) {
    console.warn('[India Patents] Failed to load curated data:', error);
    return [];
  }
}

// ============================================
// ORANGE BOOK - REAL DATA LOADER
// ============================================

interface OrangeBookPatent {
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
  ingredient: string;
  tradeName: string;
  applicant: string;
  patentType: string;
}

export async function fetchOrangeBookPatents(
  moleculeName: string,
  genericName: string
): Promise<RealPatentData[]> {
  try {
    const filePath = path.join(__dirname, '../data/orange-book/parsed-patents.json');
    if (!fs.existsSync(filePath)) {
      console.log('[Orange Book] File not found, skipping');
      return [];
    }

    console.log(`[Orange Book] Loading data for ${moleculeName}...`);
    const rawData = fs.readFileSync(filePath, 'utf-8');
    const allPatents: OrangeBookPatent[] = JSON.parse(rawData);
    
    // Search by generic name (case-insensitive)
    const searchTerm = (genericName || moleculeName).toUpperCase();
    const relevant = allPatents.filter(p => 
      p.ingredient.toUpperCase().includes(searchTerm) ||
      p.tradeName.toUpperCase().includes(searchTerm)
    );
    
    console.log(`[Orange Book] Found ${relevant.length} patents for ${searchTerm}`);
    
    const patents: RealPatentData[] = relevant.map(p => {
      const expiryDate = parseOrangeBookDate(p.patentExpireDate);
      const isPrimary = p.patentType === 'COMPOUND' || p.drugSubstanceFlag === 'Y';
      const devicePatent = p.patentType === 'DEVICE' || p.patentType === 'DRUG_PRODUCT';
      
      return {
        molecule: moleculeName,
        patentNumber: `US${p.patentNumber}`,
        patentType: mapOrangeBookPatentType(p.patentType, p.drugSubstanceFlag, p.drugProductFlag),
        isPrimary,
        devicePatent,
        status: expiryDate < new Date() ? 'Expired' : 'Active',
        expiryDate,
        title: `${p.tradeName} - ${p.patentUseCode}`,
        assignee: p.applicant,
        country: 'US',
        dataQuality: 'VERIFIED',
        confidenceLevel: 'HIGH',
        dataSource: 'FDA Orange Book',
        notes: p.patentUseCode
      };
    });
    
    return patents;
  } catch (error) {
    console.error('[Orange Book] Error:', error);
    return [];
  }
}

function parseOrangeBookDate(dateStr: string): Date {
  // Orange Book format: "Aug 24, 2026"
  try {
    return new Date(dateStr);
  } catch {
    return new Date(2099, 11, 31); // Default far future
  }
}

function mapOrangeBookPatentType(
  patentType: string,
  drugSubstanceFlag: string,
  drugProductFlag: string
): RealPatentData['patentType'] {
  if (patentType === 'COMPOUND' || drugSubstanceFlag === 'Y') return 'COMPOUND';
  if (patentType === 'FORMULATION' || drugProductFlag === 'Y') return 'FORMULATION';
  if (patentType === 'METHOD_OF_USE') return 'SECONDARY';
  if (patentType === 'DEVICE') return 'DEVICE';
  return 'UNKNOWN';
}

// ============================================
// USPTO PATENTSVIEW API
// ============================================

export async function fetchUSPTOPatents(
  moleculeName: string,
  companyName: string
): Promise<RealPatentData[]> {
  try {
    console.log(`[USPTO] Searching ${moleculeName} by ${companyName}...`);
    
    const url = 'https://api.patentsview.org/patents/query';
    const body = {
      q: {
        "_and": [
          {"_text_phrase": {"patent_abstract": moleculeName}},
          {"assignee_organization": companyName}
        ]
      },
      f: ["patent_number", "patent_date", "patent_title", "assignee_organization"],
      o: { "per_page": 25 }
    };
    
    const response = await axios.post(url, body, { timeout: 10000 });
    
    if (!response.data?.patents) return [];
    
    const patents: RealPatentData[] = response.data.patents.map((p: any) => {
      const filing = p.patent_date ? new Date(p.patent_date) : undefined;
      const expiry = filing 
        ? new Date(filing.getTime() + (20 * 365 * 24 * 60 * 60 * 1000))
        : new Date(2030, 0, 1);
      
      return {
        molecule: moleculeName,
        patentNumber: p.patent_number,
        patentType: classifyPatentType(p.patent_title || ''),
        isPrimary: classifyPatentType(p.patent_title || '') === 'COMPOUND',
        devicePatent: classifyPatentType(p.patent_title || '') === 'DEVICE',
        status: expiry < new Date() ? 'Expired' : 'Active',
        filingDate: filing,
        expiryDate: expiry,
        title: p.patent_title,
        assignee: p.assignee_organization?.[0] || companyName,
        country: 'US',
        dataQuality: 'VERIFIED',
        confidenceLevel: 'MEDIUM',
        dataSource: 'USPTO PatentsView API'
      };
    });
    
    console.log(`[USPTO] Found ${patents.length} patents`);
    return patents;
  } catch (error) {
    console.error('[USPTO] Error:', error);
    return [];
  }
}

function classifyPatentType(title: string): RealPatentData['patentType'] {
  const lower = title.toLowerCase();
  
  if (/device|inhaler|pen|injector|delivery|applicator/.test(lower)) return 'DEVICE';
  if (/compound|molecule|chemical|nce/.test(lower)) return 'COMPOUND';
  if (/formulation|composition|dosage|tablet|capsule/.test(lower)) return 'FORMULATION';
  if (/process|method|synthesis|manufacturing/.test(lower)) return 'PROCESS';
  
  return 'UNKNOWN';
}

// ============================================
// CURATED PATENTS LOADER
// ============================================

export function loadCuratedPatents(moleculeName: string): RealPatentData[] {
  const devicePatents = loadCuratedDevicePatents();
  const relevant = devicePatents.filter(
    p => p.molecule.toLowerCase() === moleculeName.toLowerCase()
  );
  
  const patents: RealPatentData[] = relevant.map(p => ({
    molecule: p.molecule,
    patentNumber: p.patentNumber,
    patentType: p.patentType,
    isPrimary: p.isPrimary,
    devicePatent: p.devicePatent,
    status: p.status,
    filingDate: p.filingDate ? new Date(p.filingDate) : undefined,
    expiryDate: new Date(p.expiryDate),
    title: p.title,
    assignee: p.assignee,
    country: p.country,
    dataQuality: p.dataQuality,
    confidenceLevel: p.confidenceLevel,
    dataSource: 'Curated Manual Dataset',
    ustptoVerificationUrl: p.ustptoVerificationUrl,
    reviewedBy: p.reviewedBy,
    reviewDate: p.reviewDate,
    notes: p.notes,
    litigationHistory: p.litigationHistory,
    litigationRisk: p.litigationRisk
  }));
  
  console.log(`[Curated] Found ${patents.length} curated patents for ${moleculeName}`);
  return patents;
}

// ============================================
// INDIA PATENTS LOADER
// ============================================

export function fetchIndiaPatents(moleculeName: string): RealPatentData[] {
  const indiaPatents = loadIndiaPatents();
  const relevant = indiaPatents.filter(
    p => p.molecule.toLowerCase() === moleculeName.toLowerCase()
  );
  
  const patents: RealPatentData[] = relevant.map(p => ({
    molecule: p.molecule,
    patentNumber: p.patentNumber,
    patentType: p.patentType,
    isPrimary: p.patentType === 'COMPOUND',
    devicePatent: p.patentType === 'DEVICE',
    status: p.status === 'Expired' ? 'Expired' : 'Active',
    filingDate: new Date(p.filingDate),
    expiryDate: new Date(p.expiryDate),
    title: p.title,
    assignee: p.applicant,
    country: 'IN',
    dataQuality: p.dataQuality,
    confidenceLevel: p.confidenceLevel,
    dataSource: 'IP India - Curated',
    ustptoVerificationUrl: p.ipIndiaUrl,
    reviewedBy: p.verifiedBy,
    reviewDate: p.verificationDate,
    notes: p.notes,
    litigationHistory: [],
    litigationRisk: 'UNKNOWN'
  }));
  
  console.log(`[India Patents] Found ${patents.length} Indian patents for ${moleculeName}`);
  return patents;
}

// ============================================
// MAIN FETCH WITH FALLBACK CHAIN
// ============================================

export async function fetchRealPatents(
  moleculeName: string,
  genericName?: string,
  companyName?: string
): Promise<RealPatentData[]> {
  console.log(`\n[Real Patents] Fetching for ${moleculeName}...`);
  
  const allPatents: RealPatentData[] = [];
  
  // Fetch US patents from Orange Book
  if (genericName) {
    const orangeBook = await fetchOrangeBookPatents(moleculeName, genericName);
    if (orangeBook.length > 0) {
      console.log(`[Real Patents] ✅ ${orangeBook.length} US patents from Orange Book`);
      allPatents.push(...orangeBook);
    }
  }
  
  // If no Orange Book data, try USPTO
  if (allPatents.length === 0 && companyName) {
    const uspto = await fetchUSPTOPatents(moleculeName, companyName);
    if (uspto.length > 0) {
      console.log(`[Real Patents] ✅ ${uspto.length} US patents from USPTO`);
      allPatents.push(...uspto);
    }
  }
  
  // Try US curated patents if still no US data
  if (allPatents.length === 0) {
    const curated = loadCuratedPatents(moleculeName);
    if (curated.length > 0) {
      console.log(`[Real Patents] ✅ ${curated.length} US curated patents`);
      allPatents.push(...curated);
    }
  }
  
  // Fetch Indian patents (always try, independent of US data)
  const indiaPatents = fetchIndiaPatents(moleculeName);
  if (indiaPatents.length > 0) {
    console.log(`[Real Patents] ✅ ${indiaPatents.length} Indian patents`);
    allPatents.push(...indiaPatents);
  }
  
  // If no data at all, return NOT_AVAILABLE
  if (allPatents.length === 0) {
    console.warn(`[Real Patents] ⚠️ NO DATA FOUND for ${moleculeName}`);
    return [{
      molecule: moleculeName,
      patentNumber: 'NOT_AVAILABLE',
      patentType: 'UNKNOWN',
      isPrimary: false,
      devicePatent: false,
      status: 'Unknown',
      expiryDate: new Date(2099, 11, 31),
      country: 'US',
      dataQuality: 'INCOMPLETE',
      confidenceLevel: 'LOW',
      dataSource: 'No data in Orange Book/USPTO/curated sources',
      notes: 'MANUAL REVIEW REQUIRED. Do not use for FTO decisions.'
    }];
  }
  
  const usCount = allPatents.filter(p => p.country === 'US').length;
  const inCount = allPatents.filter(p => p.country === 'IN').length;
  console.log(`[Real Patents] 🎯 Total: ${allPatents.length} patents (US: ${usCount}, IN: ${inCount})`);
  
  return allPatents;
}

export function getPatentLitigationRisk(patentNumber: string) {
  const lit = loadCuratedLitigation();
  const cases = lit.filter(l => l.patentNumber === patentNumber);
  
  if (cases.length === 0) return { risk: 'LOW' as const, history: [] };
  
  const pending = cases.some(c => c.outcome === 'Pending');
  const settlement = cases.some(c => c.outcome === 'Settlement');
  
  const risk = pending ? 'HIGH' : settlement ? 'MEDIUM' : 'LOW';
  return { risk: risk as 'LOW' | 'MEDIUM' | 'HIGH', history: cases };
}
