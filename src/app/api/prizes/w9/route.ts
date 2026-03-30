import { NextResponse } from 'next/server'

// W-9 / tax collection not active at launch — no payouts yet.
export async function POST() {
  return NextResponse.json(
    { error: 'Tax collection is not active at launch. W-9 will be required when prize payouts go live.' },
    { status: 503 }
  )
}
