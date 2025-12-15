import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { ReportPayload } from '../types/report';

const REPORTS_DIR = path.join(__dirname, '../../reports');

// Ensure reports directory exists
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

class PdfService {
  async generatePdf(reportId: string, payload: ReportPayload): Promise<string> {
    const filePath = path.join(REPORTS_DIR, `${reportId}.pdf`);
    
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const stream = fs.createWriteStream(filePath);
      
      doc.pipe(stream);

      // Title
      doc.fontSize(24).fillColor('#1a365d').text('Pharmaceutical Intelligence Report', { align: 'center' });
      doc.moveDown();

      // Query
      doc.fontSize(12).fillColor('#4a5568').text('Query:', { underline: true });
      doc.fontSize(11).fillColor('#2d3748').text(payload.queryText);
      doc.moveDown();

      // Confidence Score
      doc.fontSize(14).fillColor('#1a365d').text(`Overall Confidence: ${(payload.confidence * 100).toFixed(1)}%`);
      doc.moveDown();

      // Executive Summary
      doc.fontSize(14).fillColor('#1a365d').text('Executive Summary', { underline: true });
      doc.fontSize(11).fillColor('#2d3748').text(payload.summary);
      doc.moveDown(2);

      // Opportunities Table
      doc.fontSize(14).fillColor('#1a365d').text('Top Opportunities', { underline: true });
      doc.moveDown(0.5);

      payload.opportunities.forEach((opp, index) => {
        doc.fontSize(12).fillColor('#2b6cb0').text(`${index + 1}. ${opp.molecule}`);
        doc.fontSize(10).fillColor('#4a5568')
          .text(`   Rank: ${opp.rank} | Confidence: ${(opp.confidence * 100).toFixed(0)}% | FTO Risk: ${opp.ftoFlag}`);
        doc.fontSize(10).fillColor('#718096').text(`   ${opp.rationale}`);
        doc.moveDown(0.5);
      });

      doc.moveDown();

      // Clinical Trials Summary
      doc.fontSize(14).fillColor('#1a365d').text('Clinical Trials Summary', { underline: true });
      doc.moveDown(0.5);

      payload.trialsSummary.byMolecule.slice(0, 10).forEach((mol) => {
        doc.fontSize(11).fillColor('#2b6cb0').text(`• ${mol.molecule}: ${mol.trialCount} trial(s)`);
        const phases = Object.entries(mol.phases).map(([p, c]) => `${p}: ${c}`).join(', ');
        doc.fontSize(9).fillColor('#718096').text(`  Phases: ${phases}`);
      });

      doc.moveDown();

      // Patent Summary
      doc.fontSize(14).fillColor('#1a365d').text('Patent Landscape', { underline: true });
      doc.moveDown(0.5);

      payload.patentSummary.byMolecule.slice(0, 10).forEach((mol) => {
        const ftoColor = mol.ftoFlag === 'LOW' ? '#38a169' : mol.ftoFlag === 'MEDIUM' ? '#d69e2e' : '#e53e3e';
        doc.fontSize(11).fillColor('#2b6cb0').text(`• ${mol.molecule}`);
        doc.fontSize(9).fillColor(ftoColor).text(`  FTO Risk: ${mol.ftoFlag} | Earliest Expiry: ${mol.earliestExpiry}`);
        doc.fontSize(9).fillColor('#718096').text(`  Jurisdictions: ${mol.jurisdictions.join(', ')}`);
      });

      doc.moveDown();

      // Recommendations
      doc.fontSize(14).fillColor('#1a365d').text('Recommendations', { underline: true });
      doc.moveDown(0.5);

      payload.recommendations.forEach((rec, index) => {
        doc.fontSize(10).fillColor('#2d3748').text(`${index + 1}. ${rec}`);
      });

      // Footer
      doc.moveDown(2);
      doc.fontSize(8).fillColor('#a0aec0')
        .text(`Generated on ${new Date().toISOString()} | Report ID: ${reportId}`, { align: 'center' });

      doc.end();

      stream.on('finish', () => resolve(filePath));
      stream.on('error', reject);
    });
  }

  getPdfPath(reportId: string): string {
    return path.join(REPORTS_DIR, `${reportId}.pdf`);
  }

  pdfExists(reportId: string): boolean {
    return fs.existsSync(this.getPdfPath(reportId));
  }
}

export const pdfService = new PdfService();
