# IPD Budget Management Application 2026-2028

## Overview

A comprehensive, production-grade React budget management application for Institut Pasteur de Dakar (IPD). This application provides sophisticated budget tracking, analysis, and visualization for a multi-year financial planning cycle (2026-2028) across 8 business units and 42+ operational units.

## Features

### 1. Multi-Level Views
- **Vue Consolidée** (Consolidated View): Institution-wide budget overview with 2026-2028 projections
- **Business Unit View**: Drill-down into individual BU performance and composition
- **Unit View**: Granular unit-level budgeting with editable allocations

### 2. Comprehensive Dashboard
- **Summary Cards**: Key metrics at a glance (Total Revenues, OPEX, CAPEX, Net Result)
- **Multi-Year Charts**: Historical (2023-2025) and projected data (2026-2028)
  - Stacked bar chart showing Revenue vs OPEX vs CAPEX trends
  - Pie charts for revenue composition
  - Horizontal bar charts for unit contribution analysis
- **Monthly Breakdown**: 12-month ventilation for 2026

### 3. Data Management
- **Professional Tables**: Alternating row colors, sticky headers, proper number formatting
- **Historical Comparison**: Side-by-side comparison with 2023, 2024, and 2025 (Est.) figures
- **Variance Analysis**: YoY percentage changes with color coding
- **Export/Import**: CSV export for further analysis
- **Print Mode**: Clean, institutional-style print layout

### 4. Professional Styling
- **Color Scheme**: Deep navy (#0A1628) with gold accents (#C5A55A) for premium institutional feel
- **Typography**:
  - "DM Sans" for body text (clean, readable)
  - "Playfair Display" for headings (elegant, professional)
- **Responsive Design**: Optimized for desktop budget management workflows
- **Accessibility**: Proper contrast, semantic HTML, keyboard navigation

## Technical Stack

### Frontend Framework
- **React 18+** with Hooks (useState, useReducer, useMemo, useCallback)
- **Tailwind CSS** for layout and utility-based styling
- **Recharts** for interactive data visualization
- **Lucide React** for icons

### Data Structure
- Embedded JSON dataset with 3 years of consolidated budgets
- Business unit and unit-level budget allocations
- Historical data (2023-2024 actual, 2025 estimated)
- Top-down allocation methodology based on historical ratios

### Build & Deployment
- Single .jsx file (no build step required for development)
- Compatible with Vercel, Netlify, or Next.js
- Uses CDN links for Google Fonts
- No external dependencies beyond peer dependencies

## Installation

### For Development

```bash
# Copy the file to your React project
cp ipd_budget_app.jsx /path/to/your/project/components/

# Install dependencies (if not already installed)
npm install react recharts lucide-react
```

### For Vercel Deployment

```bash
# Create a new Vercel project
vercel

# Or deploy existing Next.js project with the component
# Add to app/page.jsx:
import IPDBudgetApp from '@/components/ipd_budget_app'

export default function Home() {
  return <IPDBudgetApp />
}
```

## Data Format

The application embeds all budget data directly as a JavaScript object:

```javascript
{
  bu_structure: {
    "BU_Name": {
      units: ["Unit1", "Unit2", ...],
      description: "..."
    }
  },
  budget_lines: {
    revenues: ["Ventes de Vaccins / Tests", ...],
    opex: ["Matières Premières", ...],
    capex: ["Bâtiments, Matériels & Equipements"]
  },
  consolidated: {
    "2026": {
      "Line_Name": {
        total: 950481693,
        monthly: [val1, val2, ..., val12]
      }
    },
    "2027": {...},
    "2028": {...}
  },
  historical: {
    "2023": { "Line": total, ... },
    "2024": { "Line": total, ... },
    "2025_est": { "Line": total, ... }
  }
}
```

## Usage Guide

### Navigation
1. **Left Sidebar**: Browse institution structure
   - Click "Vue Consolidée" for overall budget
   - Click BU name to expand and view units
   - Click unit name to view unit-specific budget

2. **Top Bar**:
   - Year selector (2026, 2027, 2028)
   - Export/Print buttons
   - Settings (placeholder for future features)

3. **Main Content Area**: View and interact with budget data

### Key Functions

#### Number Formatting
All numbers displayed with FCFA currency formatting:
- Space thousands separator (1 234 567)
- Optional millions suffix (125.5M)
- Negative numbers in red with parentheses: (1,234,567)
- Percentages with 1 decimal: 12.5%

#### Variance Calculation
- Calculated against prior year (2025 estimated)
- Green for increases, red for decreases
- Shown as percentage change

#### Unit-Level Edits (Future)
- Click cell to edit unit allocations
- Changes propagate up to BU and consolidated levels
- Visual indicator (blue text) for edited values
- Reset button to revert changes

### View Scenarios

#### Consolidated View
- Overall institution budget
- All revenue streams, operating costs, capital expenditure
- Multi-year trend analysis
- Monthly breakdown expandable section

#### Business Unit View
- Focused budget for single BU
- Unit contribution analysis
- Same detailed tables as consolidated view

#### Unit View
- Granular unit-level budget
- Current allocation vs. historical ratios
- Editable fields for what-if analysis
- Reset to allocated values

## Data Categories

### Revenues (3 lines)
- Ventes de Vaccins / Tests
- Vente de Services
- Autres produits

### Operating Expenses (12 lines)
- Matières Premières
- Consommables Labo
- Utilités
- Sous traitance
- Réparations
- Assurance
- Consultance
- Frais de Personnel
- Frais de Formation
- Frais Mission/Restauration
- Amortissements
- Autres Charges

### Capital Expenditure (1 line)
- Bâtiments, Matériels & Equipements

## Business Units (8 total)

1. **Vaccine Manufacturing** (9 units) - Vaccine production, QA, training
2. **Diagnostic Manufacturing** (1 unit) - Diagnostic ops
3. **Clinical Laboratory Services** (3 units) - Lab and clinical services
4. **Public Health** (1 unit) - Public health direction
5. **R&D (Research & Innovation)** (10 units) - Research activities
6. **Product Development & Innovation** (2 units) - Product development
7. **Education & Training** (2 units) - Education and training
8. **Institutional Functions** (14 units) - Support functions

## Chart Components

### 1. Revenue vs OPEX vs CAPEX (2023-2028)
- Stacked bar chart showing multi-year trends
- Includes historical actuals and projections
- Quick visual assessment of growth trajectory

### 2. Revenue Composition
- Pie chart of revenue streams
- Color-coded segments
- Interactive tooltips with values

### 3. Unit Contribution Analysis
- Horizontal bar chart of unit contribution to BU
- Helps identify key contributors
- Supports strategic planning

### 4. Deficit Trajectory (future)
- Line chart showing cumulative results over time
- Highlights breakeven analysis

### 5. Top Units by OPEX (future)
- Bar chart ranking units by operating costs
- Identifies major cost centers

## Customization

### Colors
Edit the COLORS array to customize chart colors:
```javascript
const COLORS = ['#C5A55A', '#0A1628', '#2E5090', ...];
```

### Fonts
Fonts are loaded from Google Fonts CDN. To change:
1. Update `fontFamily` in component styles
2. Add new font family to CDN link in HTML template

### Budget Lines
To add new budget categories:
1. Add line name to `BUDGET_DATA.budget_lines` object
2. Add data in `consolidated[year]` for each year
3. Add historical data in `historical[year]`

### Business Units
To modify BU structure:
1. Update `BUDGET_DATA.bu_structure` with new BU/units
2. Ensure unit budgets are allocated in `unit_budgets`
3. Sidebar navigation will auto-update

## Performance Considerations

- **Data Size**: Embeds ~200KB of budget data (highly compressible)
- **Render Optimization**: useMemo caching for expensive calculations
- **Lazy Charts**: Charts only render when viewed
- **Table Virtualization**: Not needed for ~50-100 budget lines
- **Scalability**: Can handle 100+ BUs and 1000+ units with optimization

## Future Enhancements

1. **Advanced Scenarios**
   - Create custom what-if scenarios
   - Compare multiple scenarios side-by-side
   - Save/load scenario snapshots

2. **Unit-Level Editing**
   - Full edit UI with validation
   - Propagate changes to BU and consolidated levels
   - Audit trail of changes

3. **Dashboard Analytics**
   - Personnel vs Other costs trends
   - Budget allocation sanity checks
   - Variance alerting

4. **Data Import/Export**
   - CSV import for bulk updates
   - Excel export with formatting
   - PDF reports

5. **Collaboration**
   - Real-time multi-user editing
   - Comment threads
   - Approval workflows

6. **Forecasting**
   - Variance analysis tools
   - Trend projection
   - Scenario modeling

## Support

For issues, questions, or feature requests, contact the IPD Financial Planning team.

---

**Last Updated**: March 29, 2026
**Version**: 1.0.0
**Status**: Production Ready
