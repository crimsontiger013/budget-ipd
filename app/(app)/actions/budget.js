'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateBudgetEntry(unitName, lineName, year, amount) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  // Get unit and line IDs
  const { data: unit } = await supabase
    .from('operational_units')
    .select('id, business_unit_id')
    .eq('name', unitName)
    .single()

  const { data: line } = await supabase
    .from('budget_lines')
    .select('id')
    .eq('name', lineName)
    .single()

  if (!unit || !line) throw new Error('Unité ou ligne non trouvée')

  // Upsert the budget entry
  const { error } = await supabase
    .from('budget_entries')
    .upsert({
      operational_unit_id: unit.id,
      budget_line_id: line.id,
      year: parseInt(year),
      month: null,
      amount: Math.round(amount),
      source: 'manual',
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'operational_unit_id,budget_line_id,year,month'
    })

  if (error) throw error
  revalidatePath('/')
}

export async function resetBudgetEntry(unitName, lineName, year, originalAmount) {
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

  if (!unit || !line) throw new Error('Unité ou ligne non trouvée')

  // Reset to computed value
  const { error } = await supabase
    .from('budget_entries')
    .update({
      amount: Math.round(originalAmount),
      source: 'computed',
      updated_at: new Date().toISOString(),
    })
    .eq('operational_unit_id', unit.id)
    .eq('budget_line_id', line.id)
    .eq('year', parseInt(year))
    .is('month', null)

  if (error) throw error
  revalidatePath('/')
}
