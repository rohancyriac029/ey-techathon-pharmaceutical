import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { pdfService } from '../services/pdfService';
import fs from 'fs';

const router = Router();
const prisma = new PrismaClient();

// GET /api/jobs/:id/report - Get report JSON
router.get('/:jobId/report', async (req, res) => {
  try {
    const job = await prisma.job.findUnique({
      where: { id: req.params.jobId },
      include: { report: true },
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Handle cache hit: if job.report is null but resultId exists, fetch the cached report
    let report = job.report;
    if (!report && job.resultId) {
      report = await prisma.report.findUnique({
        where: { id: job.resultId },
      });
    }

    if (!report) {
      return res.status(404).json({ error: 'Report not found for this job' });
    }

    const reportData = report.data ? JSON.parse(report.data) : null;

    // Return NEW decision-driven format with legacy fallbacks
    res.json({
      reportId: report.id,
      queryText: job.queryText,
      summary: report.summary,
      
      // PRIMARY OUTPUT: Commercial Decisions
      decisions: reportData?.decisions || [],
      marketOverview: reportData?.marketOverview || { 
        totalAddressableMarketUSD: 0, 
        byIndication: [] 
      },
      strategySummary: reportData?.strategySummary || { 
        license: [], 
        generic: [], 
        wait: [], 
        drop: [] 
      },
      upcomingPatentExpiries: reportData?.upcomingPatentExpiries || [],
      
      // NEW: Patient-level epidemiology data
      epidemiologyOverview: reportData?.epidemiologyOverview || null,
      
      recommendations: reportData?.recommendations || [],
      pdfUrl: `/api/reports/${report.id}/pdf`,
      createdAt: report.createdAt,
      
      // Legacy fields (for backward compatibility)
      confidence: report.confidence,
      opportunities: reportData?.opportunities || [],
      trialsSummary: reportData?.trialsSummary || { byMolecule: [] },
      patentSummary: reportData?.patentSummary || { byMolecule: [] },
      confidenceDecomposition: reportData?.confidenceDecomposition || null,
      marketInsights: reportData?.marketInsights || null,
      patentCliff: reportData?.patentCliff || null,
      suggestedQueries: reportData?.suggestedQueries || [],
    });
  } catch (error) {
    console.error('Get report error:', error);
    res.status(500).json({ error: 'Failed to retrieve report' });
  }
});

// GET /api/reports/:id/pdf - Stream PDF file
router.get('/:reportId/pdf', async (req, res) => {
  try {
    const report = await prisma.report.findUnique({
      where: { id: req.params.reportId },
      include: { job: true },
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    if (!report.pdfPath || !fs.existsSync(report.pdfPath)) {
      return res.status(404).json({ error: 'PDF not found' });
    }

    // Generate meaningful filename from query text
    let filename = 'pharma-analysis-report';
    if (report.job?.queryText) {
      // Extract key terms and sanitize for filename
      filename = report.job.queryText
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
        .replace(/\s+/g, '-')           // Replace spaces with hyphens
        .substring(0, 50)               // Limit length
        .replace(/-+$/, '');            // Remove trailing hyphens
      
      // Add timestamp for uniqueness
      const timestamp = new Date().toISOString().split('T')[0];
      filename = `${filename}-${timestamp}`;
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
    
    const stream = fs.createReadStream(report.pdfPath);
    stream.pipe(res);
  } catch (error) {
    console.error('PDF stream error:', error);
    res.status(500).json({ error: 'Failed to stream PDF' });
  }
});

export default router;
