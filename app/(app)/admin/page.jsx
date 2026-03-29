import { createClient } from '@/lib/supabase/server'
import AdminPanel from '@/components/admin/admin-panel'

export default async function AdminPage() {
  const supabase = await createClient()

  const [{ data: users }, { data: businessUnits }, { data: permissions }] = await Promise.all([
    supabase.from('profiles').select('*').order('created_at', { ascending: false }),
    supabase.from('business_units').select('*').order('sort_order'),
    supabase.from('user_bu_permissions').select('*'),
  ])

  return (
    <AdminPanel
      users={users || []}
      businessUnits={businessUnits || []}
      permissions={permissions || []}
    />
  )
}
