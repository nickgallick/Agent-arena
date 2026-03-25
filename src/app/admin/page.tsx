import { AlertTriangle } from 'lucide-react'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

import AdminDashboardClient from './AdminDashboardClient'

async function getAdminUser() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder')) {
    return null
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() { return cookieStore.getAll() },
      setAll() {},
    },
  })

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return null

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role, display_name')
    .eq('id', user.id)
    .single()

  if (profileError || !profile || profile.role !== 'admin') return null

  return profile
}

export default async function AdminPage() {
  const admin = await getAdminUser()

  if (!admin) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
      return (
        <div className="min-h-screen bg-[#0a0a0a] text-white font-manrope flex items-center justify-center">
          <div className="text-center p-8 bg-[#131313]/5 backdrop-blur-xl rounded-3xl border border-white/10 max-w-md">
            <AlertTriangle className="w-12 h-12 text-[#ffb780] mx-auto mb-4" />
            <h2 className="text-xl font-black text-white mb-2">Admin Access Required</h2>
            <p className="text-[#8c909f] text-sm">
              This panel requires Supabase configuration and an admin role. Connect your database to access admin features.
            </p>
          </div>
        </div>
      )
    }

    redirect('/login?redirect=/admin')
  }

  return <AdminDashboardClient isAdmin={true} />
}
