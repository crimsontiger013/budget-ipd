'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createScenario(name, description = '') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const { data, error } = await supabase
    .from('scenarios')
    .insert({
      name,
      description,
      is_base: false,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) throw error
  revalidatePath('/')
  return data
}

export async function deleteScenario(scenarioId) {
  const supabase = await createClient()

  // Don't allow deleting base scenario
  const { data: scenario } = await supabase
    .from('scenarios')
    .select('is_base')
    .eq('id', scenarioId)
    .single()

  if (scenario?.is_base) throw new Error('Impossible de supprimer le scénario de base')

  const { error } = await supabase
    .from('scenarios')
    .delete()
    .eq('id', scenarioId)

  if (error) throw error
  revalidatePath('/')
}

export async function upsertScenarioOverride(scenarioId, unitName, lineName, year, amount) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const { data: unit } = await supabase
    .from('operational_units')
    .select('id')
    .eq('name', unitName)
    .single()

  const { data: line } = await supabase
    .from('budget_lines')
    .select('id')
    .eq('name', lineName)
    .single()

  if (!unit || !line) throw new Error('Unité ou ligne non trouvée')

  const { error } = await supabase
    .from('scenario_overrides')
    .upsert({
      scenario_id: scenarioId,
      operational_unit_id: unit.id,
      budget_line_id: line.id,
      year: parseInt(year),
      amount: Math.round(amount),
      created_by: user.id,
    }, {
      onConflict: 'scenario_id,operational_unit_id,budget_line_id,year'
    })

  if (error) throw error
  revalidatePath('/')
}

export async function deleteScenarioOverride(scenarioId, unitName, lineName, year) {
  const supabase = await createClient()

  const { data: unit } = await supabase
    .from('operational_units')
    .select('id')
    .eq('name', unitName)
    .single()

  const { data: line } = await supabase
    .from('budget_lines')
    .select('id')
    .eq('name', lineName)
    .single()

  if (!unit || !line) return

  const { error } = await supabase
    .from('scenario_overrides')
    .delete()
    .eq('scenario_id', scenarioId)
    .eq('operational_unit_id', unit.id)
    .eq('budget_line_id', line.id)
    .eq('year', parseInt(year))

  if (error) throw error
  revalidatePath('/')
}
