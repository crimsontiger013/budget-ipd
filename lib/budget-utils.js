// Shared utility functions and constants for the budget app

export const MONTHS = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];

export const LINE_COLORS = [
  "#1e40af","#059669","#7c3aed","#dc2626","#d97706","#0891b2",
  "#be185d","#4b5563","#65a30d","#0d9488","#c026d3","#ea580c",
  "#6366f1","#14b8a6","#f43f5e","#8b5cf6"
];

export function fmt(v, inMillions = false) {
  if (v === null || v === undefined || isNaN(v)) return "-";
  if (Math.abs(v) < 0.5) return "-";
  let val = inMillions ? v / 1000000 : v;
  const neg = val < 0;
  val = Math.abs(Math.round(val));
  const formatted = val.toLocaleString('fr-FR').replace(/\u202F/g, '\u00A0');
  if (inMillions) return neg ? `(${formatted} M)` : `${formatted} M`;
  return neg ? `(${formatted})` : formatted;
}

export function pct(v) {
  if (v === null || v === undefined || isNaN(v) || !isFinite(v)) return "-";
  const val = v * 100;
  return `${val >= 0 ? '+' : ''}${val.toFixed(1)}%`;
}
