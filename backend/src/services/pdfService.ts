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
      doc.fontSize(24).fillColor('#1a365d').text('Pharmaceutical BD Intelligence Report', { align: 'center' });
      doc.moveDown();

      // Query
      doc.fontSize(12).fillColor('#4a5568').text('Query:', { underline: true });
      doc.fontSize(11).fillColor('#2d3748').text(payload.queryText);
      doc.moveDown();

      // Executive Summary
      doc.fontSize(14).fillColor('#1a365d').text('Executive Summary', { underline: true });
      doc.fontSize(11).fillColor('#2d3748').text(payload.summary);
      doc.moveDown(2);

      // Strategy Summary
      doc.fontSize(14).fillColor('#1a365d').text('Commercial Strategy Overview', { underline: true });
      doc.moveDown(0.5);

      if (payload.strategySummary) {
        if (payload.strategySummary.generic.length > 0) {
          doc.fontSize(11).fillColor('#38a169').text(`✓ GENERIC Opportunities: ${payload.strategySummary.generic.join(', ')}`);
        }
        if (payload.strategySummary.license.length > 0) {
          doc.fontSize(11).fillColor('#3182ce').text(`✓ LICENSE Opportunities: ${payload.strategySummary.license.join(', ')}`);
        }
        if (payload.strategySummary.wait.length > 0) {
          doc.fontSize(11).fillColor('#d69e2e').text(`○ WAIT (Monitor): ${payload.strategySummary.wait.join(', ')}`);
        }
        if (payload.strategySummary.drop.length > 0) {
          doc.fontSize(11).fillColor('#e53e3e').text(`✗ DROP (Not Recommended): ${payload.strategySummary.drop.join(', ')}`);
        }
      }
      doc.moveDown(2);

      // Market Overview
      if (payload.marketOverview) {
        doc.fontSize(14).fillColor('#1a365d').text('Drug Market Overview', { underline: true });
        doc.moveDown(0.5);
        
        // Format market size appropriately
        const totalMarket = payload.marketOverview.totalAddressableMarketUSD;
        const formattedTotal = totalMarket >= 1_000_000_000 
          ? `$${(totalMarket / 1_000_000_000).toFixed(1)}B` 
          : `$${(totalMarket / 1_000_000).toFixed(0)}M`;
          
        doc.fontSize(11).fillColor('#2d3748')
          .text(`Total Drug Market Opportunity: ${formattedTotal} (Combined IN + US)`);
        
        if (payload.marketOverview.byIndication) {
          doc.fontSize(10).fillColor('#4a5568').text('By Therapeutic Area:');
          payload.marketOverview.byIndication.forEach(ind => {
            const inMarket = ind.marketSizeIN >= 1_000_000_000 
              ? `$${(ind.marketSizeIN / 1_000_000_000).toFixed(1)}B` 
              : `$${(ind.marketSizeIN / 1_000_000).toFixed(0)}M`;
            const usMarket = ind.marketSizeUS >= 1_000_000_000 
              ? `$${(ind.marketSizeUS / 1_000_000_000).toFixed(1)}B` 
              : `$${(ind.marketSizeUS / 1_000_000).toFixed(0)}M`;
            doc.fontSize(10).fillColor('#4a5568')
              .text(`  • ${ind.indication}: India ${inMarket} | US ${usMarket}`);
          });
        }
        doc.moveDown(2);
      }

      // Molecule Decisions
      if (payload.decisions && payload.decisions.length > 0) {
        doc.fontSize(14).fillColor('#1a365d').text('Molecule-Level Recommendations', { underline: true });
        doc.moveDown(0.5);

        payload.decisions.forEach((decision, index) => {
          const strategyColor = decision.overallStrategy === 'GENERIC' ? '#38a169' :
            decision.overallStrategy === 'LICENSE' ? '#3182ce' :
            decision.overallStrategy === 'WAIT' ? '#d69e2e' : '#e53e3e';

          doc.fontSize(12).fillColor('#2b6cb0').text(`${index + 1}. ${decision.molecule} (${decision.indication})`);
          doc.fontSize(10).fillColor(strategyColor)
            .text(`   Strategy: ${decision.overallStrategy} | Risk: ${decision.overallRisk} | Innovator: ${decision.innovator}`);
          
          // Country-specific recommendations
          decision.recommendations.forEach(rec => {
            const goColor = rec.goNoGo === 'GO' ? '#38a169' : rec.goNoGo === 'CONDITIONAL' ? '#d69e2e' : '#e53e3e';
            doc.fontSize(9).fillColor(goColor)
              .text(`   ${rec.country}: ${rec.strategy} - ${rec.goNoGo} | Revenue: $${(rec.estimatedRevenueUSD / 1_000_000).toFixed(0)}M | Entry: ${rec.timeToMarketYears.toFixed(1)} yrs`);
          });

          doc.fontSize(9).fillColor('#718096').text(`   FTO: ${decision.ftoSummary}`);
          doc.moveDown(0.5);
        });
        doc.moveDown();
      }

      // Upcoming Patent Expiries
      if (payload.upcomingPatentExpiries && payload.upcomingPatentExpiries.length > 0) {
        doc.fontSize(14).fillColor('#1a365d').text('Upcoming Patent Expiries', { underline: true });
        doc.moveDown(0.5);

        payload.upcomingPatentExpiries.forEach(expiry => {
          doc.fontSize(10).fillColor('#4a5568')
            .text(`• ${expiry.molecule} (${expiry.country}): ${expiry.expiryDate} (${expiry.yearsToExpiry.toFixed(1)} years)`);
        });
        doc.moveDown();
      }

      // Recommendations
      doc.fontSize(14).fillColor('#1a365d').text('Action Items', { underline: true });
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
