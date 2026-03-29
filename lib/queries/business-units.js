import { createClient } from '@/lib/supabase/server'

export async function getBusinessUnits() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('business_units')
    .select('*, operational_units(id, name, sort_order)')
    .order('sort_order')

  if (error) throw error

  // Sort operational units within each BU
  data.forEach(bu => {
    bu.operational_units.sort((a, b) => a.sort_order - b.sort_order)
  })

  return data
}

export async function getBUStructure() {
  const bus = await getBusinessUnits()

  // Build the same structure as the old BU_STRUCTURE object
  const structure = {}
  const buColors = {}
  const buList = []

  bus.forEach(bu => {
    structure[bu.name] = bu.operational_units.map(u => u.name)
    buColors[bu.name] = bu.color
    buList.push(bu.name)
  })

  // Build unit -> BU lookup
  const allUnits = bus.flatMap(bu =>
    bu.operational_units.map(u => ({ name: u.name, bu: bu.name, id: u.id }))
  )

  return { structure, buColors, buList, allUnits, raw: bus }
}
