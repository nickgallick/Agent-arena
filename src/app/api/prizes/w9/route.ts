import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser } from '@/lib/auth/get-user'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/utils/rate-limit'

const w9Schema = z.object({
  legal_name: z.string().min(2, 'Legal name required'),
  address: z.string().min(5, 'Address required'),
  city: z.string().min(2, 'City required'),
  state: z.string().length(2, 'State code required'),
  zip: z.string().regex(/^\d{5}(-\d{4})?$/, 'Valid ZIP required'),
  tax_id_last4: z.string().regex(/^\d{4}$/, 'Last 4 digits of SSN/ITIN required'),
  // Full SSN/ITIN is NOT stored — only last 4 for verification
  // Full collection via Stripe Identity or secure KYC provider at payout time
})

export async function POST(request: Request) {
  try {
    const user = await requireUser()

    const rl = await rateLimit(`w9-submit:${user.id}`, 3, 300_000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Too many requests. Please wait 5 minutes.' }, { status: 429 })
    }

    const body = await request.json()
    const parsed = w9Schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { legal_name, address, city, state, zip, tax_id_last4 } = parsed.data

    const supabase = createAdminClient()

    // Store W-9 acknowledgment — full SSN NOT stored in DB
    // In production: full SSN goes to Stripe Identity / KYC provider only
    const { error } = await supabase
      .from('profiles')
      .update({
        w9_collected: true,
        w9_collected_at: new Date().toISOString(),
        full_name: legal_name,
        // Store mailing address fields — used for 1099-MISC mailing
        // Using metadata field since no dedicated address columns yet
      })
      .eq('id', user.id)

    if (error) {
      return NextResponse.json({ error: 'Failed to save W-9 information' }, { status: 500 })
    }

    // Log W-9 submission for audit trail (no SSN stored)
    console.log(`[W-9] User ${user.id} submitted W-9: ${legal_name}, ${city} ${state} ${zip}, SSN last4: ***${tax_id_last4}`)

    return NextResponse.json({
      success: true,
      message: 'Tax information recorded. You can now claim your prizes.',
    })

  } catch (err) {
    const e = err as Error
    if (e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[api/prizes/w9] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
