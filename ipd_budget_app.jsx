import React, { useState, useMemo, useCallback, useReducer, useRef } from 'react';
import {
  ChevronDown, ChevronRight, Download, Upload, BarChart3, Search, X,
  Printer, RotateCcw, Plus, Copy, Trash2, ArrowLeftRight, Check, AlertTriangle
} from 'lucide-react';
import {
  BarChart, Bar, PieChart as RechartsPie, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, LineChart, Line, ResponsiveContainer, Area, AreaChart
} from 'recharts';

// ============================================================================
// DATA
// ============================================================================
const BU_STRUCTURE = {
  "Vaccine Manufacturing": ["AfricAmaril","Assurance Qualité - Garap","DAVAX","LCQ - Garap","MADIBA","Pharmacien Responsable - Garap","Production - Garap","SMS - Maintenance Scientifique Garap","Regional Training Hub - MADIBA Support"],
  "Diagnostic Manufacturing": ["Diatropix (Mbao)"],
  "Clinical Laboratory Services": ["CVI","LBM","LSAHE"],
  "Public Health": ["Direction Santé Publique"],
  "R&D (Research & Innovation)": ["Biobanque","Direction Scientifique","Epidémiologie","Ferme de MBAO","G4 Paludisme / Mega","IMI","Microbiologie","Stations de Recherche","Virologie","Zoologie"],
  "Product Development & Innovation": ["Diatropix (R&D)","Vaccine Research Center"],
  "Education & Training": ["CARE","Regional Training Hub"],
  "Institutional Functions": ["Achats - Approvisionnements","Administration Générale","Delivery Unit / Bureau Exécutif","Direction Digitalisation & SI","Direction Financière & Comptable","Direction du Capital Humain","Magasin Général","Medecine du Travail","Métrologie","Partenariats & Communication","Produits & Charges Communes","SMTI","QHSE","Transit"]
};
const BU_LIST = Object.keys(BU_STRUCTURE);
const ALL_UNITS = Object.entries(BU_STRUCTURE).flatMap(([bu, units]) => units.map(u => ({name: u, bu})));
const BUDGET_LINES = {
  revenues: ["Ventes de Vaccins / Tests","Vente de Services","Autres produits"],
  opex: ["Matières Premières","Consommables Labo","Utilités","Sous traitance","Réparations","Assurance","Consultance","Frais de Personnel","Frais de Formation","Frais Mission/Restauration","Amortissements","Autres Charges"],
  capex: ["Bâtiments, Matériels & Equipements"]
};
const ALL_LINES = [...BUDGET_LINES.revenues, ...BUDGET_LINES.opex, ...BUDGET_LINES.capex];
const MONTHS = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];
const CONSOLIDATED = {"2026":{"Ventes de Vaccins / Tests":{"total":950481693,"monthly":[0,0,0,0,0,0,0,0,0,0,0,950481693]},"Vente de Services":{"total":7554603639,"monthly":[246466017,246466017,246466017,246466017,246466017,246466017,246466017,246466017,246466017,246466017,246466017,4843477452]},"Autres produits":{"total":0,"monthly":[0,0,0,0,0,0,0,0,0,0,0,0]},"Mati\u00e8res Premi\u00e8res":{"total":332668593,"monthly":[0,0,0,0,0,0,0,0,0,0,0,332668593]},"Consommables Labo":{"total":4873334223,"monthly":[405174708,406960663,405531668,406735315,405504633,407072204,405310060,405272612,406406816,405776086,405863772,407725686]},"Utilit\u00e9s":{"total":697428133,"monthly":[58119011,58119011,58119011,58119011,58119011,58119011,58119011,58119011,58119011,58119011,58119011,58119012]},"Sous traitance":{"total":1053423539,"monthly":[87414327,87460415,87598034,87511783,87128617,87980901,89148006,87299085,87618795,87253893,87556587,89453096]},"R\u00e9parations":{"total":350000000,"monthly":[29166666,29166666,29166666,29166666,29166666,29166666,29166666,29166666,29166666,29166666,29166666,29166674]},"Assurance":{"total":95000000,"monthly":[7916666,7916666,7916666,7916666,7916666,7916666,7916666,7916666,7916666,7916666,7916666,7916674]},"Consultance":{"total":1798648793,"monthly":[149887399,149887399,149887399,149887399,149887399,149887399,149887399,149887399,149887399,149887399,149887399,149887404]},"Frais de Personnel":{"total":6817644278,"monthly":[568137023,568137023,568137023,568137023,568137023,568137023,568137023,568137023,568137023,568137023,568137023,568137025]},"Frais de Formation":{"total":107221942,"monthly":[8935161,8935161,8935161,8935161,8935161,8935161,8935161,8935161,8935161,8935161,8935161,8935171]},"Frais Mission/Restauration":{"total":896366756,"monthly":[74697229,74697229,74697229,74697229,74697229,74697229,74697229,74697229,74697229,74697229,74697229,74697237]},"Amortissements":{"total":541517600,"monthly":[22825096,47752030,26757846,67840936,45217473,22608737,58293596,67826210,22608737,22817674,46121447,90847818]},"Autres Charges":{"total":599549598,"monthly":[49962466,49962466,49962466,49962466,49962466,49962466,49962466,49962466,49962466,49962466,49962466,49962472]},"B\u00e2timents, Mat\u00e9riels & Equipements":{"total":8216013444,"monthly":[684667787,684667787,684667787,684667787,684667787,684667787,684667787,684667787,684667787,684667787,684667787,684667787]}},"2027":{"Ventes de Vaccins / Tests":{"total":9197796828},"Vente de Services":{"total":8262333176},"Autres produits":{"total":0},"Mati\u00e8res Premi\u00e8res":{"total":3219228890},"Consommables Labo":{"total":5986757060},"Utilit\u00e9s":{"total":175949255},"Sous traitance":{"total":855034990},"R\u00e9parations":{"total":373016426},"Assurance":{"total":72720770},"Consultance":{"total":2299449207},"Frais de Personnel":{"total":5991867726},"Frais de Formation":{"total":114534919},"Frais Mission/Restauration":{"total":1270429584},"Amortissements":{"total":804076568},"Autres Charges":{"total":766483069},"B\u00e2timents, Mat\u00e9riels & Equipements":{"total":13999999999}},"2028":{"Ventes de Vaccins / Tests":{"total":13421157712},"Vente de Services":{"total":9291767762},"Autres produits":{"total":0},"Mati\u00e8res Premi\u00e8res":{"total":4697405199},"Consommables Labo":{"total":7354566392},"Utilit\u00e9s":{"total":133226178},"Sous traitance":{"total":1247642198},"R\u00e9parations":{"total":397546440},"Assurance":{"total":55666425},"Consultance":{"total":3355289428},"Frais de Personnel":{"total":5266112074},"Frais de Formation":{"total":122346671},"Frais Mission/Restauration":{"total":1800592578},"Amortissements":{"total":1043533131},"Autres Charges":{"total":1118429809},"B\u00e2timents, Mat\u00e9riels & Equipements":{"total":16517520474}}};
const HISTORICAL = {"2023":{"Ventes de Vaccins / Tests":327978500,"Vente de Services":5250508500,"Autres produits":0,"Mati\u00e8res Premi\u00e8res":451696025,"Consommables Labo":2628632564,"Utilit\u00e9s":535277373,"Sous traitance":567112118,"R\u00e9parations":344596475,"Assurance":94230958,"Consultance":-132442146,"Frais de Personnel":6021608487,"Frais de Formation":93966960,"Frais Mission/Restauration":446227187,"Amortissements":851843994,"Autres Charges":-935799892,"B\u00e2timents, Mat\u00e9riels & Equipements":17638892476},"2024":{"Ventes de Vaccins / Tests":0,"Vente de Services":5144392610,"Autres produits":0,"Mati\u00e8res Premi\u00e8res":333867743,"Consommables Labo":3843006784,"Utilit\u00e9s":610997135,"Sous traitance":879030848,"R\u00e9parations":308140100,"Assurance":162126452,"Consultance":1060373240,"Frais de Personnel":7824293190,"Frais de Formation":100375893,"Frais Mission/Restauration":632442263,"Amortissements":474806647,"Autres Charges":673780076,"B\u00e2timents, Mat\u00e9riels & Equipements":14278696860},"2025_est":{"Ventes de Vaccins / Tests":0,"Vente de Services":6694161925,"Autres produits":0,"Mati\u00e8res Premi\u00e8res":1123845701,"Consommables Labo":4358170504,"Utilit\u00e9s":306890298,"Sous traitance":2940124424,"R\u00e9parations":329070050,"Assurance":128563226,"Consultance":1004124289,"Frais de Personnel":7821971048,"Frais de Formation":52197810,"Frais Mission/Restauration":339850532,"Amortissements":508162124,"Autres Charges":334708096,"B\u00e2timents, Mat\u00e9riels & Equipements":8861278312}};
const UNIT_RATIOS = {"AfricAmaril":{"bu":"Vaccine Manufacturing","ratios":{"Amortissements":0.00086544}},"Assurance Qualit\u00e9 - Garap":{"bu":"Vaccine Manufacturing","ratios":{"Consommables Labo":0.00043591,"Sous traitance":0.001041,"R\u00e9parations":0.000435,"Frais de Personnel":0.00031496,"Frais de Formation":0.017089,"Frais Mission/Restauration":0.0159592,"Amortissements":0.00086544}},"DAVAX":{"bu":"Vaccine Manufacturing","ratios":{"Amortissements":0.00086544,"B\u00e2timents, Mat\u00e9riels & Equipements":0.0268492}},"LCQ - Garap":{"bu":"Vaccine Manufacturing","ratios":{"Mati\u00e8res Premi\u00e8res":0.000111,"Consommables Labo":0.10627575,"Utilit\u00e9s":0.00149007,"Sous traitance":0.025651,"R\u00e9parations":0.082843,"Frais de Personnel":0.02740926,"Frais de Formation":0.014526,"Frais Mission/Restauration":0.03583676,"Amortissements":0.00086544,"B\u00e2timents, Mat\u00e9riels & Equipements":0.00272412}},"MADIBA":{"bu":"Vaccine Manufacturing","ratios":{"Autres produits":0.04864205,"Consommables Labo":0.00501035,"R\u00e9parations":0.045522,"Frais de Personnel":0.02529255,"Frais de Formation":0.015545,"Frais Mission/Restauration":0.08865864,"Amortissements":0.00086544,"B\u00e2timents, Mat\u00e9riels & Equipements":0.93128523}},"Pharmacien Responsable - Garap":{"bu":"Vaccine Manufacturing","ratios":{"Frais de Formation":0.044935,"Amortissements":0.00086544}},"Production - Garap":{"bu":"Vaccine Manufacturing","ratios":{"Mati\u00e8res Premi\u00e8res":0.599848,"Consommables Labo":0.11554419,"Utilit\u00e9s":0.02002293,"Sous traitance":0.008298,"R\u00e9parations":0.218684,"Assurance":0.021462,"Frais de Personnel":0.08698713,"Frais de Formation":0.014501,"Frais Mission/Restauration":0.0820834,"Amortissements":0.00086544,"B\u00e2timents, Mat\u00e9riels & Equipements":0.00666767}},"SMS - Maintenance Scientifique Garap":{"bu":"Vaccine Manufacturing","ratios":{"Frais de Personnel":0.01282125,"Amortissements":0.00086544}},"Regional Training Hub - MADIBA Support":{"bu":"Vaccine Manufacturing","ratios":{"Amortissements":0.00086544}},"Diatropix (Mbao)":{"bu":"Diagnostic Manufacturing","ratios":{"Autres produits":0.00947401,"Consommables Labo":0.034924,"Frais de Personnel":0.02407702,"Frais Mission/Restauration":0.002815,"Autres Charges":0.00261206,"B\u00e2timents, Mat\u00e9riels & Equipements":0.00027936}},"CVI":{"bu":"Clinical Laboratory Services","ratios":{"Vente de Services":0.00889498,"Autres produits":0.001271,"Mati\u00e8res Premi\u00e8res":0.16308,"Consommables Labo":0.002383,"Frais de Formation":0.001064,"Frais Mission/Restauration":0.000252,"Autres Charges":0.00138546,"B\u00e2timents, Mat\u00e9riels & Equipements":0.0030895}},"LBM":{"bu":"Clinical Laboratory Services","ratios":{"Vente de Services":0.90337941,"Autres produits":0.001271,"Mati\u00e8res Premi\u00e8res":0.002919,"Consommables Labo":0.325941,"Utilit\u00e9s":0.020975,"Sous traitance":0.47102,"R\u00e9parations":0.106543,"Frais de Personnel":0.14963015,"Frais de Formation":0.062198,"Frais Mission/Restauration":0.063882,"Autres Charges":0.00138546,"B\u00e2timents, Mat\u00e9riels & Equipements":0.0030895}},"LSAHE":{"bu":"Clinical Laboratory Services","ratios":{"Vente de Services":0.07355021,"Autres produits":0.001271,"Consommables Labo":0.058447,"Utilit\u00e9s":0.002641,"Sous traitance":0.030205,"R\u00e9parations":0.023725,"Frais de Personnel":0.02844903,"Frais de Formation":0.084925,"Frais Mission/Restauration":0.033207,"Autres Charges":0.00138546,"B\u00e2timents, Mat\u00e9riels & Equipements":0.0030895}},"Direction Sant\u00e9 Publique":{"bu":"Public Health","ratios":{"Autres produits":0.003481,"Consommables Labo":0.002956,"Utilit\u00e9s":0.000423,"Sous traitance":0.000401,"Frais de Formation":0.011089,"Frais Mission/Restauration":0.018374,"Autres Charges":0.00026903,"B\u00e2timents, Mat\u00e9riels & Equipements":0.00057367}},"Biobanque":{"bu":"R&D (Research & Innovation)","ratios":{"Vente de Services":0.00080855,"Consommables Labo":0.00049277,"Frais Mission/Restauration":0.00360957,"Autres Charges":0.00026232,"B\u00e2timents, Mat\u00e9riels & Equipements":0.00202366}},"Direction Scientifique":{"bu":"R&D (Research & Innovation)","ratios":{"Vente de Services":0.00080855,"Consommables Labo":0.01194761,"R\u00e9parations":0.00520988,"Frais de Personnel":0.00859738,"Frais de Formation":0.03605614,"Frais Mission/Restauration":0.06058558,"Autres Charges":0.03955503,"B\u00e2timents, Mat\u00e9riels & Equipements":0.01168209}},"Epid\u00e9miologie":{"bu":"R&D (Research & Innovation)","ratios":{"Vente de Services":0.00080855,"Consommables Labo":0.0003215,"R\u00e9parations":0.00025399,"Frais de Personnel":0.0374196,"Frais de Formation":0.00921104,"Frais Mission/Restauration":0.0249555}},"Ferme de MBAO":{"bu":"R&D (Research & Innovation)","ratios":{"Vente de Services":0.00080855,"Consommables Labo":0.00217739,"Utilit\u00e9s":0.011944,"Sous traitance":0.001342,"Frais de Personnel":0.00911917,"Frais Mission/Restauration":0.00166413}},"G4 Paludisme / Mega":{"bu":"R&D (Research & Innovation)","ratios":{"Vente de Services":0.00080855,"Consommables Labo":0.00079424,"R\u00e9parations":0.00075498,"Frais de Personnel":0.00020015,"Frais Mission/Restauration":0.00014443}},"IMI":{"bu":"R&D (Research & Innovation)","ratios":{"Vente de Services":0.00080855,"Autres produits":0.01487069,"Consommables Labo":0.00274327,"R\u00e9parations":0.000167,"Frais de Personnel":0.01990668,"Frais de Formation":0.01308205,"Frais Mission/Restauration":0.03414702,"Autres Charges":0.00014544}},"Microbiologie":{"bu":"R&D (Research & Innovation)","ratios":{"Vente de Services":0.00080855,"Autres produits":0.00021089,"Consommables Labo":0.00226553,"Frais de Personnel":0.01635018,"Frais de Formation":0.00171001,"Frais Mission/Restauration":0.00748643,"Autres Charges":0.00071163,"B\u00e2timents, Mat\u00e9riels & Equipements":0.00015329}},"Stations de Recherche":{"bu":"R&D (Research & Innovation)","ratios":{"Vente de Services":0.00080855,"Utilit\u00e9s":0.002142,"Sous traitance":0.014064,"R\u00e9parations":0.0046409,"Frais Mission/Restauration":0.00026622}},"Virologie":{"bu":"R&D (Research & Innovation)","ratios":{"Vente de Services":0.00080855,"Autres produits":0.0361626,"Consommables Labo":0.10858314,"Utilit\u00e9s":0.000661,"Sous traitance":0.027081,"R\u00e9parations":0.03347925,"Frais de Personnel":0.05646434,"Frais de Formation":0.18620872,"Frais Mission/Restauration":0.10994475,"Autres Charges":0.00576184,"B\u00e2timents, Mat\u00e9riels & Equipements":0.00757682}},"Zoologie":{"bu":"R&D (Research & Innovation)","ratios":{"Vente de Services":0.00080855,"Consommables Labo":0.00226353,"Utilit\u00e9s":0.001018,"Sous traitance":0.001024,"Frais de Personnel":0.01362901,"Frais de Formation":0.01380905,"Frais Mission/Restauration":0.04124437,"Autres Charges":0.00054541,"B\u00e2timents, Mat\u00e9riels & Equipements":0.00063561}},"Diatropix (R&D)":{"bu":"Product Development & Innovation","ratios":{"Frais Mission/Restauration":0.000569}},"Vaccine Research Center":{"bu":"Product Development & Innovation","ratios":{"Frais Mission/Restauration":0.000569}},"CARE":{"bu":"Education & Training","ratios":{"Vente de Services":0.00260124,"Autres produits":0.05147605,"R\u00e9parations":0.02174,"Consultance":0.00024686,"Frais de Formation":0.02115,"Autres Charges":0.01668421}},"Regional Training Hub":{"bu":"Education & Training","ratios":{"Vente de Services":0.00260124,"Consultance":0.00024686}},"Achats - Approvisionnements":{"bu":"Institutional Functions","ratios":{"Consommables Labo":0.02941416,"Utilit\u00e9s":0.01362218,"Sous traitance":0.12154941,"R\u00e9parations":0.21273364,"Frais de Personnel":0.00886669,"Frais Mission/Restauration":0.01219205,"Autres Charges":0.00192153}},"Administration G\u00e9n\u00e9rale":{"bu":"Institutional Functions","ratios":{"Consommables Labo":0.00186379,"Utilit\u00e9s":0.00461476,"Sous traitance":0.05745515,"R\u00e9parations":0.00348764,"Assurance":0.10973158,"Frais de Personnel":0.15668299,"Frais de Formation":0.00207571,"Frais Mission/Restauration":0.13968372}},"Direction Financi\u00e8re & Comptable":{"bu":"Institutional Functions","ratios":{"Consommables Labo":0.00252405,"Utilit\u00e9s":0.10655166,"Sous traitance":0.00584808,"R\u00e9parations":0.00941849,"Assurance":0.0899344,"Frais de Personnel":0.01962904,"Frais de Formation":0.02307906,"Frais Mission/Restauration":0.00681297,"Autres Charges":0.00611328}},"Direction du Capital Humain":{"bu":"Institutional Functions","ratios":{"Autres produits":0.00059822,"Consommables Labo":0.01071381,"Sous traitance":0.12147684,"R\u00e9parations":0.07247578,"Assurance":0.01107185,"Frais de Personnel":0.08109855,"Frais de Formation":0.3160086,"Frais Mission/Restauration":0.01679873,"Autres Charges":0.00185476}},"Magasin G\u00e9n\u00e9ral":{"bu":"Institutional Functions","ratios":{"Utilit\u00e9s":0.00993381,"R\u00e9parations":0.00025489,"Frais de Personnel":0.02191218,"Autres Charges":0.00273299}},"Medecine du Travail":{"bu":"Institutional Functions","ratios":{"Consommables Labo":0.00064142,"Sous traitance":0.00277708,"Frais de Personnel":0.02109073}},"Partenariats & Communication":{"bu":"Institutional Functions","ratios":{"Consommables Labo":0.00842175,"Sous traitance":0.00178769,"Consultance":0.00032635,"Frais Mission/Restauration":0.04179876,"Autres Charges":0.03071386}},"Produits & Charges Communes":{"bu":"Institutional Functions","ratios":{"Ventes de Vaccins / Tests":1.0,"Autres produits":0.83126962,"Mati\u00e8res Premi\u00e8res":0.233958,"Consommables Labo":0.14967612,"Utilit\u00e9s":0.80272211,"Sous traitance":0.10897875,"R\u00e9parations":0.15720493,"Assurance":0.63015198,"Consultance":0.99917993,"Frais de Personnel":0.1682966,"Frais de Formation":0.11173763,"Frais Mission/Restauration":0.15105319,"Amortissements":0.992211,"Autres Charges":0.88355276}},"Transit":{"bu":"Institutional Functions","ratios":{"Consommables Labo":0.01311691,"Utilit\u00e9s":0.00106749,"R\u00e9parations":0.00030462,"Assurance":0.13764819,"Frais de Personnel":0.00569771,"Frais Mission/Restauration":0.00525959,"Autres Charges":0.00240748}}};
const BU_COLORS = {"Vaccine Manufacturing":"#1e40af","Diagnostic Manufacturing":"#059669","Clinical Laboratory Services":"#7c3aed","Public Health":"#dc2626","R&D (Research & Innovation)":"#d97706","Product Development & Innovation":"#0891b2","Education & Training":"#be185d","Institutional Functions":"#4b5563"};
const LINE_COLORS = ["#1e40af","#059669","#7c3aed","#dc2626","#d97706","#0891b2","#be185d","#4b5563","#65a30d","#0d9488","#c026d3","#ea580c","#6366f1","#14b8a6","#f43f5e","#8b5cf6"];

// ============================================================================
// UTILITIES
// ============================================================================
function fmt(v, inMillions = false) {
  if (v === null || v === undefined || isNaN(v)) return "-";
  if (Math.abs(v) < 0.5) return "-";
  let val = inMillions ? v / 1000000 : v;
  const neg = val < 0;
  val = Math.abs(Math.round(val));
  const formatted = val.toLocaleString('fr-FR');
  if (inMillions) return neg ? `(${formatted} M)` : `${formatted} M`;
  return neg ? `(${formatted})` : formatted;
}

function pct(v) {
  if (v === null || v === undefined || isNaN(v) || !isFinite(v)) return "-";
  const val = v * 100;
  return `${val >= 0 ? '+' : ''}${val.toFixed(1)}%`;
}

function computeUnitBudget(unitName, line, year) {
  const info = UNIT_RATIOS[unitName];
  if (!info) return 0;
  const ratio = info.ratios[line] || 0;
  const consol = CONSOLIDATED[year]?.[line];
  if (!consol) return 0;
  return Math.round(consol.total * ratio);
}

function computeUnitMonthly(unitName, line) {
  const info = UNIT_RATIOS[unitName];
  if (!info) return Array(12).fill(0);
  const ratio = info.ratios[line] || 0;
  const monthly = CONSOLIDATED["2026"]?.[line]?.monthly;
  if (!monthly) return Array(12).fill(0);
  return monthly.map(m => Math.round(m * ratio));
}

function computeBUBudget(buName, line, year) {
  const units = BU_STRUCTURE[buName] || [];
  return units.reduce((sum, u) => sum + computeUnitBudget(u, line, year), 0);
}

function computeBUMonthly(buName, line) {
  const units = BU_STRUCTURE[buName] || [];
  const result = Array(12).fill(0);
  units.forEach(u => {
    const m = computeUnitMonthly(u, line);
    m.forEach((v, i) => result[i] += v);
  });
  return result;
}

// ============================================================================
// REDUCER
// ============================================================================
const initialState = {
  year: "2026",
  view: "consolidated", // consolidated | bu | unit | dashboard
  selectedBU: null,
  selectedUnit: null,
  expandedBUs: {},
  search: "",
  inMillions: false,
  showMonthly: false,
  overrides: {}, // {unitName: {line: {year: value}}}
  scenarios: [{ id: "base", name: "Budget de base", overrides: {} }],
  activeScenario: "base",
  compareScenario: null,
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_YEAR': return {...state, year: action.payload};
    case 'SET_VIEW': return {...state, view: action.payload, selectedBU: action.bu || state.selectedBU, selectedUnit: action.unit || null};
    case 'TOGGLE_BU': return {...state, expandedBUs: {...state.expandedBUs, [action.payload]: !state.expandedBUs[action.payload]}};
    case 'SELECT_BU': return {...state, view: 'bu', selectedBU: action.payload, selectedUnit: null};
    case 'SELECT_UNIT': return {...state, view: 'unit', selectedUnit: action.payload, selectedBU: action.bu};
    case 'SET_SEARCH': return {...state, search: action.payload};
    case 'TOGGLE_MILLIONS': return {...state, inMillions: !state.inMillions};
    case 'TOGGLE_MONTHLY': return {...state, showMonthly: !state.showMonthly};
    case 'SET_OVERRIDE': {
      const {unit, line, year, value} = action.payload;
      const o = {...state.overrides};
      if (!o[unit]) o[unit] = {};
      if (!o[unit][line]) o[unit][line] = {};
      o[unit][line][year] = value;
      const scenarios = state.scenarios.map(s => s.id === state.activeScenario ? {...s, overrides: o} : s);
      return {...state, overrides: o, scenarios};
    }
    case 'RESET_OVERRIDE': {
      const {unit, line, year} = action.payload;
      const o = {...state.overrides};
      if (o[unit]?.[line]) { delete o[unit][line][year]; if (!Object.keys(o[unit][line]).length) delete o[unit][line]; if (!Object.keys(o[unit]).length) delete o[unit]; }
      return {...state, overrides: o};
    }
    case 'ADD_SCENARIO': {
      const newId = `scenario_${Date.now()}`;
      return {...state, scenarios: [...state.scenarios, {id: newId, name: action.payload || `Scénario ${state.scenarios.length}`, overrides: JSON.parse(JSON.stringify(state.overrides))}], activeScenario: newId, overrides: JSON.parse(JSON.stringify(state.overrides))};
    }
    case 'SWITCH_SCENARIO': {
      const sc = state.scenarios.find(s => s.id === action.payload);
      return {...state, activeScenario: action.payload, overrides: sc ? JSON.parse(JSON.stringify(sc.overrides)) : {}, compareScenario: null};
    }
    case 'SET_COMPARE': return {...state, compareScenario: action.payload};
    case 'DELETE_SCENARIO': {
      if (action.payload === 'base') return state;
      const filtered = state.scenarios.filter(s => s.id !== action.payload);
      const newActive = state.activeScenario === action.payload ? 'base' : state.activeScenario;
      const baseSc = filtered.find(s => s.id === newActive);
      return {...state, scenarios: filtered, activeScenario: newActive, overrides: baseSc ? JSON.parse(JSON.stringify(baseSc.overrides)) : {}, compareScenario: state.compareScenario === action.payload ? null : state.compareScenario};
    }
    default: return state;
  }
}

// ============================================================================
// HOOKS
// ============================================================================
function useComputedBudget(state) {
  return useMemo(() => {
    const getUnitValue = (unit, line, year) => {
      const override = state.overrides[unit]?.[line]?.[year];
      if (override !== undefined) return override;
      return computeUnitBudget(unit, line, year);
    };
    const getBUValue = (bu, line, year) => {
      return (BU_STRUCTURE[bu] || []).reduce((s, u) => s + getUnitValue(u, line, year), 0);
    };
    const getConsolidatedValue = (line, year) => {
      return BU_LIST.reduce((s, bu) => s + getBUValue(bu, line, year), 0);
    };
    const isOverridden = (unit, line, year) => state.overrides[unit]?.[line]?.[year] !== undefined;
    return { getUnitValue, getBUValue, getConsolidatedValue, isOverridden };
  }, [state.overrides]);
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function IPDBudgetApp() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const budget = useComputedBudget(state);
  const M = state.inMillions;

  const consolidatedTotals = useMemo(() => {
    const rev = BUDGET_LINES.revenues.reduce((s, l) => s + budget.getConsolidatedValue(l, state.year), 0);
    const opex = BUDGET_LINES.opex.reduce((s, l) => s + budget.getConsolidatedValue(l, state.year), 0);
    const capex = BUDGET_LINES.capex.reduce((s, l) => s + budget.getConsolidatedValue(l, state.year), 0);
    return { rev, opex, capex, net: rev - opex };
  }, [state.year, budget]);

  return (
    <div style={{fontFamily:'"DM Sans", sans-serif'}} className="flex h-screen bg-gray-50">
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet"/>
      {/* SIDEBAR */}
      <aside className="w-72 flex flex-col overflow-hidden" style={{background:"linear-gradient(180deg, #0A1628 0%, #132038 100%)"}}>
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <img src="/logo-institut-pasteur.png" alt="Institut Pasteur de Dakar" className="h-12 w-12 rounded-lg object-contain bg-white p-1"/>
            <div>
              <h1 className="text-xl font-bold" style={{fontFamily:'"Playfair Display", serif', color:"#C5A55A"}}>Institut Pasteur de Dakar</h1>
              <p className="text-xs mt-1" style={{color:"#8899AA"}}>Budget Interne 2026-2028</p>
            </div>
          </div>
        </div>
        <div className="px-3 py-2">
          <div className="flex items-center bg-white/5 rounded-lg px-3 py-2">
            <Search size={14} className="text-gray-400 mr-2"/>
            <input className="bg-transparent text-white text-sm outline-none w-full placeholder-gray-500" placeholder="Rechercher..." value={state.search} onChange={e => dispatch({type:'SET_SEARCH', payload:e.target.value})}/>
            {state.search && <X size={14} className="text-gray-400 cursor-pointer" onClick={() => dispatch({type:'SET_SEARCH', payload:''})}/>}
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-1">
          <SidebarItem label="Vue Consolidée" icon={<BarChart3 size={15}/>} active={state.view==='consolidated'} onClick={() => dispatch({type:'SET_VIEW', payload:'consolidated'})}/>
          <SidebarItem label="Tableau de Bord" icon={<BarChart3 size={15}/>} active={state.view==='dashboard'} onClick={() => dispatch({type:'SET_VIEW', payload:'dashboard'})} style={{marginBottom:12}}/>
          <div className="text-xs font-semibold uppercase tracking-wider px-3 py-2" style={{color:"#6B7A8D"}}>Business Units</div>
          {BU_LIST.filter(bu => !state.search || bu.toLowerCase().includes(state.search.toLowerCase()) || BU_STRUCTURE[bu].some(u => u.toLowerCase().includes(state.search.toLowerCase()))).map(bu => (
            <div key={bu}>
              <div className={`flex items-center px-3 py-2 rounded-lg cursor-pointer text-sm mb-0.5 ${state.view==='bu' && state.selectedBU===bu ? 'bg-white/10' : 'hover:bg-white/5'}`} style={{color: state.view==='bu' && state.selectedBU===bu ? '#C5A55A' : '#CBD5E1'}}>
                <span className="mr-2 cursor-pointer" onClick={() => dispatch({type:'TOGGLE_BU', payload:bu})}>{state.expandedBUs[bu] ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}</span>
                <span className="truncate flex-1" onClick={() => dispatch({type:'SELECT_BU', payload:bu})}>{bu}</span>
                <span className="text-xs ml-1" style={{color:"#6B7A8D"}}>{BU_STRUCTURE[bu].length}</span>
              </div>
              {state.expandedBUs[bu] && BU_STRUCTURE[bu].filter(u => !state.search || u.toLowerCase().includes(state.search.toLowerCase())).map(unit => (
                <div key={unit} className={`pl-9 pr-3 py-1.5 rounded-lg cursor-pointer text-xs mb-0.5 truncate ${state.view==='unit' && state.selectedUnit===unit ? 'bg-white/10' : 'hover:bg-white/5'}`}
                  style={{color: state.view==='unit' && state.selectedUnit===unit ? '#C5A55A' : '#8899AA'}}
                  onClick={() => dispatch({type:'SELECT_UNIT', payload:unit, bu})}>
                  {unit}
                </div>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      {/* MAIN */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* TOP BAR */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="cursor-pointer hover:text-gray-900" onClick={() => dispatch({type:'SET_VIEW', payload:'consolidated'})}>Consolidé</span>
            {state.selectedBU && state.view !== 'consolidated' && state.view !== 'dashboard' && (<><span>/</span><span className="cursor-pointer hover:text-gray-900" onClick={() => dispatch({type:'SELECT_BU', payload:state.selectedBU})}>{state.selectedBU}</span></>)}
            {state.selectedUnit && state.view === 'unit' && (<><span>/</span><span className="font-medium text-gray-900">{state.selectedUnit}</span></>)}
            {state.view === 'dashboard' && <span className="font-medium text-gray-900">/ Tableau de Bord</span>}
          </div>
          <div className="flex items-center gap-3">
            {/* Year tabs */}
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              {["2026","2027","2028"].map(y => (
                <button key={y} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${state.year===y ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                  onClick={() => dispatch({type:'SET_YEAR', payload:y})}>{y}</button>
              ))}
            </div>
            <button className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${state.inMillions ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-600'}`}
              onClick={() => dispatch({type:'TOGGLE_MILLIONS'})}>
              {state.inMillions ? 'Millions FCFA' : 'FCFA'}
            </button>
            <ExportButton state={state} budget={budget}/>
          </div>
        </header>

        {/* CONTENT */}
        <main className="flex-1 overflow-auto p-6">
          {/* SUMMARY CARDS */}
          {state.view !== 'dashboard' && (
            <div className="grid grid-cols-4 gap-4 mb-6">
              <SummaryCard label="Revenus" value={fmt(consolidatedTotals.rev, M)} color="#059669" sub={`Budget ${state.year}`}/>
              <SummaryCard label="OPEX" value={fmt(consolidatedTotals.opex, M)} color="#dc2626" sub="Charges d'exploitation"/>
              <SummaryCard label="CAPEX" value={fmt(consolidatedTotals.capex, M)} color="#d97706" sub="Investissements"/>
              <SummaryCard label="Résultat Net" value={fmt(consolidatedTotals.net, M)} color={consolidatedTotals.net >= 0 ? "#059669" : "#dc2626"} sub={consolidatedTotals.net < 0 ? "Déficit" : "Excédent"} highlight/>
            </div>
          )}

          {state.view === 'consolidated' && <ConsolidatedView state={state} dispatch={dispatch} budget={budget} M={M}/>}
          {state.view === 'bu' && <BUView state={state} dispatch={dispatch} budget={budget} M={M}/>}
          {state.view === 'unit' && <UnitView state={state} dispatch={dispatch} budget={budget} M={M}/>}
          {state.view === 'dashboard' && <DashboardView state={state} budget={budget} M={M}/>}
        </main>
      </div>
    </div>
  );
}

// ============================================================================
// UI COMPONENTS
// ============================================================================
function SidebarItem({label, icon, active, onClick, style}) {
  return (
    <div className={`flex items-center px-3 py-2 rounded-lg cursor-pointer text-sm mb-0.5 ${active ? 'bg-white/10' : 'hover:bg-white/5'}`}
      style={{color: active ? '#C5A55A' : '#CBD5E1', ...style}} onClick={onClick}>
      <span className="mr-2">{icon}</span>{label}
    </div>
  );
}

function SummaryCard({label, value, color, sub, highlight}) {
  return (
    <div className={`bg-white rounded-xl p-5 border ${highlight ? 'border-2' : 'border-gray-100'} shadow-sm`} style={highlight ? {borderColor: color} : {}}>
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold mt-1" style={{color, fontFamily:'"Playfair Display", serif'}}>{value}</p>
      <p className="text-xs text-gray-400 mt-1">{sub}</p>
    </div>
  );
}

// ============================================================================
// CONSOLIDATED VIEW
// ============================================================================
function ConsolidatedView({state, dispatch, budget, M}) {
  const yr = state.year;
  const prevYr = yr === "2026" ? null : String(Number(yr) - 1);
  const renderSection = (title, lines, type) => (
    <div className="mb-4">
      <div className="flex items-center py-2 px-4 rounded-t-lg" style={{background: type==='revenues' ? '#ecfdf5' : type==='opex' ? '#fef2f2' : '#fffbeb'}}>
        <span className="font-semibold text-sm" style={{color: type==='revenues' ? '#065f46' : type==='opex' ? '#991b1b' : '#92400e'}}>{title}</span>
      </div>
      <table className="w-full text-sm">
        <tbody>
          {lines.map((line, i) => {
            const val = budget.getConsolidatedValue(line, yr);
            const prev = prevYr ? budget.getConsolidatedValue(line, prevYr) : (HISTORICAL["2025_est"]?.[line] || 0);
            const h24 = HISTORICAL["2024"]?.[line] || 0;
            const h23 = HISTORICAL["2023"]?.[line] || 0;
            const variation = prev ? (val - prev) / Math.abs(prev) : null;
            return (
              <tr key={line} className={i % 2 === 0 ? 'bg-gray-50/50' : 'bg-white'}>
                <td className="py-2 px-4 text-gray-700 w-80">{line}</td>
                <td className="py-2 px-3 text-right font-medium" style={{color: val < 0 ? '#dc2626' : '#111'}}>{fmt(val, M)}</td>
                <td className="py-2 px-3 text-right text-gray-400 text-xs">{fmt(prev, M)}</td>
                <td className="py-2 px-3 text-right text-gray-400 text-xs">{fmt(h24, M)}</td>
                <td className="py-2 px-3 text-right text-gray-400 text-xs">{fmt(h23, M)}</td>
                <td className="py-2 px-3 text-right text-xs" style={{color: variation > 0 ? '#dc2626' : variation < 0 ? '#059669' : '#6b7280'}}>{pct(variation)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="flex items-center py-2 px-4 bg-gray-100 rounded-b-lg border-t">
        <span className="font-bold text-sm text-gray-700 w-80">TOTAL {title.toUpperCase()}</span>
        <span className="font-bold text-sm text-right flex-1" style={{color: type==='revenues' ? '#059669' : '#dc2626'}}>
          {fmt(lines.reduce((s, l) => s + budget.getConsolidatedValue(l, yr), 0), M)}
        </span>
      </div>
    </div>
  );

  // Chart data
  const chartData = ["2023","2024","2025_est","2026","2027","2028"].map(y => {
    const src = ["2023","2024","2025_est"].includes(y) ? HISTORICAL[y] || {} : null;
    const rev = src ? BUDGET_LINES.revenues.reduce((s,l) => s + (src[l]||0), 0) : BUDGET_LINES.revenues.reduce((s,l) => s + budget.getConsolidatedValue(l, y), 0);
    const opex = src ? BUDGET_LINES.opex.reduce((s,l) => s + (src[l]||0), 0) : BUDGET_LINES.opex.reduce((s,l) => s + budget.getConsolidatedValue(l, y), 0);
    const capex = src ? (src["Bâtiments, Matériels & Equipements"]||0) : budget.getConsolidatedValue("Bâtiments, Matériels & Equipements", y);
    return {year: y.replace('_est',' (est.)'), Revenus: Math.round(rev/1e6), OPEX: Math.round(opex/1e6), CAPEX: Math.round(capex/1e6), Net: Math.round((rev-opex)/1e6)};
  });

  return (
    <div>
      {/* Scenario bar */}
      <ScenarioBar state={state} dispatch={dispatch}/>
      
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900" style={{fontFamily:'"Playfair Display", serif'}}>Budget Consolidé {yr}</h2>
            <p className="text-xs text-gray-400 mt-0.5">Budget Interne uniquement (hors Grants) — Montants en FCFA</p>
          </div>
          <div className="flex gap-2">
            <span className="text-xs px-2 py-1 bg-gray-100 rounded font-medium">Réf: {yr === "2026" ? "2025 (Est.)" : String(Number(yr)-1)}</span>
            <span className="text-xs px-2 py-1 bg-gray-100 rounded font-medium">2024 (Réel)</span>
            <span className="text-xs px-2 py-1 bg-gray-100 rounded font-medium">2023 (Réel)</span>
            <span className="text-xs px-2 py-1 bg-gray-100 rounded font-medium">Var %</span>
          </div>
        </div>
        <div className="p-4">
          {renderSection("Produits / Revenus", BUDGET_LINES.revenues, 'revenues')}
          {renderSection("Charges d'exploitation (OPEX)", BUDGET_LINES.opex, 'opex')}
          {renderSection("Investissements (CAPEX)", BUDGET_LINES.capex, 'capex')}
        </div>
      </div>

      {/* Monthly breakdown for 2026 */}
      {yr === "2026" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-100 cursor-pointer flex items-center justify-between" onClick={() => dispatch({type:'TOGGLE_MONTHLY'})}>
            <h3 className="text-sm font-bold text-gray-700">Ventilation Mensuelle 2026</h3>
            {state.showMonthly ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
          </div>
          {state.showMonthly && (
            <div className="overflow-x-auto p-4">
              <table className="w-full text-xs">
                <thead><tr className="border-b"><th className="text-left py-2 px-2 w-60">Ligne</th>{MONTHS.map(m => <th key={m} className="text-right py-2 px-2">{m}</th>)}<th className="text-right py-2 px-2 font-bold">Total</th></tr></thead>
                <tbody>
                  {ALL_LINES.map((line, i) => {
                    const monthly = CONSOLIDATED["2026"]?.[line]?.monthly || Array(12).fill(0);
                    return (
                      <tr key={line} className={i % 2 === 0 ? 'bg-gray-50/50' : ''}>
                        <td className="py-1.5 px-2 text-gray-700 truncate">{line}</td>
                        {monthly.map((v, mi) => <td key={mi} className="py-1.5 px-2 text-right text-gray-600">{fmt(v, M)}</td>)}
                        <td className="py-1.5 px-2 text-right font-bold">{fmt(monthly.reduce((a,b)=>a+b,0), M)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Chart */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-sm font-bold text-gray-700 mb-4">Trajectoire Budgétaire 2023-2028 (M FCFA)</h3>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={chartData} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
            <XAxis dataKey="year" tick={{fontSize:12}}/>
            <YAxis tick={{fontSize:11}} tickFormatter={v => `${v/1000}B`}/>
            <Tooltip formatter={v => `${v.toLocaleString('fr-FR')} M`}/>
            <Legend/>
            <Bar dataKey="Revenus" fill="#059669" radius={[4,4,0,0]}/>
            <Bar dataKey="OPEX" fill="#dc2626" radius={[4,4,0,0]}/>
            <Bar dataKey="CAPEX" fill="#d97706" radius={[4,4,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ============================================================================
// BU VIEW
// ============================================================================
function BUView({state, dispatch, budget, M}) {
  const bu = state.selectedBU;
  if (!bu) return null;
  const yr = state.year;
  const units = BU_STRUCTURE[bu] || [];

  const unitData = units.map(u => {
    const total = ALL_LINES.reduce((s, l) => s + Math.abs(budget.getUnitValue(u, l, yr)), 0);
    return {name: u, total};
  }).sort((a,b) => b.total - a.total);

  const pieData = unitData.filter(d => d.total > 0).map((d, i) => ({...d, fill: LINE_COLORS[i % LINE_COLORS.length]}));

  return (
    <div>
      <ScenarioBar state={state} dispatch={dispatch}/>
      
      <div className="grid grid-cols-3 gap-6 mb-6">
        {/* Budget table */}
        <div className="col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900" style={{fontFamily:'"Playfair Display", serif'}}>{bu}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{units.length} unités — Budget {yr}</p>
          </div>
          <div className="p-4">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-200"><th className="text-left py-2 px-3 text-gray-500 text-xs">Ligne Budgétaire</th><th className="text-right py-2 px-3 text-gray-500 text-xs">Budget {yr}</th><th className="text-right py-2 px-3 text-gray-500 text-xs">% du Consolidé</th></tr></thead>
              <tbody>
                {ALL_LINES.map((line, i) => {
                  const val = budget.getBUValue(bu, line, yr);
                  const consolVal = budget.getConsolidatedValue(line, yr);
                  const pctVal = consolVal ? val / consolVal : 0;
                  if (Math.abs(val) < 1 && Math.abs(consolVal) < 1) return null;
                  return (
                    <tr key={line} className={i % 2 === 0 ? 'bg-gray-50/50' : ''}>
                      <td className="py-2 px-3 text-gray-700">{line}</td>
                      <td className="py-2 px-3 text-right font-medium" style={{color: val < 0 ? '#dc2626' : '#111'}}>{fmt(val, M)}</td>
                      <td className="py-2 px-3 text-right text-xs text-gray-500">{(pctVal*100).toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Unit composition */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-700">Composition par Unité</h3>
          </div>
          <div className="p-4">
            {pieData.length > 0 && (
              <ResponsiveContainer width="100%" height={220}>
                <RechartsPie>
                  <Pie data={pieData} dataKey="total" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90}>
                    {pieData.map((d, i) => <Cell key={i} fill={d.fill}/>)}
                  </Pie>
                  <Tooltip formatter={v => fmt(v, M)}/>
                </RechartsPie>
              </ResponsiveContainer>
            )}
            <div className="mt-3 space-y-1">
              {unitData.map((d, i) => (
                <div key={d.name} className="flex items-center text-xs cursor-pointer hover:bg-gray-50 px-2 py-1 rounded"
                  onClick={() => dispatch({type:'SELECT_UNIT', payload:d.name, bu})}>
                  <span className="w-2 h-2 rounded-full mr-2 flex-shrink-0" style={{background: LINE_COLORS[i % LINE_COLORS.length]}}/>
                  <span className="truncate flex-1 text-gray-700">{d.name}</span>
                  <span className="text-gray-400 ml-2">{fmt(d.total, M)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// UNIT VIEW
// ============================================================================
function UnitView({state, dispatch, budget, M}) {
  const unit = state.selectedUnit;
  const bu = state.selectedBU;
  if (!unit) return null;
  const yr = state.year;
  const [editLine, setEditLine] = useState(null);
  const [editVal, setEditVal] = useState('');
  const inputRef = useRef(null);

  const startEdit = (line, val) => { setEditLine(line); setEditVal(String(Math.round(val))); setTimeout(() => inputRef.current?.focus(), 50); };
  const saveEdit = (line) => {
    const num = parseInt(editVal.replace(/\s/g, ''), 10);
    if (!isNaN(num)) dispatch({type:'SET_OVERRIDE', payload:{unit, line, year:yr, value:num}});
    setEditLine(null);
  };
  const cancelEdit = () => setEditLine(null);

  return (
    <div>
      <ScenarioBar state={state} dispatch={dispatch}/>
      
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900" style={{fontFamily:'"Playfair Display", serif'}}>{unit}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{bu} — Budget {yr} — Cliquer sur un montant pour modifier</p>
          </div>
          {Object.keys(state.overrides[unit] || {}).length > 0 && (
            <button className="text-xs px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1"
              onClick={() => { ALL_LINES.forEach(l => dispatch({type:'RESET_OVERRIDE', payload:{unit, line:l, year:yr}})); }}>
              <RotateCcw size={12}/> Réinitialiser
            </button>
          )}
        </div>
        <div className="p-4">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-200">
              <th className="text-left py-2 px-3 text-gray-500 text-xs">Ligne Budgétaire</th>
              <th className="text-right py-2 px-3 text-gray-500 text-xs">Budget {yr}</th>
              <th className="text-right py-2 px-3 text-gray-500 text-xs">Ratio</th>
              <th className="text-right py-2 px-3 text-gray-500 text-xs">Alloué (calcul)</th>
              <th className="text-center py-2 px-3 text-gray-500 text-xs">Statut</th>
            </tr></thead>
            <tbody>
              {ALL_LINES.map((line, i) => {
                const val = budget.getUnitValue(unit, line, yr);
                const allocated = computeUnitBudget(unit, line, yr);
                const isOvr = budget.isOverridden(unit, line, yr);
                const ratio = UNIT_RATIOS[unit]?.ratios[line] || 0;
                if (Math.abs(val) < 1 && Math.abs(allocated) < 1 && ratio === 0) return null;
                return (
                  <tr key={line} className={`${i % 2 === 0 ? 'bg-gray-50/50' : ''} hover:bg-blue-50/30`}>
                    <td className="py-2 px-3 text-gray-700">{line}</td>
                    <td className="py-2 px-3 text-right">
                      {editLine === line ? (
                        <div className="flex items-center justify-end gap-1">
                          <input ref={inputRef} className="w-32 text-right border rounded px-2 py-1 text-sm" value={editVal}
                            onChange={e => setEditVal(e.target.value)}
                            onKeyDown={e => { if(e.key==='Enter') saveEdit(line); if(e.key==='Escape') cancelEdit(); }}/>
                          <button onClick={() => saveEdit(line)} className="text-green-600"><Check size={14}/></button>
                          <button onClick={cancelEdit} className="text-gray-400"><X size={14}/></button>
                        </div>
                      ) : (
                        <span className={`cursor-pointer hover:underline font-medium ${isOvr ? 'text-blue-600' : val < 0 ? 'text-red-600' : 'text-gray-900'}`}
                          onClick={() => startEdit(line, val)}>
                          {fmt(val, M)}
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right text-xs text-gray-400">{ratio > 0 ? (ratio*100).toFixed(2)+'%' : '-'}</td>
                    <td className="py-2 px-3 text-right text-xs text-gray-400">{fmt(allocated, M)}</td>
                    <td className="py-2 px-3 text-center">
                      {isOvr ? (
                        <span className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                          Modifié <button onClick={() => dispatch({type:'RESET_OVERRIDE', payload:{unit, line, year:yr}})}><RotateCcw size={10}/></button>
                        </span>
                      ) : ratio > 0 ? (
                        <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Alloué</span>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// DASHBOARD VIEW
// ============================================================================
function DashboardView({state, budget, M}) {
  const yr = state.year;
  
  // Revenue by BU
  const revByBU = BU_LIST.map(bu => ({
    name: bu.replace('R&D (Research & Innovation)','R&D').replace('Product Development & Innovation','PDI').replace('Clinical Laboratory Services','Clinical Lab').replace('Institutional Functions','Inst. Functions').replace('Education & Training','Education'),
    value: BUDGET_LINES.revenues.reduce((s, l) => s + budget.getBUValue(bu, l, yr), 0)
  })).filter(d => d.value > 0).sort((a,b) => b.value - a.value);

  // OPEX breakdown
  const opexByLine = BUDGET_LINES.opex.map((l, i) => ({
    name: l, value: Math.abs(budget.getConsolidatedValue(l, yr)), fill: LINE_COLORS[i]
  })).filter(d => d.value > 0).sort((a,b) => b.value - a.value);

  // Top 10 units by OPEX
  const topUnits = ALL_UNITS.map(({name, bu}) => ({
    name: name.length > 25 ? name.substring(0,22)+'...' : name,
    value: BUDGET_LINES.opex.reduce((s, l) => s + budget.getUnitValue(name, l, yr), 0),
    bu
  })).sort((a,b) => b.value - a.value).slice(0, 10);

  // Deficit trajectory
  const deficitData = ["2023","2024","2026","2027","2028"].map(y => {
    const src = ["2023","2024"].includes(y) ? HISTORICAL[y] : null;
    const rev = src ? BUDGET_LINES.revenues.reduce((s,l) => s+(src[l]||0), 0) : BUDGET_LINES.revenues.reduce((s,l) => s+budget.getConsolidatedValue(l,y), 0);
    const opex = src ? BUDGET_LINES.opex.reduce((s,l) => s+(src[l]||0), 0) : BUDGET_LINES.opex.reduce((s,l) => s+budget.getConsolidatedValue(l,y), 0);
    return {year: y, Résultat: Math.round((rev-opex)/1e6)};
  });

  // Validation
  const validation = ALL_LINES.map(line => {
    const consolOriginal = CONSOLIDATED[yr]?.[line]?.total || 0;
    const sumBU = BU_LIST.reduce((s, bu) => s + budget.getBUValue(bu, line, yr), 0);
    const delta = Math.abs(consolOriginal - sumBU);
    return {line, consolOriginal, sumBU, delta, pass: delta < 100};
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        {/* Revenue by BU */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-sm font-bold text-gray-700 mb-4">Revenus par Business Unit (M FCFA)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={revByBU} layout="vertical" barCategoryGap="15%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
              <XAxis type="number" tick={{fontSize:11}} tickFormatter={v => `${Math.round(v/1e6)}`}/>
              <YAxis type="category" dataKey="name" tick={{fontSize:10}} width={100}/>
              <Tooltip formatter={v => fmt(v, true)}/>
              <Bar dataKey="value" fill="#059669" radius={[0,4,4,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* OPEX pie */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-sm font-bold text-gray-700 mb-4">Répartition OPEX</h3>
          <ResponsiveContainer width="100%" height={250}>
            <RechartsPie>
              <Pie data={opexByLine.slice(0,8)} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={100}>
                {opexByLine.slice(0,8).map((d,i) => <Cell key={i} fill={d.fill}/>)}
              </Pie>
              <Tooltip formatter={v => fmt(v, true)}/>
            </RechartsPie>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-2 mt-2">
            {opexByLine.slice(0,8).map(d => (
              <span key={d.name} className="flex items-center text-xs"><span className="w-2 h-2 rounded-full mr-1" style={{background:d.fill}}/>{d.name.substring(0,20)}</span>
            ))}
          </div>
        </div>

        {/* Deficit trajectory */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-sm font-bold text-gray-700 mb-4">Trajectoire du Résultat (hors CAPEX, M FCFA)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={deficitData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
              <XAxis dataKey="year" tick={{fontSize:12}}/>
              <YAxis tick={{fontSize:11}}/>
              <Tooltip formatter={v => `${v.toLocaleString('fr-FR')} M`}/>
              <Area type="monotone" dataKey="Résultat" fill="#dc262622" stroke="#dc2626" strokeWidth={2}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Top units */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-sm font-bold text-gray-700 mb-4">Top 10 Unités par OPEX</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={topUnits} layout="vertical" barCategoryGap="12%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
              <XAxis type="number" tick={{fontSize:11}} tickFormatter={v => `${Math.round(v/1e6)}M`}/>
              <YAxis type="category" dataKey="name" tick={{fontSize:9}} width={140}/>
              <Tooltip formatter={v => fmt(v, true)}/>
              <Bar dataKey="value" fill="#7c3aed" radius={[0,4,4,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Validation table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-700">Contrôle de Cohérence — Consolidé vs Somme des BUs ({yr})</h3>
        </div>
        <table className="w-full text-xs">
          <thead><tr className="border-b bg-gray-50"><th className="text-left py-2 px-4">Ligne</th><th className="text-right py-2 px-4">Consolidé</th><th className="text-right py-2 px-4">Somme BUs</th><th className="text-right py-2 px-4">Delta</th><th className="text-center py-2 px-4">Statut</th></tr></thead>
          <tbody>
            {validation.map((v, i) => (
              <tr key={v.line} className={i%2===0 ? 'bg-gray-50/50' : ''}>
                <td className="py-1.5 px-4 text-gray-700">{v.line}</td>
                <td className="py-1.5 px-4 text-right">{fmt(v.consolOriginal, M)}</td>
                <td className="py-1.5 px-4 text-right">{fmt(v.sumBU, M)}</td>
                <td className="py-1.5 px-4 text-right" style={{color: v.delta > 100 ? '#dc2626' : '#059669'}}>{fmt(v.delta)}</td>
                <td className="py-1.5 px-4 text-center">{v.pass ? <Check size={14} className="inline text-green-600"/> : <AlertTriangle size={14} className="inline text-amber-500"/>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// SCENARIO BAR
// ============================================================================
function ScenarioBar({state, dispatch}) {
  const [newName, setNewName] = useState('');
  const [showNew, setShowNew] = useState(false);
  return (
    <div className="flex items-center gap-3 mb-4 bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
      <span className="text-xs font-medium text-gray-500">Scénario:</span>
      <div className="flex gap-1">
        {state.scenarios.map(s => (
          <div key={s.id} className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs cursor-pointer ${state.activeScenario===s.id ? 'bg-blue-100 text-blue-700 font-medium' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            <span onClick={() => dispatch({type:'SWITCH_SCENARIO', payload:s.id})}>{s.name}</span>
            {s.id !== 'base' && state.activeScenario === s.id && (
              <button onClick={() => dispatch({type:'DELETE_SCENARIO', payload:s.id})} className="ml-1 text-red-400 hover:text-red-600"><Trash2 size={10}/></button>
            )}
          </div>
        ))}
      </div>
      {showNew ? (
        <div className="flex items-center gap-1">
          <input className="border rounded px-2 py-1 text-xs w-32" placeholder="Nom..." value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => {if(e.key==='Enter' && newName) {dispatch({type:'ADD_SCENARIO', payload:newName}); setNewName(''); setShowNew(false);}}}/>
          <button onClick={() => {if(newName){dispatch({type:'ADD_SCENARIO', payload:newName}); setNewName(''); setShowNew(false);}}} className="text-green-600"><Check size={14}/></button>
          <button onClick={() => setShowNew(false)} className="text-gray-400"><X size={14}/></button>
        </div>
      ) : (
        <button className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800" onClick={() => setShowNew(true)}>
          <Plus size={12}/> Nouveau
        </button>
      )}
      {state.scenarios.length > 1 && (
        <div className="ml-auto flex items-center gap-1">
          <ArrowLeftRight size={12} className="text-gray-400"/>
          <select className="text-xs border rounded px-2 py-1" value={state.compareScenario || ''} onChange={e => dispatch({type:'SET_COMPARE', payload: e.target.value || null})}>
            <option value="">Comparer avec...</option>
            {state.scenarios.filter(s => s.id !== state.activeScenario).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// EXPORT BUTTON
// ============================================================================
function ExportButton({state, budget}) {
  const exportCSV = useCallback(() => {
    const yr = state.year;
    const rows = [['Niveau','Business Unit','Unité','Ligne Budgétaire','Année','Total']];
    // Consolidated
    ALL_LINES.forEach(l => rows.push(['Consolidé','','',l, yr, budget.getConsolidatedValue(l, yr)]));
    // BUs
    BU_LIST.forEach(bu => ALL_LINES.forEach(l => rows.push(['BU', bu, '', l, yr, budget.getBUValue(bu, l, yr)])));
    // Units
    ALL_UNITS.forEach(({name, bu}) => ALL_LINES.forEach(l => {
      const v = budget.getUnitValue(name, l, yr);
      if (Math.abs(v) > 0) rows.push(['Unité', bu, name, l, yr, v]);
    }));
    const csv = rows.map(r => r.map(c => typeof c === 'string' && c.includes(',') ? `"${c}"` : c).join(',')).join('\n');
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `budget_ipd_${yr}.csv`; a.click();
    URL.revokeObjectURL(url);
  }, [state.year, budget]);

  return (
    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-gray-200 text-gray-600 hover:bg-gray-50" onClick={exportCSV}>
      <Download size={14}/> Export CSV
    </button>
  );
}
