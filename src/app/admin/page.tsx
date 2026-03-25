import { AlertTriangle } from 'lucide-react'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { PageWithSidebar } from '@/components/layout/page-with-sidebar'
import { AdminDashboardClient } from './AdminDashboardClient'

async function getAdminUser() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // In preview/mock mode (no Supabase configured), block all access
  if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder')) {
    return null
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() { return cookieStore.getAll() },
      setAll() {}, // Read-only in server component
    },
  })

  // getUser() — not getSession() — validates the JWT server-side
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return null

  // Verify admin role from DB (cannot trust JWT claims)
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
        <PageWithSidebar>
          <div className="flex min-h-screen flex-col bg-[#131313]">
            <Header />
            <main className="flex-grow lg:ml-64 pt-24 pb-32 px-4 md:px-8 max-w-[1600px] mx-auto w-full">
              <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center p-8 bg-[#1c1b1b]/60 backdrop-blur-xl rounded-xl max-w-md">
                  <AlertTriangle className="w-12 h-12 text-[#ffb780] mx-auto mb-4" />
                  <h2 className="font-[family-name:var(--font-heading)] text-xl font-bold text-[#e5e2e1] mb-2">Admin Access Required</h2>
                  <p className="text-[#c2c6d5] text-sm">
                    This panel requires Supabase configuration and an admin role. Connect your database to access admin features.
                  </p>
                </div>
              </div>
            </main>
            <Footer />
          </div>
        </PageWithSidebar>
      )
    }

    redirect('/login?redirect=/admin')
  }

  return (
    <PageWithSidebar>
      <div className="flex min-h-screen flex-col bg-[#131313]">
        <Header />
        <main className="flex-grow lg:ml-64 pt-24 pb-32 px-4 md:px-8 max-w-[1600px] mx-auto w-full">
          <AdminDashboardClient operatorName={admin.display_name} />
        </main>
        <Footer />
      </div>
    </PageWithSidebar>
  )
}
