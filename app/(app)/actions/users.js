'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') throw new Error('Accès refusé — admin requis')
  return user
}

export async function createUser(email, password, fullName, role = 'viewer') {
  await requireAdmin()
  const admin = createAdminClient()

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  })

  if (error) throw error

  // Update the auto-created profile with the correct role
  const { error: profileError } = await admin
    .from('profiles')
    .update({ role, full_name: fullName })
    .eq('id', data.user.id)

  if (profileError) throw profileError

  revalidatePath('/admin')
  return data.user
}

export async function updateUser(userId, updates) {
  await requireAdmin()
  const admin = createAdminClient()

  const { error } = await admin
    .from('profiles')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)

  if (error) throw error
  revalidatePath('/admin')
}

export async function deactivateUser(userId) {
  await requireAdmin()
  const admin = createAdminClient()

  const { error } = await admin
    .from('profiles')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', userId)

  if (error) throw error
  revalidatePath('/admin')
}

export async function activateUser(userId) {
  await requireAdmin()
  const admin = createAdminClient()

  const { error } = await admin
    .from('profiles')
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq('id', userId)

  if (error) throw error
  revalidatePath('/admin')
}

export async function getUsers() {
  await requireAdmin()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function setBUPermission(userId, businessUnitId, accessLevel) {
  const admin = await requireAdmin()
  const supabase = createAdminClient()

  if (accessLevel === 'none') {
    // Remove permission
    const { error } = await supabase
      .from('user_bu_permissions')
      .delete()
      .eq('user_id', userId)
      .eq('business_unit_id', businessUnitId)

    if (error) throw error
  } else {
    // Upsert permission
    const { error } = await supabase
      .from('user_bu_permissions')
      .upsert({
        user_id: userId,
        business_unit_id: businessUnitId,
        access_level: accessLevel,
        granted_by: admin.id,
      }, {
        onConflict: 'user_id,business_unit_id'
      })

    if (error) throw error
  }

  revalidatePath('/admin')
}

export async function getUserPermissions(userId) {
  await requireAdmin()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('user_bu_permissions')
    .select('*, business_units(id, name)')
    .eq('user_id', userId)

  if (error) throw error
  return data
}
