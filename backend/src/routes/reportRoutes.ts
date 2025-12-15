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

    res.json({
      reportId: report.id,
      queryText: job.queryText,
      summary: report.summary,
      confidence: report.confidence,
      opportunities: reportData?.opportunities || [],
      trialsSummary: reportData?.trialsSummary || { byMolecule: [] },
      patentSummary: reportData?.patentSummary || { byMolecule: [] },
      recommendations: reportData?.recommendations || [],
      pdfUrl: `/api/reports/${report.id}/pdf`,
      createdAt: report.createdAt,
      // Enhanced fields
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
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    if (!report.pdfPath || !fs.existsSync(report.pdfPath)) {
      return res.status(404).json({ error: 'PDF not found' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="report-${report.id}.pdf"`);
    
    const stream = fs.createReadStream(report.pdfPath);
    stream.pipe(res);
  } catch (error) {
    console.error('PDF stream error:', error);
    res.status(500).json({ error: 'Failed to stream PDF' });
  }
});

export default router;
