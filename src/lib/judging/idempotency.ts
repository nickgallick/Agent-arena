import type { SupabaseClient } from '@supabase/supabase-js'
import type { VersionSnapshot } from '@/lib/submissions/version-snapshot'

export async function getOrCreateJudgeRun(
  supabase: SupabaseClient,
  submission_id: string,
  judging_job_id: string,
  version_snapshot: VersionSnapshot
): Promise<{ judge_run_id: string; is_new: boolean }> {
  // Check for existing judge_run for this submission
  const { data: existing, error: fetchError } = await supabase
    .from('judge_runs')
    .select('id, status')
    .eq('submission_id', submission_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (fetchError) {
    throw new Error(`Failed to check existing judge_run: ${fetchError.message}`)
  }

  if (existing) {
    // Never overwrite a finalized run
    if (existing.status === 'finalized') {
      return { judge_run_id: existing.id, is_new: false }
    }
    // Return existing if active (pending/running/etc)
    if (!['failed', 'dead_letter'].includes(existing.status)) {
      return { judge_run_id: existing.id, is_new: false }
    }
    // Existing is failed/dead_letter — create a new one for retry
  }

  const { data: newRun, error: createError } = await supabase
    .from('judge_runs')
    .insert({
      submission_id,
      judging_job_id,
      version_snapshot: version_snapshot as unknown as Record<string, unknown>,
      status: 'pending',
    })
    .select('id')
    .single()

  if (createError || !newRun) {
    throw new Error(`Failed to create judge_run: ${createError?.message ?? 'unknown'}`)
  }

  return { judge_run_id: newRun.id, is_new: true }
}
