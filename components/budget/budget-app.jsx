'use client'

import React, { useState, useMemo, useCallback, useReducer, useRef } from 'react';
import {
  ChevronDown, ChevronRight, Download, Upload, BarChart3, Search, X,
  Printer, RotateCcw, Plus, Copy, Trash2, ArrowLeftRight, Check, AlertTriangle,
  LogOut, Shield, Settings, FileDown
} from 'lucide-react';
import {
  BarChart, Bar, PieChart as RechartsPie, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, LineChart, Line, ResponsiveContainer, Area, AreaChart
} from 'recharts';
import { useUser } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase/client';
import { fmt, pct, MONTHS, LINE_COLORS } from '@/lib/budget-utils';
import { updateBudgetEntry, resetBudgetEntry } from '@/app/(app)/actions/budget';

const BUDGET_YEARS = ["2026", "2027", "2028"];
const yearColClass = (y, activeYear) =>
  y === activeYear ? "font-semibold text-gray-900" : "font-normal text-gray-400";
const yearHeaderClass = (y, activeYear) =>
  y === activeYear ? "font-bold text-gray-800 bg-blue-50/60" : "font-medium text-gray-400";
const activeColBg = { backgroundColor: 'rgba(59,130,246,0.04)' };

// ============================================================================
// REDUCER
// ============================================================================
function createInitialState(scenarios) {
  const baseScenario = scenarios?.find(s => s.is_base) || scenarios?.[0];
  return {
    year: "2026",
    view: "consolidated",
    selectedBU: null,
    selectedUnit: null,
    expandedBUs: {},
    search: "",
    inMillions: false,
    showMonthly: false,
    overrides: baseScenario?.overrides || {},
    scenarios: scenarios?.length > 0
      ? scenarios.map(s => ({ id: s.id, name: s.name, overrides: s.overrides || {} }))
      : [{ id: "base", name: "Budget de base", overrides: {} }],
    activeScenario: baseScenario?.id || "base",
    compareScenario: null,
  };
}

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
      const newActive = state.activeScenario === action.payload ? filtered[0]?.id || 'base' : state.activeScenario;
      const baseSc = filtered.find(s => s.id === newActive);
      return {...state, scenarios: filtered, activeScenario: newActive, overrides: baseSc ? JSON.parse(JSON.stringify(baseSc.overrides)) : {}, compareScenario: state.compareScenario === action.payload ? null : state.compareScenario};
    }
    default: return state;
  }
}

// ============================================================================
// HOOKS
// ============================================================================
function useComputedBudget(state, unitBudgets, unitMonthly) {
  // Pre-merge overrides into unitBudgets once (avoids per-cell conditional)
  const effectiveBudgets = useMemo(() => {
    if (!Object.keys(state.overrides).length) return unitBudgets;
    const merged = { ...unitBudgets };
    for (const [unit, lines] of Object.entries(state.overrides)) {
      merged[unit] = { ...merged[unit] };
      for (const [line, years] of Object.entries(lines)) {
        merged[unit][line] = { ...merged[unit]?.[line], ...years };
      }
    }
    return merged;
  }, [state.overrides, unitBudgets]);

  return useMemo(() => {
    const getUnitValue = (unit, line, year) => effectiveBudgets[unit]?.[line]?.[year] || 0;
    const getUnitMonthly = (unit, line) => unitMonthly[unit]?.[line] || Array(12).fill(0);
    const getBUValue = (bu, line, year, buStructure) => {
      return (buStructure[bu] || []).reduce((s, u) => s + getUnitValue(u, line, year), 0);
    };
    const getBUMonthly = (bu, line, buStructure) => {
      const result = Array(12).fill(0);
      (buStructure[bu] || []).forEach(u => {
        const m = getUnitMonthly(u, line);
        m.forEach((v, i) => result[i] += v);
      });
      return result;
    };
    const getConsolidatedValue = (line, year, buList, buStructure) => {
      return buList.reduce((s, bu) => s + getBUValue(bu, line, year, buStructure), 0);
    };
    const isOverridden = (unit, line, year) => state.overrides[unit]?.[line]?.[year] !== undefined;
    return { getUnitValue, getUnitMonthly, getBUValue, getBUMonthly, getConsolidatedValue, isOverridden };
  }, [effectiveBudgets, unitMonthly, state.overrides]);
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function BudgetApp({
  consolidated, unitBudgets, unitMonthly, historical,
  budgetLines, buStructure, buColors, buList, allUnits, scenarios: initialScenarios
}) {
  const [state, dispatch] = useReducer(reducer, initialScenarios, createInitialState);
  const budget = useComputedBudget(state, unitBudgets, unitMonthly);
  const M = state.inMillions;
  const { profile, isAdmin } = useUser();
  const ALL_LINES = [...budgetLines.revenues, ...budgetLines.opex, ...budgetLines.capex];

  const consolidatedTotals = useMemo(() => {
    const rev = budgetLines.revenues.reduce((s, l) => s + budget.getConsolidatedValue(l, state.year, buList, buStructure), 0);
    const opex = budgetLines.opex.reduce((s, l) => s + budget.getConsolidatedValue(l, state.year, buList, buStructure), 0);
    const capex = budgetLines.capex.reduce((s, l) => s + budget.getConsolidatedValue(l, state.year, buList, buStructure), 0);
    return { rev, opex, capex, net: rev - opex };
  }, [state.year, budget, budgetLines, buList, buStructure]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <div style={{fontFamily:'"DM Sans", sans-serif'}} className="flex h-screen bg-gray-50">
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet"/>
      {/* SIDEBAR */}
      <aside className="w-72 flex-shrink-0 flex flex-col overflow-hidden" style={{background:"linear-gradient(180deg, #0A1628 0%, #132038 100%)", minWidth:'18rem', maxWidth:'18rem'}}>
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <img src="/logo-institut-pasteur.png" alt="Institut Pasteur de Dakar" className="rounded-lg object-contain bg-white p-1" style={{width:48, height:48, minWidth:48, minHeight:48}}/>
            <div className="min-w-0">
              <h1 className="text-xl font-bold truncate" style={{fontFamily:'"Playfair Display", serif', color:"#C5A55A"}}>Institut Pasteur de Dakar</h1>
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
          {isAdmin && (
            <a href="/admin" className="flex items-center px-3 py-2 rounded-lg text-sm mb-0.5 hover:bg-white/5" style={{color:'#CBD5E1', marginBottom:12}}>
              <Shield size={15} className="mr-2"/> Administration
            </a>
          )}
          <div className="text-xs font-semibold uppercase tracking-wider px-3 py-2" style={{color:"#6B7A8D"}}>Business Units</div>
          {buList.filter(bu => !state.search || bu.toLowerCase().includes(state.search.toLowerCase()) || buStructure[bu].some(u => u.toLowerCase().includes(state.search.toLowerCase()))).map(bu => (
            <div key={bu}>
              <div className={`flex items-center px-3 py-2 rounded-lg cursor-pointer text-sm mb-0.5 ${state.view==='bu' && state.selectedBU===bu ? 'bg-white/10' : 'hover:bg-white/5'}`} style={{color: state.view==='bu' && state.selectedBU===bu ? '#C5A55A' : '#CBD5E1'}}>
                <span className="mr-2 cursor-pointer" onClick={() => dispatch({type:'TOGGLE_BU', payload:bu})}>{state.expandedBUs[bu] ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}</span>
                <span className="truncate flex-1" onClick={() => dispatch({type:'SELECT_BU', payload:bu})}>{bu}</span>
                <span className="text-xs ml-1" style={{color:"#6B7A8D"}}>{buStructure[bu].length}</span>
              </div>
              {state.expandedBUs[bu] && buStructure[bu].filter(u => !state.search || u.toLowerCase().includes(state.search.toLowerCase())).map(unit => (
                <div key={unit} className={`pl-9 pr-3 py-1.5 rounded-lg cursor-pointer text-xs mb-0.5 truncate ${state.view==='unit' && state.selectedUnit===unit ? 'bg-white/10' : 'hover:bg-white/5'}`}
                  style={{color: state.view==='unit' && state.selectedUnit===unit ? '#C5A55A' : '#8899AA'}}
                  onClick={() => dispatch({type:'SELECT_UNIT', payload:unit, bu})}>
                  {unit}
                </div>
              ))}
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-2 px-2 py-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{profile?.full_name}</p>
              <p className="text-xs truncate" style={{color:'#6B7A8D'}}>{profile?.role === 'admin' ? 'Administrateur' : profile?.role === 'editor' ? 'Éditeur' : 'Lecteur'}</p>
            </div>
            <button onClick={handleLogout} className="text-gray-400 hover:text-white p-1" title="Déconnexion">
              <LogOut size={16}/>
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* TOP BAR */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="cursor-pointer hover:text-gray-900" onClick={() => dispatch({type:'SET_VIEW', payload:'consolidated'})}>Consolidé</span>
            {state.selectedBU && state.view !== 'consolidated' && state.view !== 'dashboard' && (<><span>/</span><span className="cursor-pointer hover:text-gray-900" onClick={() => dispatch({type:'SELECT_BU', payload:state.selectedBU})}>{state.selectedBU}</span></>)}
            {state.selectedUnit && state.view === 'unit' && (<><span>/</span><span className="font-medium text-gray-900">{state.selectedUnit}</span></>)}
            {state.view === 'dashboard' && <span className="font-medium text-gray-900">/ Tableau de Bord</span>}
          </div>
          <div className="flex items-center gap-3">
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
            <ExportButtons state={state} budget={budget} budgetLines={budgetLines} buList={buList} buStructure={buStructure} allUnits={allUnits} ALL_LINES={ALL_LINES} consolidated={consolidated} historical={historical} unitBudgets={unitBudgets}/>
          </div>
        </header>

        {/* CONTENT */}
        <main className="flex-1 overflow-auto p-6">
          {state.view !== 'dashboard' && (
            <div className="grid grid-cols-4 gap-4 mb-6">
              <SummaryCard label="Revenus" value={fmt(consolidatedTotals.rev, M)} color="#059669" sub={`Budget ${state.year}`}/>
              <SummaryCard label="OPEX" value={fmt(consolidatedTotals.opex, M)} color="#dc2626" sub="Charges d'exploitation"/>
              <SummaryCard label="CAPEX" value={fmt(consolidatedTotals.capex, M)} color="#d97706" sub="Investissements"/>
              <SummaryCard label="Résultat Net" value={fmt(consolidatedTotals.net, M)} color={consolidatedTotals.net >= 0 ? "#059669" : "#dc2626"} sub={consolidatedTotals.net < 0 ? "Déficit" : "Excédent"} highlight/>
            </div>
          )}

          {state.view === 'consolidated' && <ConsolidatedView state={state} dispatch={dispatch} budget={budget} M={M} budgetLines={budgetLines} buList={buList} buStructure={buStructure} historical={historical} consolidated={consolidated} ALL_LINES={ALL_LINES}/>}
          {state.view === 'bu' && <BUView state={state} dispatch={dispatch} budget={budget} M={M} budgetLines={budgetLines} buList={buList} buStructure={buStructure} ALL_LINES={ALL_LINES}/>}
          {state.view === 'unit' && <UnitView state={state} dispatch={dispatch} budget={budget} M={M} unitBudgets={unitBudgets} budgetLines={budgetLines} ALL_LINES={ALL_LINES}/>}
          {state.view === 'dashboard' && <DashboardView state={state} budget={budget} M={M} budgetLines={budgetLines} buList={buList} buStructure={buStructure} allUnits={allUnits} historical={historical} consolidated={consolidated} ALL_LINES={ALL_LINES}/>}
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
      <p className="num text-2xl font-bold mt-1" style={{color}}>{value}</p>
      <p className="text-xs text-gray-400 mt-1">{sub}</p>
    </div>
  );
}

// ============================================================================
// CONSOLIDATED VIEW
// ============================================================================
function ConsolidatedView({state, dispatch, budget, M, budgetLines, buList, buStructure, historical, consolidated, ALL_LINES}) {
  const yr = state.year;
  const prevYr = yr === "2026" ? null : String(Number(yr) - 1);
  const renderSection = (title, lines, type) => (
    <div className="mb-4">
      <div className="flex items-center py-2 px-4 rounded-t-lg" style={{background: type==='revenues' ? '#ecfdf5' : type==='opex' ? '#fef2f2' : '#fffbeb'}}>
        <span className="font-semibold text-sm" style={{color: type==='revenues' ? '#065f46' : type==='opex' ? '#991b1b' : '#92400e'}}>{title}</span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-2 px-4 text-xs font-medium text-gray-500 w-60">Ligne budgétaire</th>
            {BUDGET_YEARS.map(y => (
              <th key={y} className={`text-right py-2 px-3 text-xs ${yearHeaderClass(y, yr)}`} style={y === yr ? activeColBg : undefined}>{y}</th>
            ))}
            <th className="text-right py-2 px-3 text-xs font-medium text-gray-400">{yr === "2026" ? "2025 Est." : String(Number(yr)-1)}</th>
            <th className="text-right py-2 px-3 text-xs font-medium text-gray-400">2024</th>
            <th className="text-right py-2 px-3 text-xs font-medium text-gray-400">2023</th>
            <th className="text-right py-2 px-3 text-xs font-medium text-gray-400">Var %</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, i) => {
            const val = budget.getConsolidatedValue(line, yr, buList, buStructure);
            const prev = prevYr ? budget.getConsolidatedValue(line, prevYr, buList, buStructure) : (historical["2025_est"]?.[line] || 0);
            const h24 = historical["2024"]?.[line] || 0;
            const h23 = historical["2023"]?.[line] || 0;
            const variation = prev ? (val - prev) / Math.abs(prev) : null;
            return (
              <tr key={line} className={i % 2 === 0 ? 'bg-gray-50/50' : 'bg-white'}>
                <td className="py-2 px-4 text-gray-700 w-60 truncate">{line}</td>
                {BUDGET_YEARS.map(y => {
                  const v = budget.getConsolidatedValue(line, y, buList, buStructure);
                  return (
                    <td key={y} className={`num py-2 px-3 text-right ${yearColClass(y, yr)}`} style={y === yr ? {...activeColBg, ...(v < 0 ? {color:'#dc2626'} : {})} : (v < 0 ? {color:'#dc2626'} : undefined)}>
                      {fmt(v, M)}
                    </td>
                  );
                })}
                <td className="num py-2 px-3 text-right text-gray-400 text-xs">{fmt(prev, M)}</td>
                <td className="num py-2 px-3 text-right text-gray-400 text-xs">{fmt(h24, M)}</td>
                <td className="num py-2 px-3 text-right text-gray-400 text-xs">{fmt(h23, M)}</td>
                <td className="num py-2 px-3 text-right text-xs" style={{color: variation > 0 ? '#dc2626' : variation < 0 ? '#059669' : '#6b7280'}}>{pct(variation)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-gray-100 border-t">
            <td className="py-2 px-4 font-bold text-sm text-gray-700">TOTAL {title.toUpperCase()}</td>
            {BUDGET_YEARS.map(y => {
              const total = lines.reduce((s, l) => s + budget.getConsolidatedValue(l, y, buList, buStructure), 0);
              return (
                <td key={y} className={`num py-2 px-3 text-right font-bold text-sm ${yearColClass(y, yr)}`} style={{color: type==='revenues' ? '#059669' : '#dc2626', ...(y === yr ? activeColBg : {})}}>
                  {fmt(total, M)}
                </td>
              );
            })}
            <td colSpan={4}></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );

  const chartData = ["2023","2024","2025_est","2026","2027","2028"].map(y => {
    const src = ["2023","2024","2025_est"].includes(y) ? historical[y] || {} : null;
    const rev = src ? budgetLines.revenues.reduce((s,l) => s + (src[l]||0), 0) : budgetLines.revenues.reduce((s,l) => s + budget.getConsolidatedValue(l, y, buList, buStructure), 0);
    const opex = src ? budgetLines.opex.reduce((s,l) => s + (src[l]||0), 0) : budgetLines.opex.reduce((s,l) => s + budget.getConsolidatedValue(l, y, buList, buStructure), 0);
    const capex = src ? (src["Bâtiments, Matériels & Equipements"]||0) : budget.getConsolidatedValue("Bâtiments, Matériels & Equipements", y, buList, buStructure);
    return {year: y.replace('_est',' (est.)'), Revenus: Math.round(rev/1e6), OPEX: Math.round(opex/1e6), CAPEX: Math.round(capex/1e6), Net: Math.round((rev-opex)/1e6)};
  });

  return (
    <div>
      <ScenarioBar state={state} dispatch={dispatch}/>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900" style={{fontFamily:'"Playfair Display", serif'}}>Budget Consolidé {yr}</h2>
            <p className="text-xs text-gray-400 mt-0.5">Budget Interne uniquement (hors Grants) — Montants en FCFA</p>
          </div>
          <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded font-medium">Année active : {yr}</span>
        </div>
        <div className="p-4">
          {renderSection("Produits / Revenus", budgetLines.revenues, 'revenues')}
          {renderSection("Charges d'exploitation (OPEX)", budgetLines.opex, 'opex')}
          {renderSection("Investissements (CAPEX)", budgetLines.capex, 'capex')}
        </div>
      </div>

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
                    const monthly = consolidated["2026"]?.[line]?.monthly || Array(12).fill(0);
                    return (
                      <tr key={line} className={i % 2 === 0 ? 'bg-gray-50/50' : ''}>
                        <td className="py-1.5 px-2 text-gray-700 truncate">{line}</td>
                        {monthly.map((v, mi) => <td key={mi} className="num py-1.5 px-2 text-right text-gray-600">{fmt(v, M)}</td>)}
                        <td className="num py-1.5 px-2 text-right font-bold">{fmt(monthly.reduce((a,b)=>a+b,0), M)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

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
function BUView({state, dispatch, budget, M, budgetLines, buList, buStructure, ALL_LINES}) {
  const bu = state.selectedBU;
  if (!bu) return null;
  const yr = state.year;
  const units = buStructure[bu] || [];

  const unitData = units.map(u => {
    const total = ALL_LINES.reduce((s, l) => s + Math.abs(budget.getUnitValue(u, l, yr)), 0);
    return {name: u, total};
  }).sort((a,b) => b.total - a.total);

  const pieData = unitData.filter(d => d.total > 0).map((d, i) => ({...d, fill: LINE_COLORS[i % LINE_COLORS.length]}));

  return (
    <div>
      <ScenarioBar state={state} dispatch={dispatch}/>
      <div className="grid grid-cols-3 gap-6 mb-6">
        <div className="col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900" style={{fontFamily:'"Playfair Display", serif'}}>{bu}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{units.length} unités — Budget {yr}</p>
          </div>
          <div className="p-4">
            {[
              { title: "Produits / Revenus", lines: budgetLines.revenues, type: 'revenues' },
              { title: "Charges d'exploitation (OPEX)", lines: budgetLines.opex, type: 'opex' },
              { title: "Investissements (CAPEX)", lines: budgetLines.capex, type: 'capex' },
            ].map(({ title, lines, type }) => (
              <div key={type} className="mb-4">
                <div className="flex items-center py-2 px-4 rounded-t-lg" style={{background: type==='revenues' ? '#ecfdf5' : type==='opex' ? '#fef2f2' : '#fffbeb'}}>
                  <span className="font-semibold text-sm" style={{color: type==='revenues' ? '#065f46' : type==='opex' ? '#991b1b' : '#92400e'}}>{title}</span>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-4 text-xs font-medium text-gray-500 w-60">Ligne budgétaire</th>
                      {BUDGET_YEARS.map(y => (
                        <th key={y} className={`text-right py-2 px-3 text-xs ${yearHeaderClass(y, yr)}`} style={y === yr ? activeColBg : undefined}>{y}</th>
                      ))}
                      <th className="text-right py-2 px-3 text-xs font-medium text-gray-400">% Consol.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, i) => {
                      const val = budget.getBUValue(bu, line, yr, buStructure);
                      const consolVal = budget.getConsolidatedValue(line, yr, buList, buStructure);
                      const pctVal = consolVal ? val / consolVal : 0;
                      const hasAnyValue = BUDGET_YEARS.some(y => Math.abs(budget.getBUValue(bu, line, y, buStructure)) >= 1);
                      if (!hasAnyValue && Math.abs(consolVal) < 1) return null;
                      return (
                        <tr key={line} className={i % 2 === 0 ? 'bg-gray-50/50' : 'bg-white'}>
                          <td className="py-2 px-4 text-gray-700 w-60 truncate">{line}</td>
                          {BUDGET_YEARS.map(y => {
                            const v = budget.getBUValue(bu, line, y, buStructure);
                            return (
                              <td key={y} className={`num py-2 px-3 text-right ${yearColClass(y, yr)}`} style={y === yr ? {...activeColBg, ...(v < 0 ? {color:'#dc2626'} : {})} : (v < 0 ? {color:'#dc2626'} : undefined)}>
                                {fmt(v, M)}
                              </td>
                            );
                          })}
                          <td className="num py-2 px-3 text-right text-xs text-gray-500">{(pctVal*100).toFixed(1)}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-100 border-t">
                      <td className="py-2 px-4 font-bold text-sm text-gray-700">TOTAL {title.toUpperCase()}</td>
                      {BUDGET_YEARS.map(y => {
                        const total = lines.reduce((s, l) => s + budget.getBUValue(bu, l, y, buStructure), 0);
                        return (
                          <td key={y} className={`num py-2 px-3 text-right font-bold text-sm ${yearColClass(y, yr)}`} style={{color: type==='revenues' ? '#059669' : '#dc2626', ...(y === yr ? activeColBg : {})}}>
                            {fmt(total, M)}
                          </td>
                        );
                      })}
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ))}
          </div>
        </div>

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
                  <span className="num text-gray-400 ml-2">{fmt(d.total, M)}</span>
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
function UnitView({state, dispatch, budget, M, unitBudgets, budgetLines, ALL_LINES}) {
  const unit = state.selectedUnit;
  const bu = state.selectedBU;
  if (!unit) return null;
  const yr = state.year;
  const [editLine, setEditLine] = useState(null);
  const [editVal, setEditVal] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);
  const { canEditBU } = useUser();
  const canEdit = canEditBU(bu);

  const startEdit = (line, val) => {
    if (!canEdit || saving) return;
    setEditLine(line);
    setEditVal(String(Math.round(val)));
    setTimeout(() => inputRef.current?.focus(), 50);
  };
  const saveEdit = async (line) => {
    const num = parseInt(editVal.replace(/\s/g, ''), 10);
    if (isNaN(num)) { setEditLine(null); return; }
    dispatch({type:'SET_OVERRIDE', payload:{unit, line, year:yr, value:num}});
    setEditLine(null);
    setSaving(true);
    try {
      await updateBudgetEntry(unit, line, parseInt(yr), num);
    } catch (e) {
      console.error('Erreur sauvegarde:', e);
    } finally {
      setSaving(false);
    }
  };
  const cancelEdit = () => setEditLine(null);
  const handleReset = async (line) => {
    const allocated = unitBudgets[unit]?.[line]?.[yr] || 0;
    dispatch({type:'RESET_OVERRIDE', payload:{unit, line, year:yr}});
    try {
      await resetBudgetEntry(unit, line, parseInt(yr), allocated);
    } catch (e) {
      console.error('Erreur réinitialisation:', e);
    }
  };
  const handleResetAll = async () => {
    ALL_LINES.forEach(l => dispatch({type:'RESET_OVERRIDE', payload:{unit, line:l, year:yr}}));
    for (const l of ALL_LINES) {
      if (state.overrides[unit]?.[l]?.[yr] !== undefined) {
        const allocated = unitBudgets[unit]?.[l]?.[yr] || 0;
        try { await resetBudgetEntry(unit, l, parseInt(yr), allocated); } catch (e) { console.error(e); }
      }
    }
  };

  const sections = [
    { title: "Produits / Revenus", lines: budgetLines.revenues, type: 'revenues' },
    { title: "Charges d'exploitation (OPEX)", lines: budgetLines.opex, type: 'opex' },
    { title: "Investissements (CAPEX)", lines: budgetLines.capex, type: 'capex' },
  ];

  return (
    <div>
      <ScenarioBar state={state} dispatch={dispatch}/>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900" style={{fontFamily:'"Playfair Display", serif'}}>{unit}</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {bu} — Budget {yr}
              {canEdit ? ' — Cliquer sur un montant pour modifier' : ' — Lecture seule'}
            </p>
          </div>
          {canEdit && Object.keys(state.overrides[unit] || {}).length > 0 && (
            <button className="text-xs px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1"
              onClick={handleResetAll}>
              <RotateCcw size={12}/> Réinitialiser tout
            </button>
          )}
        </div>
        <div className="p-4">
          {sections.map(({ title, lines, type }) => (
            <div key={type} className="mb-4">
              <div className="flex items-center py-2 px-4 rounded-t-lg" style={{background: type==='revenues' ? '#ecfdf5' : type==='opex' ? '#fef2f2' : '#fffbeb'}}>
                <span className="font-semibold text-sm" style={{color: type==='revenues' ? '#065f46' : type==='opex' ? '#991b1b' : '#92400e'}}>{title}</span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-4 text-xs font-medium text-gray-500 w-56">Ligne budgétaire</th>
                    {BUDGET_YEARS.map(y => (
                      <th key={y} className={`text-right py-2 px-3 text-xs ${yearHeaderClass(y, yr)}`} style={y === yr ? activeColBg : undefined}>{y}</th>
                    ))}
                    <th className="text-right py-2 px-3 text-xs font-medium text-gray-400">Alloué</th>
                    <th className="text-center py-2 px-3 text-xs font-medium text-gray-400">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, i) => {
                    const val = budget.getUnitValue(unit, line, yr);
                    const allocated = unitBudgets[unit]?.[line]?.[yr] || 0;
                    const isOvr = budget.isOverridden(unit, line, yr);
                    const hasAnyValue = BUDGET_YEARS.some(y => Math.abs(budget.getUnitValue(unit, line, y)) >= 1 || Math.abs(unitBudgets[unit]?.[line]?.[y] || 0) >= 1);
                    if (!hasAnyValue) return null;
                    return (
                      <tr key={line} className={`${i % 2 === 0 ? 'bg-gray-50/50' : 'bg-white'} ${canEdit ? 'hover:bg-blue-50/30' : ''}`}>
                        <td className="py-2 px-4 text-gray-700 w-56 truncate">{line}</td>
                        {BUDGET_YEARS.map(y => {
                          const v = budget.getUnitValue(unit, line, y);
                          const isActive = y === yr;
                          const isOvrY = budget.isOverridden(unit, line, y);
                          if (isActive && editLine === line) {
                            return (
                              <td key={y} className="py-2 px-3 text-right" style={activeColBg}>
                                <div className="flex items-center justify-end gap-1">
                                  <input ref={inputRef} className="w-28 text-right border rounded px-2 py-1 text-sm" value={editVal}
                                    onChange={e => setEditVal(e.target.value)}
                                    onKeyDown={e => { if(e.key==='Enter') saveEdit(line); if(e.key==='Escape') cancelEdit(); }}/>
                                  <button onClick={() => saveEdit(line)} className="text-green-600"><Check size={14}/></button>
                                  <button onClick={cancelEdit} className="text-gray-400"><X size={14}/></button>
                                </div>
                              </td>
                            );
                          }
                          return (
                            <td key={y} className={`num py-2 px-3 text-right ${yearColClass(y, yr)} ${isActive && canEdit ? 'cursor-pointer hover:underline' : ''}`}
                              style={isActive ? activeColBg : undefined}
                              onClick={isActive ? () => startEdit(line, v) : undefined}>
                              <span className={isOvrY && isActive ? 'text-blue-600 font-medium' : v < 0 ? 'text-red-600' : ''}>
                                {fmt(v, M)}{isActive && saving && ' ...'}
                              </span>
                            </td>
                          );
                        })}
                        <td className="num py-2 px-3 text-right text-xs text-gray-400">{fmt(allocated, M)}</td>
                        <td className="py-2 px-3 text-center">
                          {isOvr ? (
                            <span className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                              Modifié {canEdit && <button onClick={() => handleReset(line)}><RotateCcw size={10}/></button>}
                            </span>
                          ) : allocated > 0 ? (
                            <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Alloué</span>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100 border-t">
                    <td className="py-2 px-4 font-bold text-sm text-gray-700">TOTAL {title.toUpperCase()}</td>
                    {BUDGET_YEARS.map(y => {
                      const total = lines.reduce((s, l) => s + budget.getUnitValue(unit, l, y), 0);
                      return (
                        <td key={y} className={`num py-2 px-3 text-right font-bold text-sm ${yearColClass(y, yr)}`} style={{color: type==='revenues' ? '#059669' : '#dc2626', ...(y === yr ? activeColBg : {})}}>
                          {fmt(total, M)}
                        </td>
                      );
                    })}
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// DASHBOARD VIEW
// ============================================================================
function DashboardView({state, budget, M, budgetLines, buList, buStructure, allUnits, historical, consolidated, ALL_LINES}) {
  const yr = state.year;

  const revByBU = buList.map(bu => ({
    name: bu.replace('R&D (Research & Innovation)','R&D').replace('Product Development & Innovation','PDI').replace('Clinical Laboratory Services','Clinical Lab').replace('Institutional Functions','Inst. Functions').replace('Education & Training','Education'),
    value: budgetLines.revenues.reduce((s, l) => s + budget.getBUValue(bu, l, yr, buStructure), 0)
  })).filter(d => d.value > 0).sort((a,b) => b.value - a.value);

  const opexByLine = budgetLines.opex.map((l, i) => ({
    name: l, value: Math.abs(budget.getConsolidatedValue(l, yr, buList, buStructure)), fill: LINE_COLORS[i]
  })).filter(d => d.value > 0).sort((a,b) => b.value - a.value);

  const topUnits = allUnits.map(({name, bu}) => ({
    name: name.length > 25 ? name.substring(0,22)+'...' : name,
    value: budgetLines.opex.reduce((s, l) => s + budget.getUnitValue(name, l, yr), 0),
    bu
  })).sort((a,b) => b.value - a.value).slice(0, 10);

  const deficitData = ["2023","2024","2026","2027","2028"].map(y => {
    const src = ["2023","2024"].includes(y) ? historical[y] : null;
    const rev = src ? budgetLines.revenues.reduce((s,l) => s+(src[l]||0), 0) : budgetLines.revenues.reduce((s,l) => s+budget.getConsolidatedValue(l,y,buList,buStructure), 0);
    const opex = src ? budgetLines.opex.reduce((s,l) => s+(src[l]||0), 0) : budgetLines.opex.reduce((s,l) => s+budget.getConsolidatedValue(l,y,buList,buStructure), 0);
    return {year: y, Résultat: Math.round((rev-opex)/1e6)};
  });

  const validation = ALL_LINES.map(line => {
    const consolOriginal = consolidated[yr]?.[line]?.total || 0;
    const sumBU = buList.reduce((s, bu) => s + budget.getBUValue(bu, line, yr, buStructure), 0);
    const delta = Math.abs(consolOriginal - sumBU);
    return {line, consolOriginal, sumBU, delta, pass: delta < 100};
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
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
                <td className="num py-1.5 px-4 text-right">{fmt(v.consolOriginal, M)}</td>
                <td className="num py-1.5 px-4 text-right">{fmt(v.sumBU, M)}</td>
                <td className="num py-1.5 px-4 text-right" style={{color: v.delta > 100 ? '#dc2626' : '#059669'}}>{fmt(v.delta)}</td>
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
            {!s.is_base && state.activeScenario === s.id && (
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
// EXPORT BUTTONS
// ============================================================================
function ExportButtons({state, budget, budgetLines, buList, buStructure, allUnits, ALL_LINES, consolidated, historical, unitBudgets}) {
  const exportCSV = useCallback(() => {
    const yr = state.year;
    const rows = [['Niveau','Business Unit','Unité','Ligne Budgétaire','Année','Total']];
    ALL_LINES.forEach(l => rows.push(['Consolidé','','',l, yr, budget.getConsolidatedValue(l, yr, buList, buStructure)]));
    buList.forEach(bu => ALL_LINES.forEach(l => rows.push(['BU', bu, '', l, yr, budget.getBUValue(bu, l, yr, buStructure)])));
    allUnits.forEach(({name, bu}) => ALL_LINES.forEach(l => {
      const v = budget.getUnitValue(name, l, yr);
      if (Math.abs(v) > 0) rows.push(['Unité', bu, name, l, yr, v]);
    }));
    const csv = rows.map(r => r.map(c => typeof c === 'string' && c.includes(',') ? `"${c}"` : c).join(',')).join('\n');
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `budget_ipd_${yr}.csv`; a.click();
    URL.revokeObjectURL(url);
  }, [state.year, budget, budgetLines, buList, buStructure, allUnits, ALL_LINES]);

  const exportPDF = useCallback(async () => {
    const mod = await import('@/lib/export-pdf');
    const commonData = { year: state.year, budget, budgetLines, buList, buStructure, inMillions: state.inMillions };
    switch (state.view) {
      case 'consolidated': return mod.exportConsolidatedPDF({ ...commonData, historical, consolidated });
      case 'bu': return mod.exportBUViewPDF({ ...commonData, selectedBU: state.selectedBU });
      case 'unit': return mod.exportUnitViewPDF({ ...commonData, selectedUnit: state.selectedUnit, selectedBU: state.selectedBU, unitBudgets });
      case 'dashboard': return mod.exportDashboardPDF({ ...commonData, allUnits, historical, consolidated });
    }
  }, [state, budget, budgetLines, buList, buStructure, allUnits, consolidated, historical, unitBudgets]);

  const exportExcel = useCallback(async () => {
    const mod = await import('@/lib/export-excel');
    const commonData = { year: state.year, budget, budgetLines, buList, buStructure, inMillions: state.inMillions };
    switch (state.view) {
      case 'consolidated': return mod.exportConsolidatedExcel({ ...commonData, historical, consolidated });
      case 'bu': return mod.exportBUViewExcel({ ...commonData, selectedBU: state.selectedBU });
      case 'unit': return mod.exportUnitViewExcel({ ...commonData, selectedUnit: state.selectedUnit, selectedBU: state.selectedBU, unitBudgets });
      case 'dashboard': return mod.exportDashboardExcel({ ...commonData, allUnits, historical, consolidated });
    }
  }, [state, budget, budgetLines, buList, buStructure, allUnits, consolidated, historical, unitBudgets]);

  return (
    <div className="flex items-center gap-1.5">
      <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-gray-200 text-gray-600 hover:bg-gray-50" onClick={exportCSV}>
        <Download size={14}/> CSV
      </button>
      <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-opacity hover:opacity-90" style={{backgroundColor:'#B30B00'}} onClick={exportPDF}>
        <FileDown size={14}/> PDF
      </button>
      <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-opacity hover:opacity-90" style={{backgroundColor:'#217346'}} onClick={exportExcel}>
        <FileDown size={14}/> Excel
      </button>
    </div>
  );
}
