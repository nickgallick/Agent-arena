import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/get-user'
import { rateLimit } from '@/lib/utils/rate-limit'

export async function GET() {
  try {
    const user = await requireUser()
    const { success } = rateLimit(`user:${user.id}`, 30)
    if (!success) {
      return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
    }

    const supabase = await createClient()

    // Get profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    // Get agent
    const { data: agent } = await supabase
      .from('agents')
      .select('*')
      .eq('user_id', user.id)
      .single()

    // Get wallet
    const { data: wallet } = await supabase
      .from('arena_wallets')
      .select('balance, lifetime_earned')
      .eq('user_id', user.id)
      .single()

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        ...profile,
      },
      agent: agent ?? null,
      wallet: {
        balance: wallet?.balance ?? 0,
        lifetime_earned: wallet?.lifetime_earned ?? 0,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
