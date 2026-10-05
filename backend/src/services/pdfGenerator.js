/**
 * PDF Report Generator
 * ─────────────────────
 * Generates a real PDF from a report's data_snapshot using PDFKit.
 * Returns a Buffer containing the PDF binary.
 *
 * Usage:
 *   import { generatePDF } from './pdfGenerator.js';
 *   const pdfBuffer = await generatePDF(report);
 *   res.set('Content-Type', 'application/pdf');
 *   res.set('Content-Disposition', `attachment; filename="${report.name}.pdf"`);
 *   res.send(pdfBuffer);
 */

import PDFDocument from 'pdfkit';

const BRAND_PURPLE  = '#6366f1';
const TEXT_DARK     = '#111827';
const TEXT_MUTED    = '#6b7280';
const BORDER_COLOR  = '#e5e7eb';
const BG_LIGHT      = '#f9fafb';

/**
 * Generate a PDF Buffer from a saved report object.
 *
 * @param {Object} report          - Row from the `reports` table (with data_snapshot loaded)
 * @param {string} [orgName]       - Organization display name
 * @returns {Promise<Buffer>}
 */
export function generatePDF(report, orgName = 'Your Organization') {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size:    'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      info: {
        Title:   report.name,
        Author:  'Ordisum',
        Subject: 'AI Cost & Usage Report',
      },
    });

    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end',  () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const snap = report.data_snapshot ?? {};
    const totals    = snap.totals    ?? {};
    const byProvider = snap.byProvider ?? {};
    const byModel    = snap.byModel    ?? {};

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    // ─── Header ───────────────────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 80).fill(BRAND_PURPLE);
    doc.fillColor('#ffffff')
       .fontSize(22).font('Helvetica-Bold')
       .text('Ordisum', 50, 20);
    doc.fontSize(11).font('Helvetica')
       .text('AI Cost & Usage Report', 50, 46);

    doc.fillColor(TEXT_DARK);

    // ─── Report metadata ──────────────────────────────────────────────────
    let y = 100;
    doc.fontSize(18).font('Helvetica-Bold').fillColor(TEXT_DARK)
       .text(report.name, 50, y);
    y += 28;

    doc.fontSize(10).font('Helvetica').fillColor(TEXT_MUTED);
    if (report.date_range_start && report.date_range_end) {
      doc.text(`Period: ${report.date_range_start} → ${report.date_range_end}`, 50, y);
      y += 16;
    }
    doc.text(`Organization: ${orgName}`, 50, y); y += 16;
    doc.text(`Report Type: ${report.type ?? 'usage'}`, 50, y); y += 16;
    doc.text(`Generated: ${snap.generatedAt ? new Date(snap.generatedAt).toUTCString() : new Date().toUTCString()}`, 50, y);
    y += 30;

    // ─── Summary boxes ────────────────────────────────────────────────────
    drawSectionHeader(doc, 'Summary', y); y += 30;

    const summaryCards = [
      { label: 'Total Requests',  value: (totals.totalRequests ?? 0).toLocaleString() },
      { label: 'Total Tokens',    value: (totals.totalTokens ?? 0).toLocaleString() },
      { label: 'Total Cost',      value: `$${Number(totals.totalCost ?? 0).toFixed(4)}` },
    ];

    const cardW = (pageWidth - 20) / 3;
    summaryCards.forEach((card, i) => {
      const cx = 50 + i * (cardW + 10);
      doc.rect(cx, y, cardW, 55).fill(BG_LIGHT);
      doc.fillColor(TEXT_MUTED).fontSize(10).font('Helvetica')
         .text(card.label, cx + 10, y + 10);
      doc.fillColor(TEXT_DARK).fontSize(18).font('Helvetica-Bold')
         .text(card.value, cx + 10, y + 25);
    });
    doc.fillColor(TEXT_DARK);
    y += 80;

    // ─── By Provider ─────────────────────────────────────────────────────
    const providerEntries = Object.entries(byProvider);
    if (providerEntries.length > 0) {
      drawSectionHeader(doc, 'Usage by Provider', y); y += 30;
      const headers = ['Provider', 'Requests', 'Tokens', 'Cost (USD)'];
      const colW    = [pageWidth * 0.35, pageWidth * 0.20, pageWidth * 0.22, pageWidth * 0.23];
      y = drawTableHeader(doc, headers, colW, y);

      for (const [provider, data] of providerEntries) {
        if (y > doc.page.height - 100) { doc.addPage(); y = 60; }
        y = drawTableRow(doc, [
          provider,
          (data.requests ?? 0).toLocaleString(),
          (data.tokens   ?? 0).toLocaleString(),
          `$${Number(data.cost ?? 0).toFixed(4)}`,
        ], colW, y);
      }
      y += 20;
    }

    // ─── By Model ────────────────────────────────────────────────────────
    const modelEntries = Object.entries(byModel);
    if (modelEntries.length > 0) {
      if (y > doc.page.height - 150) { doc.addPage(); y = 60; }
      drawSectionHeader(doc, 'Usage by Model', y); y += 30;
      const headers = ['Model', 'Requests', 'Tokens', 'Cost (USD)'];
      const colW    = [pageWidth * 0.40, pageWidth * 0.18, pageWidth * 0.20, pageWidth * 0.22];
      y = drawTableHeader(doc, headers, colW, y);

      // Sort by cost desc
      const sorted = modelEntries.sort((a, b) => (b[1].cost ?? 0) - (a[1].cost ?? 0));
      for (const [model, data] of sorted.slice(0, 30)) {
        if (y > doc.page.height - 80) { doc.addPage(); y = 60; }
        y = drawTableRow(doc, [
          model,
          (data.requests ?? 0).toLocaleString(),
          (data.tokens   ?? 0).toLocaleString(),
          `$${Number(data.cost ?? 0).toFixed(4)}`,
        ], colW, y);
      }
      y += 20;
    }

    // ─── Empty state ──────────────────────────────────────────────────────
    if (snap.isEmpty) {
      if (y > doc.page.height - 100) { doc.addPage(); y = 60; }
      doc.fillColor(TEXT_MUTED).fontSize(12).font('Helvetica')
         .text('No usage data found for the selected filters and date range.', 50, y, { align: 'center' });
    }

    // ─── Footer ───────────────────────────────────────────────────────────
    const pageCount = doc.bufferedPageRange?.().count ?? 1;
    doc.fillColor(TEXT_MUTED).fontSize(9)
       .text(`Generated by Ordisum · ordisum.com · Page 1 of ${pageCount}`,
             50, doc.page.height - 40, { align: 'center', width: pageWidth });

    doc.end();
  });
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function drawSectionHeader(doc, title, y) {
  doc.fillColor(BRAND_PURPLE).fontSize(13).font('Helvetica-Bold')
     .text(title, 50, y);
  doc.moveTo(50, y + 18).lineTo(50 + doc.page.width - 100, y + 18)
     .strokeColor(BORDER_COLOR).lineWidth(1).stroke();
}

function drawTableHeader(doc, headers, colW, y) {
  doc.rect(50, y, colW.reduce((a, b) => a + b, 0), 24).fill(BRAND_PURPLE);
  let x = 50;
  headers.forEach((h, i) => {
    doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold')
       .text(h, x + 6, y + 7, { width: colW[i] - 10, ellipsis: true });
    x += colW[i];
  });
  return y + 24;
}

function drawTableRow(doc, cells, colW, y) {
  const rowH  = 22;
  const total = colW.reduce((a, b) => a + b, 0);
  doc.rect(50, y, total, rowH).strokeColor(BORDER_COLOR).lineWidth(0.5).stroke();
  let x = 50;
  cells.forEach((cell, i) => {
    doc.fillColor(TEXT_DARK).fontSize(10).font('Helvetica')
       .text(String(cell), x + 6, y + 6, { width: colW[i] - 10, ellipsis: true });
    x += colW[i];
  });
  return y + rowH;
}
