/**
 * XLSX Report Generator
 * ──────────────────────
 * Generates a real .xlsx file using ExcelJS from a report's data_snapshot.
 * Returns a Buffer containing the XLSX binary.
 *
 * Sheets:
 *   Overview   — summary totals
 *   By Provider — spend/tokens/requests per provider
 *   By Model    — spend/tokens/requests per model (sorted by cost)
 *   Raw Logs    — up to 1000 raw rows from data_snapshot.rows
 */

import ExcelJS from 'exceljs';

const BRAND_COLOR  = '6366f1';
const HEADER_FONT  = { color: { argb: 'FFFFFFFF' }, bold: true, size: 11 };
const HEADER_FILL  = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${BRAND_COLOR}` } };
const ALT_FILL     = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
const BORDER       = { style: 'thin', color: { argb: 'FFE5E7EB' } };
const ALL_BORDERS  = { top: BORDER, left: BORDER, bottom: BORDER, right: BORDER };

/**
 * Generate an XLSX Buffer from a saved report object.
 *
 * @param {Object} report   - Row from the `reports` table (with data_snapshot loaded)
 * @param {string} orgName  - Organization display name
 * @returns {Promise<Buffer>}
 */
export async function generateXLSX(report, orgName = 'Your Organization') {
  const wb   = new ExcelJS.Workbook();
  wb.creator = 'Ordisum';
  wb.created = new Date();

  const snap       = report.data_snapshot ?? {};
  const totals     = snap.totals     ?? {};
  const byProvider = snap.byProvider ?? {};
  const byModel    = snap.byModel    ?? {};
  const rows       = snap.rows       ?? [];

  // ─── Sheet 1: Overview ─────────────────────────────────────────────────
  const overviewWs = wb.addWorksheet('Overview');
  overviewWs.columns = [
    { width: 30 },
    { width: 30 },
  ];

  // Title block
  overviewWs.mergeCells('A1:B1');
  const titleCell = overviewWs.getCell('A1');
  titleCell.value     = 'Ordisum — AI Cost & Usage Report';
  titleCell.font      = { bold: true, size: 14, color: { argb: `FF${BRAND_COLOR}` } };
  titleCell.alignment = { horizontal: 'center' };

  overviewWs.getCell('A3').value = 'Report Name';
  overviewWs.getCell('B3').value = report.name;
  overviewWs.getCell('A4').value = 'Organization';
  overviewWs.getCell('B4').value = orgName;
  overviewWs.getCell('A5').value = 'Period';
  overviewWs.getCell('B5').value = report.date_range_start && report.date_range_end
    ? `${report.date_range_start} → ${report.date_range_end}`
    : 'All time';
  overviewWs.getCell('A6').value = 'Generated At';
  overviewWs.getCell('B6').value = snap.generatedAt ? new Date(snap.generatedAt).toUTCString() : new Date().toUTCString();
  overviewWs.getCell('A7').value = 'Report Type';
  overviewWs.getCell('B7').value = report.type ?? 'usage';

  for (let r = 3; r <= 7; r++) {
    overviewWs.getCell(`A${r}`).font = { bold: true };
    overviewWs.getCell(`A${r}`).fill = ALT_FILL;
  }

  // Totals
  addHeaderRow(overviewWs, 9, ['Metric', 'Value']);
  const summaryRows = [
    ['Total Requests',  totals.totalRequests ?? 0],
    ['Total Tokens',    totals.totalTokens   ?? 0],
    ['Total Cost (USD)', `$${Number(totals.totalCost ?? 0).toFixed(4)}`],
  ];
  summaryRows.forEach((row, i) => {
    const wsRow = overviewWs.addRow(row);
    if (i % 2 === 0) wsRow.eachCell(c => { c.fill = ALT_FILL; });
    wsRow.eachCell(c => { c.border = ALL_BORDERS; });
  });

  // ─── Sheet 2: By Provider ─────────────────────────────────────────────
  const providerWs = wb.addWorksheet('By Provider');
  providerWs.columns = [
    { header: '', key: 'provider',  width: 25 },
    { header: '', key: 'requests',  width: 18 },
    { header: '', key: 'tokens',    width: 20 },
    { header: '', key: 'cost',      width: 20 },
  ];
  addHeaderRow(providerWs, 1, ['Provider', 'Requests', 'Tokens', 'Cost (USD)']);

  Object.entries(byProvider).forEach(([provider, data], i) => {
    const row = providerWs.addRow([
      provider,
      data.requests ?? 0,
      data.tokens   ?? 0,
      `$${Number(data.cost ?? 0).toFixed(4)}`,
    ]);
    if (i % 2 === 0) row.eachCell(c => { c.fill = ALT_FILL; });
    row.eachCell(c => { c.border = ALL_BORDERS; });
  });

  // ─── Sheet 3: By Model ──────────────────────────────────────────────
  const modelWs = wb.addWorksheet('By Model');
  modelWs.columns = [
    { key: 'model',    width: 40 },
    { key: 'requests', width: 18 },
    { key: 'tokens',   width: 20 },
    { key: 'cost',     width: 20 },
  ];
  addHeaderRow(modelWs, 1, ['Model', 'Requests', 'Tokens', 'Cost (USD)']);

  const sortedModels = Object.entries(byModel)
    .sort((a, b) => (b[1].cost ?? 0) - (a[1].cost ?? 0));

  sortedModels.forEach(([model, data], i) => {
    const row = modelWs.addRow([
      model,
      data.requests ?? 0,
      data.tokens   ?? 0,
      `$${Number(data.cost ?? 0).toFixed(4)}`,
    ]);
    if (i % 2 === 0) row.eachCell(c => { c.fill = ALT_FILL; });
    row.eachCell(c => { c.border = ALL_BORDERS; });
  });

  // ─── Sheet 4: Raw Logs (capped at 1000) ───────────────────────────
  if (rows.length > 0) {
    const rawWs = wb.addWorksheet('Raw Logs');
    rawWs.columns = [
      { key: 'logged_at', width: 28 },
      { key: 'provider',  width: 18 },
      { key: 'model',     width: 38 },
      { key: 'input',     width: 18 },
      { key: 'output',    width: 18 },
      { key: 'total',     width: 18 },
      { key: 'cost',      width: 18 },
      { key: 'latency',   width: 16 },
    ];
    addHeaderRow(rawWs, 1, [
      'Logged At', 'Provider', 'Model',
      'Input Tokens', 'Output Tokens', 'Total Tokens',
      'Cost (USD)', 'Latency (ms)',
    ]);

    rows.slice(0, 1000).forEach((r, i) => {
      const row = rawWs.addRow([
        r.logged_at ?? '',
        r.provider  ?? '',
        r.model     ?? '',
        r.input_tokens  ?? 0,
        r.output_tokens ?? 0,
        r.total_tokens  ?? 0,
        `$${Number(r.cost_usd ?? 0).toFixed(6)}`,
        r.latency_ms ?? 0,
      ]);
      if (i % 2 === 0) row.eachCell(c => { c.fill = ALT_FILL; });
      row.eachCell(c => { c.border = ALL_BORDERS; });
    });
  }

  // ─── Return buffer ─────────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/** Add a styled header row at a specific row number */
function addHeaderRow(ws, rowNum, labels) {
  const row = ws.getRow(rowNum);
  labels.forEach((label, i) => {
    const cell = row.getCell(i + 1);
    cell.value  = label;
    cell.font   = HEADER_FONT;
    cell.fill   = HEADER_FILL;
    cell.border = ALL_BORDERS;
    cell.alignment = { horizontal: 'left', vertical: 'middle' };
  });
  row.height = 22;
  row.commit();
}
