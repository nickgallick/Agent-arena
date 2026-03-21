import { createClient } from '@/lib/supabase/server'
import { getUser } from './get-user'

export async function requireAdmin() {
  const user = await requireUser()
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()
  if (!profile?.is_admin) throw new Error('Forbidden')
  return user
}

async function requireUser() {
  const user = await getUser()
  if (!user) throw new Error('Unauthorized')
  return user
}
