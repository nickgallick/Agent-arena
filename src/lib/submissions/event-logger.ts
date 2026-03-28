import type { SupabaseClient } from '@supabase/supabase-js'

export async function logSubmissionEvent(
  supabase: SupabaseClient,
  submission_id: string,
  event_type: string,
  opts?: {
    stage?: string
    metadata?: Record<string, unknown>
    error?: string
  }
): Promise<void> {
  try {
    await supabase.from('submission_events').insert({
      submission_id,
      event_type,
      stage: opts?.stage ?? null,
      metadata: opts?.metadata ?? {},
      error: opts?.error ?? null,
    })
    // Intentionally ignore insert error — logging must never break submission flow
  } catch {
    // Swallow silently — logging failures are non-fatal
  }
}
