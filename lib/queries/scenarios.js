import { createClient } from '@/lib/supabase/server'

export async function getScenarios() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('scenarios')
    .select('*')
    .order('created_at')

  if (error) throw error
  return data
}

export async function getScenarioOverrides(scenarioId) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('scenario_overrides')
    .select(`
      id, year, amount,
      operational_units!inner(id, name),
      budget_lines!inner(id, name)
    `)
    .eq('scenario_id', scenarioId)

  if (error) throw error

  // Build overrides map: { unitName: { lineName: { year: amount } } }
  const overrides = {}
  data.forEach(o => {
    const unit = o.operational_units.name
    const line = o.budget_lines.name
    if (!overrides[unit]) overrides[unit] = {}
    if (!overrides[unit][line]) overrides[unit][line] = {}
    overrides[unit][line][String(o.year)] = o.amount
  })

  return overrides
}

export async function getScenariosWithOverrides() {
  const supabase = await createClient()

  // Fetch scenarios and ALL overrides in 2 parallel queries (instead of N+1)
  const [scenariosResult, overridesResult] = await Promise.all([
    supabase.from('scenarios').select('*').order('created_at'),
    supabase.from('scenario_overrides').select(`
      id, scenario_id, year, amount,
      operational_units!inner(id, name),
      budget_lines!inner(id, name)
    `),
  ])

  if (scenariosResult.error) throw scenariosResult.error
  if (overridesResult.error) throw overridesResult.error

  // Group overrides by scenario_id
  const overridesByScenario = {}
  overridesResult.data.forEach(o => {
    const sid = o.scenario_id
    if (!overridesByScenario[sid]) overridesByScenario[sid] = {}
    const unit = o.operational_units.name
    const line = o.budget_lines.name
    if (!overridesByScenario[sid][unit]) overridesByScenario[sid][unit] = {}
    if (!overridesByScenario[sid][unit][line]) overridesByScenario[sid][unit][line] = {}
    overridesByScenario[sid][unit][line][String(o.year)] = o.amount
  })

  return scenariosResult.data.map(s => ({
    ...s,
    overrides: overridesByScenario[s.id] || {},
  }))
}
