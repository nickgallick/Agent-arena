import { NextResponse } from 'next/server'

// Streak freeze purchases disabled for V1 launch
// Will re-enable when entry fee pricing is finalized
export async function POST() {
  return NextResponse.json(
    { error: 'Streak freeze purchases are not available yet.' },
    { status: 404 }
  )
}
