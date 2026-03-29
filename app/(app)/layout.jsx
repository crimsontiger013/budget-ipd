import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { UserProvider } from '@/lib/auth-context'

export default async function AppLayout({ children }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch user profile with permissions
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: permissions } = await supabase
    .from('user_bu_permissions')
    .select('*, business_units(id, name)')
    .eq('user_id', user.id)

  return (
    <UserProvider user={user} profile={profile} permissions={permissions || []}>
      {children}
    </UserProvider>
  )
}
