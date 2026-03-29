import { fmt, pct, MONTHS } from './budget-utils';

// ============================================================================
// HELPERS
// ============================================================================

const COLORS = {
  headerBg: '0A1628',
  gold: 'C5A55A',
  white: 'FFFFFF',
  gray100: 'F3F4F6',
  gray200: 'E5E7EB',
  gray400: '9CA3AF',
  gray700: '374151',
  greenBg: 'ECFDF5',
  greenText: '065F46',
  greenAccent: '059669',
  redBg: 'FEF2F2',
  redText: '991B1B',
  redAccent: 'DC2626',
  amberBg: 'FFFBEB',
  amberText: '92400E',
  amberAccent: 'D97706',
  blueBg: 'EFF6FF',
  blueText: '2563EB',
};

const SECTION_STYLES = {
  revenues: { bg: COLORS.greenBg, text: COLORS.greenText, accent: COLORS.greenAccent },
  opex: { bg: COLORS.redBg, text: COLORS.redText, accent: COLORS.redAccent },
  capex: { bg: COLORS.amberBg, text: COLORS.amberText, accent: COLORS.amberAccent },
};

function rawNum(v) {
  if (v === null || v === undefined || isNaN(v)) return 0;
  return Math.round(v);
}

async function createWorkbook() {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Institut Pasteur de Dakar';
  wb.created = new Date();
  return wb;
}

function addTitleRow(ws, title, colCount) {
  const row = ws.addRow([title]);
  ws.mergeCells(ws.rowCount, 1, ws.rowCount, colCount);
  row.height = 30;
  row.font = { name: 'Calibri', size: 14, bold: true, color: { argb: COLORS.gold } };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
  row.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  return row;
}

function addSubtitleRow(ws, text, colCount) {
  const row = ws.addRow([text]);
  ws.mergeCells(ws.rowCount, 1, ws.rowCount, colCount);
  row.height = 20;
  row.font = { name: 'Calibri', size: 9, color: { argb: COLORS.gray400 } };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
  row.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
}

function addHeaderRow(ws, headers) {
  const row = ws.addRow(headers);
  row.height = 22;
  row.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: COLORS.white } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = { bottom: { style: 'thin', color: { argb: COLORS.gray200 } } };
  });
  // First column left-aligned
  row.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  return row;
}

function addSectionHeader(ws, title, colCount, type) {
  const style = SECTION_STYLES[type];
  const row = ws.addRow([title]);
  ws.mergeCells(ws.rowCount, 1, ws.rowCount, colCount);
  row.height = 22;
  row.font = { name: 'Calibri', size: 10, bold: true, color: { argb: style.text } };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: style.bg } };
  row.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
}

function addDataRow(ws, values, isAlternate) {
  const row = ws.addRow(values);
  row.height = 20;
  row.eachCell((cell, colNumber) => {
    cell.font = { name: 'Calibri', size: 9, color: { argb: colNumber === 1 ? COLORS.gray700 : '111111' } };
    if (isAlternate) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F9FAFB' } };
    }
    cell.alignment = { vertical: 'middle', horizontal: colNumber === 1 ? 'left' : 'right' };
    if (colNumber === 1) cell.alignment.indent = 1;
    cell.border = { bottom: { style: 'hair', color: { argb: COLORS.gray200 } } };
    // Format numbers
    if (colNumber > 1 && typeof cell.value === 'number') {
      cell.numFmt = '#,##0';
      if (cell.value < 0) {
        cell.font = { ...cell.font, color: { argb: COLORS.redAccent } };
      }
    }
  });
  return row;
}

function addTotalRow(ws, values, type) {
  const style = SECTION_STYLES[type];
  const row = ws.addRow(values);
  row.height = 24;
  row.eachCell((cell, colNumber) => {
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: colNumber === 1 ? COLORS.gray700 : style.accent } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.gray100 } };
    cell.alignment = { vertical: 'middle', horizontal: colNumber === 1 ? 'left' : 'right' };
    if (colNumber === 1) cell.alignment.indent = 1;
    cell.border = {
      top: { style: 'thin', color: { argb: COLORS.gray200 } },
      bottom: { style: 'medium', color: { argb: style.accent } },
    };
    if (colNumber > 1 && typeof cell.value === 'number') {
      cell.numFmt = '#,##0';
    }
  });
  return row;
}

function addEmptyRow(ws) {
  const row = ws.addRow([]);
  row.height = 6;
}

async function downloadWorkbook(wb, filename) {
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function sanitizeName(name) {
  return name.replace(/[^a-zA-Z0-9\u00C0-\u024F]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
}

// ============================================================================
// CONSOLIDATED EXCEL
// ============================================================================
export async function exportConsolidatedExcel({ year, years: YEARS, budget, budgetLines, buList, buStructure, historical, consolidated, inMillions }) {
  const M = inMillions;
  const yr = year;
  const years = YEARS || [yr];
  const prevYr = yr === "2026" ? null : String(Number(yr) - 1);
  const refLabel = yr === "2026" ? "2025 (Est.)" : String(Number(yr) - 1);
  const ALL_LINES = [...budgetLines.revenues, ...budgetLines.opex, ...budgetLines.capex];

  const wb = await createWorkbook();

  // === Sheet 1: Consolidated ===
  const ws = wb.addWorksheet('Consolide');
  const yearHeaders = years.map(y => `Budget ${y}`);
  const colCount = 1 + years.length + 3 + 1; // line + years + ref/2024/2023 + var%

  addTitleRow(ws, `Budget Consolide ${years.join('-')}`, colCount);
  addSubtitleRow(ws, `Budget Interne — Institut Pasteur de Dakar — Genere le ${new Date().toLocaleDateString('fr-FR')}`, colCount);
  addEmptyRow(ws);

  // Summary row (based on active year)
  const rev = budgetLines.revenues.reduce((s, l) => s + budget.getConsolidatedValue(l, yr, buList, buStructure), 0);
  const opex = budgetLines.opex.reduce((s, l) => s + budget.getConsolidatedValue(l, yr, buList, buStructure), 0);
  const capex = budgetLines.capex.reduce((s, l) => s + budget.getConsolidatedValue(l, yr, buList, buStructure), 0);
  const net = rev - opex;

  const summaryValues = ['Revenus: ' + fmt(rev, M), '', 'OPEX: ' + fmt(opex, M), '', 'CAPEX: ' + fmt(capex, M), 'Resultat: ' + fmt(net, M)];
  while (summaryValues.length < colCount) summaryValues.push('');
  const summaryRow = ws.addRow(summaryValues);
  summaryRow.height = 24;
  summaryRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 10, bold: true };
    cell.alignment = { vertical: 'middle' };
  });
  summaryRow.getCell(1).font.color = { argb: COLORS.greenAccent };
  summaryRow.getCell(3).font.color = { argb: COLORS.redAccent };
  summaryRow.getCell(5).font.color = { argb: COLORS.amberAccent };
  summaryRow.getCell(6).font.color = { argb: net >= 0 ? COLORS.greenAccent : COLORS.redAccent };
  addEmptyRow(ws);

  addHeaderRow(ws, ['Ligne Budgetaire', ...yearHeaders, `Ref. ${refLabel}`, '2024 (Reel)', '2023 (Reel)', 'Var %']);

  const sections = [
    { name: 'Produits / Revenus', lines: budgetLines.revenues, type: 'revenues' },
    { name: "Charges d'exploitation (OPEX)", lines: budgetLines.opex, type: 'opex' },
    { name: 'Investissements (CAPEX)', lines: budgetLines.capex, type: 'capex' },
  ];

  for (const section of sections) {
    addSectionHeader(ws, section.name, colCount, section.type);

    const sectionTotals = years.map(() => 0);
    let sectionPrev = 0, sectionH24 = 0, sectionH23 = 0;

    section.lines.forEach((line, i) => {
      const yearValues = years.map(y => budget.getConsolidatedValue(line, y, buList, buStructure));
      const val = budget.getConsolidatedValue(line, yr, buList, buStructure);
      const prev = prevYr ? budget.getConsolidatedValue(line, prevYr, buList, buStructure) : (historical["2025_est"]?.[line] || 0);
      const h24 = historical["2024"]?.[line] || 0;
      const h23 = historical["2023"]?.[line] || 0;
      const variation = prev ? (val - prev) / Math.abs(prev) : null;

      yearValues.forEach((v, idx) => sectionTotals[idx] += v);
      sectionPrev += prev; sectionH24 += h24; sectionH23 += h23;

      const row = addDataRow(ws, [line, ...yearValues.map(v => rawNum(v)), rawNum(prev), rawNum(h24), rawNum(h23), variation !== null ? pct(variation) : '-'], i % 2 === 0);
      // Style variation column
      const varCell = row.getCell(colCount);
      varCell.alignment = { horizontal: 'right' };
      if (variation !== null) {
        varCell.font = { ...varCell.font, color: { argb: variation > 0 ? COLORS.redAccent : variation < 0 ? COLORS.greenAccent : COLORS.gray400 } };
      }
    });

    const totalVariation = sectionPrev ? (sectionTotals[0] - sectionPrev) / Math.abs(sectionPrev) : null;
    addTotalRow(ws, [`TOTAL ${section.name.toUpperCase()}`, ...sectionTotals.map(v => rawNum(v)), rawNum(sectionPrev), rawNum(sectionH24), rawNum(sectionH23), totalVariation !== null ? pct(totalVariation) : '-'], section.type);
    addEmptyRow(ws);
  }

  // Column widths
  ws.getColumn(1).width = 45;
  for (let i = 2; i <= 1 + years.length; i++) ws.getColumn(i).width = 18;
  for (let i = 2 + years.length; i <= colCount; i++) ws.getColumn(i).width = 18;
  ws.getColumn(colCount).width = 12;

  // Freeze panes
  ws.views = [{ state: 'frozen', ySplit: 6, xSplit: 1 }];

  // === Sheet 2: Monthly (2026 only) ===
  if (yr === "2026" && consolidated["2026"]) {
    const wsm = wb.addWorksheet('Mensuel 2026');
    const mColCount = 14;

    addTitleRow(wsm, 'Ventilation Mensuelle 2026', mColCount);
    addSubtitleRow(wsm, 'Institut Pasteur de Dakar — Montants en FCFA', mColCount);
    addEmptyRow(wsm);
    addHeaderRow(wsm, ['Ligne', ...MONTHS, 'Total']);

    ALL_LINES.forEach((line, i) => {
      const monthly = consolidated["2026"]?.[line]?.monthly || Array(12).fill(0);
      const total = monthly.reduce((a, b) => a + b, 0);
      const row = addDataRow(wsm, [line, ...monthly.map(v => rawNum(v)), rawNum(total)], i % 2 === 0);
      // Bold total column
      row.getCell(14).font = { ...row.getCell(14).font, bold: true };
    });

    wsm.getColumn(1).width = 40;
    for (let i = 2; i <= 14; i++) wsm.getColumn(i).width = 12;
    wsm.views = [{ state: 'frozen', ySplit: 4, xSplit: 1 }];
  }

  // === Sheet 3: Trajectory ===
  const wst = wb.addWorksheet('Historique');
  addTitleRow(wst, 'Trajectoire Budgetaire 2023-2028', 5);
  addSubtitleRow(wst, 'Montants en millions FCFA', 5);
  addEmptyRow(wst);
  addHeaderRow(wst, ['Annee', 'Revenus (M)', 'OPEX (M)', 'CAPEX (M)', 'Resultat (M)']);

  ["2023", "2024", "2025_est", "2026", "2027", "2028"].forEach((y, i) => {
    const src = ["2023", "2024", "2025_est"].includes(y) ? historical[y] || {} : null;
    const revT = src ? budgetLines.revenues.reduce((s, l) => s + (src[l] || 0), 0) : budgetLines.revenues.reduce((s, l) => s + budget.getConsolidatedValue(l, y, buList, buStructure), 0);
    const opexT = src ? budgetLines.opex.reduce((s, l) => s + (src[l] || 0), 0) : budgetLines.opex.reduce((s, l) => s + budget.getConsolidatedValue(l, y, buList, buStructure), 0);
    const capexT = src ? budgetLines.capex.reduce((s, l) => s + (src[l] || 0), 0) : budgetLines.capex.reduce((s, l) => s + budget.getConsolidatedValue(l, y, buList, buStructure), 0);
    const netT = revT - opexT;
    const row = addDataRow(wst, [y.replace('_est', ' (Est.)'), Math.round(revT / 1e6), Math.round(opexT / 1e6), Math.round(capexT / 1e6), Math.round(netT / 1e6)], i % 2 === 0);
    row.getCell(1).font = { ...row.getCell(1).font, bold: true };
    if (netT < 0) row.getCell(5).font = { ...row.getCell(5).font, color: { argb: COLORS.redAccent } };
    else row.getCell(5).font = { ...row.getCell(5).font, color: { argb: COLORS.greenAccent } };
  });

  wst.getColumn(1).width = 18;
  for (let i = 2; i <= 5; i++) wst.getColumn(i).width = 16;

  await downloadWorkbook(wb, `budget_ipd_consolide_${yr}.xlsx`);
}

// ============================================================================
// BU VIEW EXCEL
// ============================================================================
export async function exportBUViewExcel({ year, years: YEARS, budget, budgetLines, buList, buStructure, selectedBU, inMillions }) {
  const M = inMillions;
  const yr = year;
  const years = YEARS || [yr];
  const bu = selectedBU;
  const units = buStructure[bu] || [];
  const ALL_LINES = [...budgetLines.revenues, ...budgetLines.opex, ...budgetLines.capex];

  const wb = await createWorkbook();
  const ws = wb.addWorksheet(bu.substring(0, 31));
  const colCount = 1 + years.length + 1; // line + years + % consol

  addTitleRow(ws, bu, colCount);
  addSubtitleRow(ws, `${units.length} unites — Budget ${years.join('-')}`, colCount);
  addEmptyRow(ws);
  addHeaderRow(ws, ['Ligne Budgetaire', ...years.map(y => `Budget ${y}`), '% Consol.']);

  const sections = [
    { name: 'Produits / Revenus', lines: budgetLines.revenues, type: 'revenues' },
    { name: "Charges d'exploitation (OPEX)", lines: budgetLines.opex, type: 'opex' },
    { name: 'Investissements (CAPEX)', lines: budgetLines.capex, type: 'capex' },
  ];

  for (const section of sections) {
    const filteredLines = section.lines.filter(l => {
      return years.some(y => {
        const val = budget.getBUValue(bu, l, y, buStructure);
        const consolVal = budget.getConsolidatedValue(l, y, buList, buStructure);
        return Math.abs(val) >= 1 || Math.abs(consolVal) >= 1;
      });
    });
    if (filteredLines.length === 0) continue;

    addSectionHeader(ws, section.name, colCount, section.type);

    const sectionTotals = years.map(() => 0);
    filteredLines.forEach((line, i) => {
      const yearValues = years.map((y, idx) => {
        const val = budget.getBUValue(bu, line, y, buStructure);
        sectionTotals[idx] += val;
        return rawNum(val);
      });
      const consolVal = budget.getConsolidatedValue(line, yr, buList, buStructure);
      const val = budget.getBUValue(bu, line, yr, buStructure);
      const pctVal = consolVal ? (val / consolVal * 100).toFixed(1) + '%' : '-';
      addDataRow(ws, [line, ...yearValues, pctVal], i % 2 === 0);
    });

    const totalConsol = section.lines.reduce((s, l) => s + budget.getConsolidatedValue(l, yr, buList, buStructure), 0);
    const totalPct = totalConsol ? (sectionTotals[years.indexOf(yr)] / totalConsol * 100).toFixed(1) + '%' : '-';
    addTotalRow(ws, [`TOTAL ${section.name.toUpperCase()}`, ...sectionTotals.map(v => rawNum(v)), totalPct], section.type);
    addEmptyRow(ws);
  }

  // Unit composition
  addEmptyRow(ws);
  const unitHeaderRow = ws.addRow(['Composition par Unite']);
  ws.mergeCells(ws.rowCount, 1, ws.rowCount, colCount);
  unitHeaderRow.height = 24;
  unitHeaderRow.font = { name: 'Calibri', size: 11, bold: true, color: { argb: COLORS.gray700 } };
  addEmptyRow(ws);

  addHeaderRow(ws, ['Unite', ...years.map(y => `Budget ${y}`)]);

  const unitData = units.map(u => {
    const totals = years.map(y => ALL_LINES.reduce((s, l) => s + Math.abs(budget.getUnitValue(u, l, y)), 0));
    return { name: u, totals, mainTotal: totals[years.indexOf(yr)] };
  }).sort((a, b) => b.mainTotal - a.mainTotal);

  unitData.forEach((d, i) => {
    if (d.totals.some(t => t > 0)) addDataRow(ws, [d.name, ...d.totals.map(t => rawNum(t))], i % 2 === 0);
  });

  ws.getColumn(1).width = 50;
  for (let i = 2; i <= colCount; i++) ws.getColumn(i).width = 18;
  ws.views = [{ state: 'frozen', ySplit: 4, xSplit: 1 }];

  await downloadWorkbook(wb, `budget_ipd_bu_${sanitizeName(bu)}_${years.join('-')}.xlsx`);
}

// ============================================================================
// UNIT VIEW EXCEL
// ============================================================================
export async function exportUnitViewExcel({ year, years: YEARS, budget, budgetLines, selectedUnit, selectedBU, unitBudgets, inMillions }) {
  const M = inMillions;
  const yr = year;
  const years = YEARS || [yr];
  const unit = selectedUnit;
  const bu = selectedBU;
  const ALL_LINES = [...budgetLines.revenues, ...budgetLines.opex, ...budgetLines.capex];

  const wb = await createWorkbook();
  const ws = wb.addWorksheet(unit.substring(0, 31));
  const colCount = 1 + years.length + 1 + 1; // line + years + alloue + statut

  addTitleRow(ws, unit, colCount);
  addSubtitleRow(ws, `${bu} — Budget ${years.join('-')}`, colCount);
  addEmptyRow(ws);
  addHeaderRow(ws, ['Ligne Budgetaire', ...years.map(y => `Budget ${y}`), 'Base (calcul)', 'Statut']);

  let rowIdx = 0;
  ALL_LINES.forEach(line => {
    const yearValues = years.map(y => budget.getUnitValue(unit, line, y));
    const allocated = unitBudgets[unit]?.[line]?.[yr] || 0;
    const isOvr = budget.isOverridden(unit, line, yr);
    if (yearValues.every(v => Math.abs(v) < 1) && Math.abs(allocated) < 1) return;

    const status = isOvr ? 'Modifie' : allocated > 0 ? 'Alloue' : '-';
    const row = addDataRow(ws, [line, ...yearValues.map(v => rawNum(v)), rawNum(allocated), status], rowIdx % 2 === 0);

    // Style status cell
    const statusCol = colCount;
    const statusCell = row.getCell(statusCol);
    statusCell.alignment = { horizontal: 'center', vertical: 'middle' };
    if (status === 'Modifie') {
      statusCell.font = { ...statusCell.font, color: { argb: COLORS.blueText }, bold: true };
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.blueBg } };
    } else if (status === 'Alloue') {
      statusCell.font = { ...statusCell.font, color: { argb: COLORS.greenAccent } };
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.greenBg } };
    }

    // Highlight overridden budget values in blue (active year column)
    const activeYearIdx = years.indexOf(yr);
    if (isOvr && activeYearIdx >= 0) {
      row.getCell(2 + activeYearIdx).font = { ...row.getCell(2 + activeYearIdx).font, color: { argb: COLORS.blueText }, bold: true };
    }

    rowIdx++;
  });

  // Total row
  addEmptyRow(ws);
  const yearTotals = years.map(y => ALL_LINES.reduce((s, l) => s + budget.getUnitValue(unit, l, y), 0));
  const totalValues = ['BUDGET TOTAL', ...yearTotals.map(t => rawNum(t))];
  while (totalValues.length < colCount) totalValues.push('');
  const totalRow = ws.addRow(totalValues);
  totalRow.height = 26;
  totalRow.getCell(1).font = { name: 'Calibri', size: 11, bold: true, color: { argb: COLORS.gray700 } };
  years.forEach((y, i) => {
    const t = yearTotals[i];
    totalRow.getCell(2 + i).font = { name: 'Calibri', size: 12, bold: true, color: { argb: t >= 0 ? COLORS.greenAccent : COLORS.redAccent } };
    totalRow.getCell(2 + i).numFmt = '#,##0';
    totalRow.getCell(2 + i).alignment = { horizontal: 'right' };
  });
  totalRow.eachCell(cell => {
    cell.border = { top: { style: 'medium', color: { argb: COLORS.gray700 } } };
  });

  ws.getColumn(1).width = 45;
  for (let i = 2; i <= colCount; i++) ws.getColumn(i).width = 18;
  ws.getColumn(colCount).width = 14;
  ws.views = [{ state: 'frozen', ySplit: 4, xSplit: 1 }];

  await downloadWorkbook(wb, `budget_ipd_unite_${sanitizeName(unit)}_${years.join('-')}.xlsx`);
}

// ============================================================================
// DASHBOARD EXCEL
// ============================================================================
export async function exportDashboardExcel({ year, years: YEARS, budget, budgetLines, buList, buStructure, allUnits, historical, consolidated, inMillions }) {
  const M = inMillions;
  const yr = year;
  const ALL_LINES = [...budgetLines.revenues, ...budgetLines.opex, ...budgetLines.capex];

  const wb = await createWorkbook();

  // === Sheet 1: Dashboard ===
  const ws = wb.addWorksheet('Dashboard');
  const colCount = 4;

  addTitleRow(ws, `Tableau de Bord ${yr}`, colCount);
  addSubtitleRow(ws, 'Institut Pasteur de Dakar — Analyse budgetaire', colCount);
  addEmptyRow(ws);

  // Revenue by BU
  const revTitle = ws.addRow(['Revenus par Business Unit']);
  ws.mergeCells(ws.rowCount, 1, ws.rowCount, colCount);
  revTitle.height = 24;
  revTitle.font = { name: 'Calibri', size: 11, bold: true, color: { argb: COLORS.gray700 } };
  addEmptyRow(ws);

  addHeaderRow(ws, ['Business Unit', `Revenus ${yr}`, '', '']);

  const revByBU = buList.map(bu => {
    const val = budgetLines.revenues.reduce((s, l) => s + budget.getBUValue(bu, l, yr, buStructure), 0);
    return { name: bu, val };
  }).filter(d => d.val > 0).sort((a, b) => b.val - a.val);

  revByBU.forEach((d, i) => {
    const row = addDataRow(ws, [d.name, rawNum(d.val), '', ''], i % 2 === 0);
    row.getCell(2).font = { ...row.getCell(2).font, color: { argb: COLORS.greenAccent }, bold: true };
  });

  addEmptyRow(ws);
  addEmptyRow(ws);

  // OPEX breakdown
  const opexTitle = ws.addRow(['Repartition OPEX']);
  ws.mergeCells(ws.rowCount, 1, ws.rowCount, colCount);
  opexTitle.height = 24;
  opexTitle.font = { name: 'Calibri', size: 11, bold: true, color: { argb: COLORS.gray700 } };
  addEmptyRow(ws);

  addHeaderRow(ws, ['Ligne OPEX', 'Montant', '', '']);

  const opexByLine = budgetLines.opex.map(l => {
    const val = Math.abs(budget.getConsolidatedValue(l, yr, buList, buStructure));
    return { name: l, val };
  }).filter(d => d.val > 0).sort((a, b) => b.val - a.val);

  opexByLine.forEach((d, i) => {
    const row = addDataRow(ws, [d.name, rawNum(d.val), '', ''], i % 2 === 0);
    row.getCell(2).font = { ...row.getCell(2).font, color: { argb: COLORS.redAccent }, bold: true };
  });

  addEmptyRow(ws);
  addEmptyRow(ws);

  // Top 10 units
  const topTitle = ws.addRow(['Top 10 Unites par OPEX']);
  ws.mergeCells(ws.rowCount, 1, ws.rowCount, colCount);
  topTitle.height = 24;
  topTitle.font = { name: 'Calibri', size: 11, bold: true, color: { argb: COLORS.gray700 } };
  addEmptyRow(ws);

  addHeaderRow(ws, ['Unite', 'Business Unit', 'OPEX', '']);

  const topUnits = allUnits.map(({ name, bu }) => {
    const val = budgetLines.opex.reduce((s, l) => s + budget.getUnitValue(name, l, yr), 0);
    return { name, bu, val };
  }).sort((a, b) => b.val - a.val).slice(0, 10);

  topUnits.forEach((d, i) => {
    addDataRow(ws, [d.name, d.bu, rawNum(d.val), ''], i % 2 === 0);
  });

  addEmptyRow(ws);
  addEmptyRow(ws);

  // Trajectory
  const trajTitle = ws.addRow(['Trajectoire du Resultat (M FCFA)']);
  ws.mergeCells(ws.rowCount, 1, ws.rowCount, colCount);
  trajTitle.height = 24;
  trajTitle.font = { name: 'Calibri', size: 11, bold: true, color: { argb: COLORS.gray700 } };
  addEmptyRow(ws);

  addHeaderRow(ws, ['Annee', 'Revenus', 'OPEX', 'Resultat']);

  ["2023", "2024", "2026", "2027", "2028"].forEach((y, i) => {
    const src = ["2023", "2024"].includes(y) ? historical[y] : null;
    const revT = src ? budgetLines.revenues.reduce((s, l) => s + (src[l] || 0), 0) : budgetLines.revenues.reduce((s, l) => s + budget.getConsolidatedValue(l, y, buList, buStructure), 0);
    const opexT = src ? budgetLines.opex.reduce((s, l) => s + (src[l] || 0), 0) : budgetLines.opex.reduce((s, l) => s + budget.getConsolidatedValue(l, y, buList, buStructure), 0);
    const netT = revT - opexT;
    const row = addDataRow(ws, [y, Math.round(revT / 1e6), Math.round(opexT / 1e6), Math.round(netT / 1e6)], i % 2 === 0);
    row.getCell(1).font = { ...row.getCell(1).font, bold: true };
    row.getCell(4).font = { ...row.getCell(4).font, color: { argb: netT >= 0 ? COLORS.greenAccent : COLORS.redAccent }, bold: true };
  });

  ws.getColumn(1).width = 45;
  ws.getColumn(2).width = 20;
  ws.getColumn(3).width = 20;
  ws.getColumn(4).width = 18;

  // === Sheet 2: Coherence ===
  const wsc = wb.addWorksheet('Coherence');
  addTitleRow(wsc, `Controle de Coherence ${yr}`, 5);
  addSubtitleRow(wsc, 'Consolide vs Somme des BUs', 5);
  addEmptyRow(wsc);
  addHeaderRow(wsc, ['Ligne', 'Consolide', 'Somme BUs', 'Delta', 'Statut']);

  ALL_LINES.forEach((line, i) => {
    const consolOriginal = consolidated[yr]?.[line]?.total || 0;
    const sumBU = buList.reduce((s, bu) => s + budget.getBUValue(bu, line, yr, buStructure), 0);
    const delta = Math.abs(consolOriginal - sumBU);
    const pass = delta < 100;
    const row = addDataRow(wsc, [line, rawNum(consolOriginal), rawNum(sumBU), rawNum(delta), pass ? 'OK' : 'ECART'], i % 2 === 0);

    const statusCell = row.getCell(5);
    statusCell.alignment = { horizontal: 'center', vertical: 'middle' };
    if (pass) {
      statusCell.font = { ...statusCell.font, color: { argb: COLORS.greenAccent }, bold: true };
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.greenBg } };
    } else {
      statusCell.font = { ...statusCell.font, color: { argb: COLORS.amberAccent }, bold: true };
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.amberBg } };
    }
  });

  wsc.getColumn(1).width = 45;
  wsc.getColumn(2).width = 18;
  wsc.getColumn(3).width = 18;
  wsc.getColumn(4).width = 14;
  wsc.getColumn(5).width = 12;
  wsc.views = [{ state: 'frozen', ySplit: 4, xSplit: 1 }];

  await downloadWorkbook(wb, `budget_ipd_dashboard_${yr}.xlsx`);
}
