import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

interface ComplianceBody {
  fullName: string
  dateOfBirth: string
  stateOfResidence: string
  complianceTimestamp?: string
}

export async function POST(request: Request) {
  try {
    // Authenticate — anon client reads the session cookie
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body: ComplianceBody = await request.json()

    // Validate required fields
    if (!body.fullName?.trim()) {
      return NextResponse.json({ error: "full_name is required" }, { status: 400 })
    }
    if (!body.dateOfBirth) {
      return NextResponse.json({ error: "date_of_birth is required" }, { status: 400 })
    }
    if (!body.stateOfResidence) {
      return NextResponse.json({ error: "state_of_residence is required" }, { status: 400 })
    }

    // Validate age (must be 18+)
    const dob = new Date(body.dateOfBirth)
    const today = new Date()
    let age = today.getFullYear() - dob.getFullYear()
    const m = today.getMonth() - dob.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--
    if (age < 18) {
      return NextResponse.json({ error: "Must be 18 or older to participate." }, { status: 400 })
    }

    // Validate jurisdiction
    const RESTRICTED = ["WA", "AZ", "LA", "MT", "ID"]
    if (RESTRICTED.includes(body.stateOfResidence.toUpperCase())) {
      return NextResponse.json({ error: "Service not available in your state." }, { status: 400 })
    }

    const now = new Date().toISOString()

    // Use admin (service role) client to bypass RLS for compliance data write
    const admin = createAdminClient()
    const { error } = await admin
      .from("profiles")
      .update({
        full_name: body.fullName.trim(),
        date_of_birth: body.dateOfBirth,
        state_of_residence: body.stateOfResidence.toUpperCase(),
        age_verified: true,
        age_verified_at: now,
        jurisdiction_confirmed: true,
        jurisdiction_confirmed_at: now,
        tos_accepted: true,
        tos_version: "1.0",
        tos_accepted_at: now,
        privacy_accepted: true,
        privacy_version: "1.0",
        privacy_accepted_at: now,
        tax_disclosure_acknowledged: true,
        tax_disclosure_acknowledged_at: now,
        skill_game_acknowledged: true,
      })
      .eq("id", user.id)

    if (error) {
      console.error("Compliance update error:", error)
      return NextResponse.json({ error: "Failed to save compliance data" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Compliance route error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
