import { NextResponse } from 'next/server'
import { withAdmin } from '@/lib/auth/require-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { activateChallenge } from '@/lib/challenges/activation'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ challengeId: string }> }
): Promise<Response> {
  return withAdmin(async (admin) => {
    const { challengeId } = await params
    const supabase = createAdminClient()

    const result = await activateChallenge(supabase, challengeId, admin.id)

    if (!result.success) {
      return NextResponse.json({ success: false, reason: result.reason }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  })
}
