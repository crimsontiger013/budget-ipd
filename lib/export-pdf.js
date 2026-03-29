import { fmt, pct, MONTHS } from './budget-utils';

// ============================================================================
// HELPERS
// ============================================================================

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

const COLORS = {
  headerBg: [10, 22, 40],     // #0A1628
  gold: [197, 165, 90],       // #C5A55A
  white: [255, 255, 255],
  black: [17, 17, 17],
  gray100: [243, 244, 246],
  gray200: [229, 231, 235],
  gray400: [156, 163, 175],
  gray700: [55, 65, 81],
  green: [5, 150, 105],
  greenBg: [236, 253, 245],
  greenDark: [6, 95, 70],
  red: [220, 38, 38],
  redBg: [254, 242, 242],
  redDark: [153, 27, 27],
  amber: [217, 119, 6],
  amberBg: [255, 251, 235],
  amberDark: [146, 64, 14],
};

const SECTION_STYLES = {
  revenues: { bg: COLORS.greenBg, text: COLORS.greenDark, total: COLORS.green },
  opex:     { bg: COLORS.redBg, text: COLORS.redDark, total: COLORS.red },
  capex:    { bg: COLORS.amberBg, text: COLORS.amberDark, total: COLORS.amber },
};

async function loadLogo() {
  try {
    const resp = await fetch('/logo-institut-pasteur.png');
    const blob = await resp.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
}

async function createDoc(title, year, subtitle) {
  const { default: jsPDF } = await import('jspdf');
  const { applyPlugin } = await import('jspdf-autotable');
  applyPlugin(jsPDF);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const logo = await loadLogo();
  const pageW = doc.internal.pageSize.getWidth();

  // Header band
  doc.setFillColor(...COLORS.headerBg);
  doc.rect(0, 0, pageW, 22, 'F');

  if (logo) {
    doc.addImage(logo, 'PNG', 8, 3, 16, 16);
  }

  doc.setTextColor(...COLORS.gold);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(title, logo ? 28 : 10, 10);

  doc.setTextColor(...COLORS.white);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(subtitle || `Budget ${year} — Institut Pasteur de Dakar`, logo ? 28 : 10, 16);

  const now = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.gray400);
  doc.text(`Généré le ${now}`, pageW - 10, 16, { align: 'right' });

  // Footer on every page
  const addFooter = () => {
    const pages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      const h = doc.internal.pageSize.getHeight();
      doc.setFontSize(7);
      doc.setTextColor(...COLORS.gray400);
      doc.text('Institut Pasteur de Dakar — Budget Interne', 10, h - 5);
      doc.text(`Page ${i}/${pages}`, pageW - 10, h - 5, { align: 'right' });
    }
  };

  return { doc, pageW, addFooter };
}

function addSummaryCards(doc, totals, y, M) {
  const pageW = doc.internal.pageSize.getWidth();
  const cardW = (pageW - 20 - 15) / 4;
  const cards = [
    { label: 'REVENUS', value: fmt(totals.rev, M), color: COLORS.green },
    { label: 'OPEX', value: fmt(totals.opex, M), color: COLORS.red },
    { label: 'CAPEX', value: fmt(totals.capex, M), color: COLORS.amber },
    { label: 'RESULTAT NET', value: fmt(totals.net, M), color: totals.net >= 0 ? COLORS.green : COLORS.red },
  ];

  cards.forEach((card, i) => {
    const x = 10 + i * (cardW + 5);
    // Card background
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...COLORS.gray200);
    doc.roundedRect(x, y, cardW, 18, 2, 2, 'FD');
    // Color accent bar
    doc.setFillColor(...card.color);
    doc.rect(x, y, 2, 18, 'F');
    // Label
    doc.setFontSize(6);
    doc.setTextColor(...COLORS.gray400);
    doc.setFont('helvetica', 'bold');
    doc.text(card.label, x + 6, y + 6);
    // Value
    doc.setFontSize(12);
    doc.setTextColor(...card.color);
    doc.setFont('helvetica', 'bold');
    doc.text(card.value, x + 6, y + 14);
  });

  return y + 24;
}

function addSectionTable(doc, sectionName, lines, getData, type, startY, columns) {
  const style = SECTION_STYLES[type];

  // Section header row
  const sectionRow = [{ content: sectionName, colSpan: columns.length, styles: { fillColor: style.bg, textColor: style.text, fontStyle: 'bold', fontSize: 8, halign: 'left' } }];

  // Data rows
  const body = lines.map(line => {
    const row = getData(line);
    return row;
  });

  // Total row
  const totalRow = columns.map((col, i) => {
    if (i === 0) return { content: `TOTAL ${sectionName.toUpperCase()}`, styles: { fontStyle: 'bold' } };
    if (col.total !== undefined) return { content: col.total, styles: { fontStyle: 'bold', textColor: style.total } };
    return '';
  });

  doc.autoTable({
    startY,
    head: columns[0]._isHeader ? [columns.map(c => c.label)] : undefined,
    body: [sectionRow, ...body, totalRow],
    theme: 'plain',
    styles: { fontSize: 7, cellPadding: { top: 1.5, bottom: 1.5, left: 3, right: 3 }, lineColor: COLORS.gray200, lineWidth: 0.1 },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    headStyles: { fillColor: COLORS.headerBg, textColor: COLORS.white, fontSize: 7, fontStyle: 'bold' },
    columnStyles: columns.reduce((acc, col, i) => {
      if (i > 0) acc[i] = { halign: 'right' };
      if (col.width) acc[i] = { ...acc[i], cellWidth: col.width };
      return acc;
    }, {}),
    didParseCell: (data) => {
      // Color negative values red
      if (data.section === 'body' && data.column.index > 0) {
        const text = String(data.cell.raw?.content || data.cell.raw || '');
        if (text.startsWith('(') && text.endsWith(')')) {
          data.cell.styles.textColor = COLORS.red;
        }
      }
    },
    margin: { left: 10, right: 10 },
  });

  return doc.lastAutoTable.finalY + 2;
}

function sanitizeName(name) {
  return name.replace(/[^a-zA-Z0-9\u00C0-\u024F]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
}

function triggerDownload(doc, filename) {
  doc.save(filename);
}

// ============================================================================
// CONSOLIDATED VIEW PDF
// ============================================================================
export async function exportConsolidatedPDF({ year, years: YEARS, budget, budgetLines, buList, buStructure, historical, consolidated, inMillions }) {
  const M = inMillions;
  const yr = year;
  const years = YEARS || [yr];
  const prevYr = yr === "2026" ? null : String(Number(yr) - 1);
  const refLabel = yr === "2026" ? "2025 (Est.)" : String(Number(yr) - 1);

  const { doc, pageW, addFooter } = await createDoc(`Budget Consolide ${years.join('-')}`, yr, `Budget Interne ${years.join('-')} — Montants en FCFA`);

  // Summary cards
  const rev = budgetLines.revenues.reduce((s, l) => s + budget.getConsolidatedValue(l, yr, buList, buStructure), 0);
  const opex = budgetLines.opex.reduce((s, l) => s + budget.getConsolidatedValue(l, yr, buList, buStructure), 0);
  const capex = budgetLines.capex.reduce((s, l) => s + budget.getConsolidatedValue(l, yr, buList, buStructure), 0);
  let currentY = addSummaryCards(doc, { rev, opex, capex, net: rev - opex }, 26, M);

  const columns = [
    { label: 'Ligne Budgetaire', width: 70, _isHeader: true },
    ...years.map(y => ({ label: `Budget ${y}` })),
    { label: `Ref. ${refLabel}` },
    { label: '2024 (Reel)' },
    { label: '2023 (Reel)' },
    { label: 'Var %' },
  ];

  const makeGetData = (lines, type) => (line) => {
    const yearValues = years.map(y => fmt(budget.getConsolidatedValue(line, y, buList, buStructure), M));
    const val = budget.getConsolidatedValue(line, yr, buList, buStructure);
    const prev = prevYr ? budget.getConsolidatedValue(line, prevYr, buList, buStructure) : (historical["2025_est"]?.[line] || 0);
    const h24 = historical["2024"]?.[line] || 0;
    const h23 = historical["2023"]?.[line] || 0;
    const variation = prev ? (val - prev) / Math.abs(prev) : null;
    return [line, ...yearValues, fmt(prev, M), fmt(h24, M), fmt(h23, M), pct(variation)];
  };

  const makeTotal = (lines, type) => {
    const yearTotals = years.map(y => lines.reduce((s, l) => s + budget.getConsolidatedValue(l, y, buList, buStructure), 0));
    const totalPrev = lines.reduce((s, l) => {
      return s + (prevYr ? budget.getConsolidatedValue(l, prevYr, buList, buStructure) : (historical["2025_est"]?.[l] || 0));
    }, 0);
    const totalH24 = lines.reduce((s, l) => s + (historical["2024"]?.[l] || 0), 0);
    const totalH23 = lines.reduce((s, l) => s + (historical["2023"]?.[l] || 0), 0);
    const totalVar = totalPrev ? (yearTotals[0] - totalPrev) / Math.abs(totalPrev) : null;
    return [
      { label: 'Ligne Budgetaire', _isHeader: true, width: 70 },
      ...years.map((y, i) => ({ label: `Budget ${y}`, total: fmt(yearTotals[i], M) })),
      { label: `Ref. ${refLabel}`, total: fmt(totalPrev, M) },
      { label: '2024 (Reel)', total: fmt(totalH24, M) },
      { label: '2023 (Reel)', total: fmt(totalH23, M) },
      { label: 'Var %', total: pct(totalVar) },
    ];
  };

  // Revenues
  currentY = addSectionTable(doc, 'Produits / Revenus', budgetLines.revenues, makeGetData(budgetLines.revenues, 'revenues'), 'revenues', currentY, makeTotal(budgetLines.revenues, 'revenues'));

  // OPEX
  currentY = addSectionTable(doc, "Charges d'exploitation (OPEX)", budgetLines.opex, makeGetData(budgetLines.opex, 'opex'), 'opex', currentY, makeTotal(budgetLines.opex, 'opex'));

  // CAPEX
  currentY = addSectionTable(doc, 'Investissements (CAPEX)', budgetLines.capex, makeGetData(budgetLines.capex, 'capex'), 'capex', currentY, makeTotal(budgetLines.capex, 'capex'));

  // Monthly breakdown for 2026
  if (yr === "2026" && consolidated["2026"]) {
    doc.addPage('landscape');
    doc.setFillColor(...COLORS.headerBg);
    doc.rect(0, 0, pageW, 14, 'F');
    doc.setTextColor(...COLORS.gold);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Ventilation Mensuelle 2026', 10, 10);

    const ALL_LINES = [...budgetLines.revenues, ...budgetLines.opex, ...budgetLines.capex];
    const monthlyHead = [['Ligne', ...MONTHS, 'Total']];
    const monthlyBody = ALL_LINES.map(line => {
      const monthly = consolidated["2026"]?.[line]?.monthly || Array(12).fill(0);
      const total = monthly.reduce((a, b) => a + b, 0);
      return [line, ...monthly.map(v => fmt(v, M)), fmt(total, M)];
    });

    doc.autoTable({
      startY: 18,
      head: monthlyHead,
      body: monthlyBody,
      theme: 'grid',
      styles: { fontSize: 5.5, cellPadding: 1.2, lineColor: COLORS.gray200, lineWidth: 0.1 },
      headStyles: { fillColor: COLORS.headerBg, textColor: COLORS.white, fontSize: 5.5, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      columnStyles: {
        0: { cellWidth: 55 },
        13: { fontStyle: 'bold' },
      },
      margin: { left: 5, right: 5 },
    });
  }

  // Historical trajectory page
  doc.addPage('landscape');
  doc.setFillColor(...COLORS.headerBg);
  doc.rect(0, 0, pageW, 14, 'F');
  doc.setTextColor(...COLORS.gold);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Trajectoire Budgetaire 2023-2028 (M FCFA)', 10, 10);

  const trajectoryData = ["2023", "2024", "2025_est", "2026", "2027", "2028"].map(y => {
    const src = ["2023", "2024", "2025_est"].includes(y) ? historical[y] || {} : null;
    const revT = src ? budgetLines.revenues.reduce((s, l) => s + (src[l] || 0), 0) : budgetLines.revenues.reduce((s, l) => s + budget.getConsolidatedValue(l, y, buList, buStructure), 0);
    const opexT = src ? budgetLines.opex.reduce((s, l) => s + (src[l] || 0), 0) : budgetLines.opex.reduce((s, l) => s + budget.getConsolidatedValue(l, y, buList, buStructure), 0);
    const capexT = src ? budgetLines.capex.reduce((s, l) => s + (src[l] || 0), 0) : budgetLines.capex.reduce((s, l) => s + budget.getConsolidatedValue(l, y, buList, buStructure), 0);
    return [y.replace('_est', ' (Est.)'), fmt(Math.round(revT / 1e6), false) + ' M', fmt(Math.round(opexT / 1e6), false) + ' M', fmt(Math.round(capexT / 1e6), false) + ' M', fmt(Math.round((revT - opexT) / 1e6), false) + ' M'];
  });

  doc.autoTable({
    startY: 20,
    head: [['Annee', 'Revenus', 'OPEX', 'CAPEX', 'Resultat Net']],
    body: trajectoryData,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3, halign: 'center' },
    headStyles: { fillColor: COLORS.headerBg, textColor: COLORS.white, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    columnStyles: { 0: { fontStyle: 'bold', halign: 'left' } },
    margin: { left: 30, right: 30 },
  });

  addFooter();
  triggerDownload(doc, `budget_ipd_consolide_${years.join('-')}.pdf`);
}

// ============================================================================
// BU VIEW PDF
// ============================================================================
export async function exportBUViewPDF({ year, years: YEARS, budget, budgetLines, buList, buStructure, selectedBU, inMillions }) {
  const M = inMillions;
  const yr = year;
  const years = YEARS || [yr];
  const bu = selectedBU;
  const units = buStructure[bu] || [];
  const ALL_LINES = [...budgetLines.revenues, ...budgetLines.opex, ...budgetLines.capex];

  const { doc, pageW, addFooter } = await createDoc(bu, yr, `Business Unit — Budget ${years.join('-')} — ${units.length} unites`);

  let currentY = 28;

  const makeGetData = (lines) => (line) => {
    const yearValues = years.map(y => budget.getBUValue(bu, line, y, buStructure));
    const consolVal = budget.getConsolidatedValue(line, yr, buList, buStructure);
    const val = budget.getBUValue(bu, line, yr, buStructure);
    const pctVal = consolVal ? (val / consolVal * 100).toFixed(1) + '%' : '-';
    if (yearValues.every(v => Math.abs(v) < 1) && Math.abs(consolVal) < 1) return null;
    return [line, ...yearValues.map(v => fmt(v, M)), pctVal];
  };

  const makeTotal = (lines) => {
    const yearTotals = years.map(y => lines.reduce((s, l) => s + budget.getBUValue(bu, l, y, buStructure), 0));
    const totalConsol = lines.reduce((s, l) => s + budget.getConsolidatedValue(l, yr, buList, buStructure), 0);
    const totalPct = totalConsol ? (yearTotals[years.indexOf(yr)] / totalConsol * 100).toFixed(1) + '%' : '-';
    return [
      { label: 'Ligne Budgetaire', _isHeader: true, width: 80 },
      ...years.map((y, i) => ({ label: `Budget ${y}`, total: fmt(yearTotals[i], M) })),
      { label: '% du Consolide', total: totalPct },
    ];
  };

  const sections = [
    { name: 'Produits / Revenus', lines: budgetLines.revenues, type: 'revenues' },
    { name: "Charges d'exploitation (OPEX)", lines: budgetLines.opex, type: 'opex' },
    { name: 'Investissements (CAPEX)', lines: budgetLines.capex, type: 'capex' },
  ];

  for (const section of sections) {
    const getData = makeGetData(section.lines);
    const filteredLines = section.lines.filter(l => getData(l) !== null);
    if (filteredLines.length === 0) continue;
    currentY = addSectionTable(doc, section.name, filteredLines, getData, section.type, currentY, makeTotal(section.lines));
  }

  // Unit composition table
  currentY += 6;
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.gray700);
  doc.setFont('helvetica', 'bold');
  doc.text('Composition par Unite', 10, currentY);
  currentY += 4;

  const unitData = units.map(u => {
    const total = ALL_LINES.reduce((s, l) => s + Math.abs(budget.getUnitValue(u, l, yr)), 0);
    return [u, fmt(total, M)];
  }).filter(d => d[1] !== '-').sort((a, b) => {
    const va = ALL_LINES.reduce((s, l) => s + Math.abs(budget.getUnitValue(a[0], l, yr)), 0);
    const vb = ALL_LINES.reduce((s, l) => s + Math.abs(budget.getUnitValue(b[0], l, yr)), 0);
    return vb - va;
  });

  if (unitData.length > 0) {
    doc.autoTable({
      startY: currentY,
      head: [['Unite', 'Budget Total']],
      body: unitData,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 2, lineColor: COLORS.gray200, lineWidth: 0.1 },
      headStyles: { fillColor: COLORS.headerBg, textColor: COLORS.white, fontSize: 7, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      columnStyles: { 0: { cellWidth: 120 }, 1: { halign: 'right', fontStyle: 'bold' } },
      margin: { left: 10, right: 10 },
    });
  }

  addFooter();
  triggerDownload(doc, `budget_ipd_bu_${sanitizeName(bu)}_${years.join('-')}.pdf`);
}

// ============================================================================
// UNIT VIEW PDF
// ============================================================================
export async function exportUnitViewPDF({ year, years: YEARS, budget, budgetLines, selectedUnit, selectedBU, unitBudgets, inMillions }) {
  const M = inMillions;
  const yr = year;
  const years = YEARS || [yr];
  const unit = selectedUnit;
  const bu = selectedBU;
  const ALL_LINES = [...budgetLines.revenues, ...budgetLines.opex, ...budgetLines.capex];

  const { doc, pageW, addFooter } = await createDoc(unit, yr, `${bu} — Budget ${years.join('-')}`);

  let currentY = 28;

  const bodyRows = ALL_LINES.map(line => {
    const yearValues = years.map(y => budget.getUnitValue(unit, line, y));
    const allocated = unitBudgets[unit]?.[line]?.[yr] || 0;
    const isOvr = budget.isOverridden(unit, line, yr);
    if (yearValues.every(v => Math.abs(v) < 1) && Math.abs(allocated) < 1) return null;
    return [line, ...yearValues.map(v => fmt(v, M)), fmt(allocated, M), isOvr ? 'Modifie' : allocated > 0 ? 'Alloue' : '-'];
  }).filter(Boolean);

  doc.autoTable({
    startY: currentY,
    head: [['Ligne Budgetaire', ...years.map(y => `Budget ${y}`), 'Base (calcul)', 'Statut']],
    body: bodyRows,
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 2, lineColor: COLORS.gray200, lineWidth: 0.1 },
    headStyles: { fillColor: COLORS.headerBg, textColor: COLORS.white, fontSize: 7, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    columnStyles: {
      0: { cellWidth: 70 },
      ...Object.fromEntries(years.map((_, i) => [1 + i, { halign: 'right', fontStyle: 'bold' }])),
      [1 + years.length]: { halign: 'right', textColor: COLORS.gray400 },
      [2 + years.length]: { halign: 'center' },
    },
    didParseCell: (data) => {
      const statusCol = 2 + years.length;
      if (data.section === 'body' && data.column.index === statusCol) {
        const text = String(data.cell.raw || '');
        if (text === 'Modifie') {
          data.cell.styles.textColor = [37, 99, 235]; // blue-600
          data.cell.styles.fillColor = [239, 246, 255]; // blue-50
        } else if (text === 'Alloue') {
          data.cell.styles.textColor = COLORS.green;
          data.cell.styles.fillColor = COLORS.greenBg;
        }
      }
    },
    margin: { left: 10, right: 10 },
  });

  // Grand total per year
  const finalY = doc.lastAutoTable.finalY + 4;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.gray700);
  doc.text('BUDGET TOTAL:', 10, finalY);
  let xOffset = 50;
  years.forEach(y => {
    const total = ALL_LINES.reduce((s, l) => s + budget.getUnitValue(unit, l, y), 0);
    doc.setTextColor(...(total >= 0 ? COLORS.green : COLORS.red));
    doc.text(`${y}: ${fmt(total, M)}`, xOffset, finalY);
    xOffset += 60;
  });

  addFooter();
  triggerDownload(doc, `budget_ipd_unite_${sanitizeName(unit)}_${years.join('-')}.pdf`);
}

// ============================================================================
// DASHBOARD VIEW PDF
// ============================================================================
export async function exportDashboardPDF({ year, years: YEARS, budget, budgetLines, buList, buStructure, allUnits, historical, consolidated, inMillions }) {
  const M = inMillions;
  const yr = year;
  const ALL_LINES = [...budgetLines.revenues, ...budgetLines.opex, ...budgetLines.capex];

  const { doc, pageW, addFooter } = await createDoc(`Tableau de Bord ${yr}`, yr, 'Analyse budgetaire et controle de coherence');

  // Summary cards
  const rev = budgetLines.revenues.reduce((s, l) => s + budget.getConsolidatedValue(l, yr, buList, buStructure), 0);
  const opex = budgetLines.opex.reduce((s, l) => s + budget.getConsolidatedValue(l, yr, buList, buStructure), 0);
  const capex = budgetLines.capex.reduce((s, l) => s + budget.getConsolidatedValue(l, yr, buList, buStructure), 0);
  let currentY = addSummaryCards(doc, { rev, opex, capex, net: rev - opex }, 26, M);

  // Revenue by BU table
  currentY += 2;
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.gray700);
  doc.setFont('helvetica', 'bold');
  doc.text('Revenus par Business Unit (FCFA)', 10, currentY);
  currentY += 3;

  const revByBU = buList.map(bu => {
    const val = budgetLines.revenues.reduce((s, l) => s + budget.getBUValue(bu, l, yr, buStructure), 0);
    return [bu, fmt(val, M)];
  }).filter(d => d[1] !== '-').sort((a, b) => {
    const va = budgetLines.revenues.reduce((s, l) => s + budget.getBUValue(a[0], l, yr, buStructure), 0);
    const vb = budgetLines.revenues.reduce((s, l) => s + budget.getBUValue(b[0], l, yr, buStructure), 0);
    return vb - va;
  });

  doc.autoTable({
    startY: currentY,
    head: [['Business Unit', `Revenus ${yr}`]],
    body: revByBU,
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 2, lineColor: COLORS.gray200, lineWidth: 0.1 },
    headStyles: { fillColor: COLORS.headerBg, textColor: COLORS.white, fontSize: 7, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    columnStyles: { 0: { cellWidth: 120 }, 1: { halign: 'right', fontStyle: 'bold', textColor: COLORS.green } },
    margin: { left: 10, right: pageW / 2 + 5 },
  });

  // OPEX breakdown (right side)
  const opexByLine = budgetLines.opex.map(l => {
    const val = Math.abs(budget.getConsolidatedValue(l, yr, buList, buStructure));
    return [l, fmt(val, M)];
  }).filter(d => d[1] !== '-').sort((a, b) => {
    const va = Math.abs(budget.getConsolidatedValue(a[0], yr, buList, buStructure));
    const vb = Math.abs(budget.getConsolidatedValue(b[0], yr, buList, buStructure));
    return vb - va;
  });

  doc.autoTable({
    startY: currentY,
    head: [['Ligne OPEX', 'Montant']],
    body: opexByLine.slice(0, 10),
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 2, lineColor: COLORS.gray200, lineWidth: 0.1 },
    headStyles: { fillColor: COLORS.headerBg, textColor: COLORS.white, fontSize: 7, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    columnStyles: { 0: { cellWidth: 80 }, 1: { halign: 'right', fontStyle: 'bold', textColor: COLORS.red } },
    margin: { left: pageW / 2 + 5, right: 10 },
  });

  currentY = Math.max(doc.previousAutoTable?.finalY || 0, doc.lastAutoTable.finalY) + 6;

  // Top 10 units
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.gray700);
  doc.setFont('helvetica', 'bold');
  doc.text('Top 10 Unites par OPEX', 10, currentY);
  currentY += 3;

  const topUnits = allUnits.map(({ name, bu }) => {
    const val = budgetLines.opex.reduce((s, l) => s + budget.getUnitValue(name, l, yr), 0);
    return [name, bu, fmt(val, M)];
  }).sort((a, b) => {
    const va = budgetLines.opex.reduce((s, l) => s + budget.getUnitValue(a[0], l, yr), 0);
    const vb = budgetLines.opex.reduce((s, l) => s + budget.getUnitValue(b[0], l, yr), 0);
    return vb - va;
  }).slice(0, 10);

  doc.autoTable({
    startY: currentY,
    head: [['Unite', 'Business Unit', 'OPEX']],
    body: topUnits,
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 2, lineColor: COLORS.gray200, lineWidth: 0.1 },
    headStyles: { fillColor: COLORS.headerBg, textColor: COLORS.white, fontSize: 7, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    columnStyles: { 0: { cellWidth: 80 }, 2: { halign: 'right', fontStyle: 'bold' } },
    margin: { left: 10, right: 10 },
  });

  // Trajectory table
  currentY = doc.lastAutoTable.finalY + 6;
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.gray700);
  doc.setFont('helvetica', 'bold');
  doc.text('Trajectoire du Resultat (M FCFA)', 10, currentY);
  currentY += 3;

  const deficitData = ["2023", "2024", "2026", "2027", "2028"].map(y => {
    const src = ["2023", "2024"].includes(y) ? historical[y] : null;
    const revT = src ? budgetLines.revenues.reduce((s, l) => s + (src[l] || 0), 0) : budgetLines.revenues.reduce((s, l) => s + budget.getConsolidatedValue(l, y, buList, buStructure), 0);
    const opexT = src ? budgetLines.opex.reduce((s, l) => s + (src[l] || 0), 0) : budgetLines.opex.reduce((s, l) => s + budget.getConsolidatedValue(l, y, buList, buStructure), 0);
    const net = revT - opexT;
    return [y, fmt(Math.round(revT / 1e6), false) + ' M', fmt(Math.round(opexT / 1e6), false) + ' M', fmt(Math.round(net / 1e6), false) + ' M'];
  });

  doc.autoTable({
    startY: currentY,
    head: [['Annee', 'Revenus', 'OPEX', 'Resultat']],
    body: deficitData,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2.5, halign: 'center' },
    headStyles: { fillColor: COLORS.headerBg, textColor: COLORS.white, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    columnStyles: { 0: { fontStyle: 'bold', halign: 'left' } },
    margin: { left: 10, right: 10 },
  });

  // Coherence validation
  doc.addPage('landscape');
  doc.setFillColor(...COLORS.headerBg);
  doc.rect(0, 0, pageW, 14, 'F');
  doc.setTextColor(...COLORS.gold);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Controle de Coherence — Consolide vs Somme des BUs (${yr})`, 10, 10);

  const validationBody = ALL_LINES.map(line => {
    const consolOriginal = consolidated[yr]?.[line]?.total || 0;
    const sumBU = buList.reduce((s, bu) => s + budget.getBUValue(bu, line, yr, buStructure), 0);
    const delta = Math.abs(consolOriginal - sumBU);
    const pass = delta < 100;
    return [line, fmt(consolOriginal, M), fmt(sumBU, M), fmt(delta), pass ? 'OK' : 'ECART'];
  });

  doc.autoTable({
    startY: 18,
    head: [['Ligne', 'Consolide', 'Somme BUs', 'Delta', 'Statut']],
    body: validationBody,
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 1.5, lineColor: COLORS.gray200, lineWidth: 0.1 },
    headStyles: { fillColor: COLORS.headerBg, textColor: COLORS.white, fontSize: 7, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'center' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 4) {
        const text = String(data.cell.raw || '');
        if (text === 'OK') {
          data.cell.styles.textColor = COLORS.green;
          data.cell.styles.fontStyle = 'bold';
        } else {
          data.cell.styles.textColor = COLORS.amber;
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
    margin: { left: 10, right: 10 },
  });

  addFooter();
  triggerDownload(doc, `budget_ipd_dashboard_${yr}.pdf`);
}
