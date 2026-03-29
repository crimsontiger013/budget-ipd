import { createClient } from '@/lib/supabase/server'

export async function getBudgetLines() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('budget_lines')
    .select('*')
    .order('sort_order')

  if (error) throw error
  return data
}

export async function getBudgetLinesByCategory() {
  const lines = await getBudgetLines()
  return {
    revenues: lines.filter(l => l.category === 'revenue').map(l => l.name),
    opex: lines.filter(l => l.category === 'opex').map(l => l.name),
    capex: lines.filter(l => l.category === 'capex').map(l => l.name),
    all: lines.map(l => l.name),
  }
}

export async function getBudgetEntries(year) {
  const supabase = await createClient()
  const query = `
    id, year, month, amount, source,
    operational_units!inner(id, name, business_unit_id, business_units!inner(id, name)),
    budget_lines!inner(id, name, category)
  `

  const pageSize = 1000
  let allData = []
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from('budget_entries')
      .select(query)
      .eq('year', year)
      .range(from, from + pageSize - 1)

    if (error) throw error
    allData = allData.concat(data)
    if (data.length < pageSize) break
    from += pageSize
  }

  return allData
}

export async function getAllBudgetEntries() {
  const supabase = await createClient()
  const query = `
    id, year, month, amount, source,
    operational_units!inner(id, name, business_unit_id, business_units!inner(id, name)),
    budget_lines!inner(id, name, category)
  `

  // Supabase PostgREST caps at 1000 rows per request — paginate to get all
  const pageSize = 1000
  let allData = []
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from('budget_entries')
      .select(query)
      .range(from, from + pageSize - 1)

    if (error) throw error
    allData = allData.concat(data)
    if (data.length < pageSize) break
    from += pageSize
  }

  console.log(`[budget] getAllBudgetEntries fetched ${allData.length} rows`)
  return allData
}

export async function getHistoricalEntries() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('historical_entries')
    .select(`
      id, year, amount,
      budget_lines!inner(id, name, category)
    `)

  if (error) throw error

  // Build same structure as old HISTORICAL object
  const historical = {}
  data.forEach(entry => {
    if (!historical[entry.year]) historical[entry.year] = {}
    historical[entry.year][entry.budget_lines.name] = entry.amount
  })

  return historical
}

/**
 * Build the full budget data structure via server-side SQL aggregation.
 * Returns objects matching the format the existing component expects:
 * - consolidated[year][line] = { total, monthly: [12] }
 * - unitBudgets[unitName][line][year] = amount
 * - unitMonthly[unitName][line] = [12 months]
 */
export async function buildBudgetData() {
  const supabase = await createClient()

  const [
    { data: consolidated, error: e1 },
    { data: unitBudgets, error: e2 },
    { data: unitMonthly, error: e3 },
    historical,
    budgetLines,
  ] = await Promise.all([
    supabase.rpc('get_consolidated_budget'),
    supabase.rpc('get_unit_budgets'),
    supabase.rpc('get_unit_monthly'),
    getHistoricalEntries(),
    getBudgetLinesByCategory(),
  ])

  if (e1) throw e1
  if (e2) throw e2
  if (e3) throw e3

  return {
    consolidated: consolidated || {},
    unitBudgets: unitBudgets || {},
    unitMonthly: unitMonthly || {},
    historical,
    budgetLines,
  }
}
