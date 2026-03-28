/**
 * POST /api/admin/ballot/run
 *
 * Manually triggers a ballot ingestion pass.
 * Processes all pending calibration_learning_artifacts.
 * Admin-only.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/require-admin'
import { rateLimit } from '@/lib/utils/rate-limit'
import crypto from 'crypto'

// ─── Types ────────────────────────────────────────────────────────────────────

interface LearningArtifact {
  id: string
  challenge_id: string
  bundle_id: string | null
  family: string
  format: string
  weight_class: string
  verdict: string
  cdi_score: number | null
  what_worked: string[]
  what_failed: string[]
  what_improved_discrimination: string[]
  what_caused_compression: string[]
  what_improved_same_model_spread: string[]
  what_reduced_same_model_spread: string[]
  what_triggered_audit: string[]
  mutation_lessons: Array<{ type: string; helped: boolean; reason: string }>
  contamination_patterns: string[]
  human_reviewer_fixes: string[]
  key_lesson: string | null
  key_anti_lesson: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hashLesson(text: string): string {
  const normalized = text.trim().toLowerCase().replace(/\s+/g, ' ')
  return crypto.createHash('sha256').update(normalized).digest('hex')
}

function confidenceFromCount(count: number): string {
  if (count >= 5) return 'high'
  if (count >= 3) return 'medium'
  return 'low'
}

// ─── Lesson synthesis ─────────────────────────────────────────────────────────

interface SynthesizedLesson {
  lesson: string
  category: string
  subcategory: string | null
  family: string | null
}

function synthesizeLessons(artifact: LearningArtifact): SynthesizedLesson[] {
  const entries: SynthesizedLesson[] = []

  const add = (
    lesson: string,
    category: string,
    subcategory: string | null = null,
    family: string | null = artifact.family
  ) => {
    if (lesson?.trim()) {
      entries.push({ lesson: lesson.trim(), category, subcategory, family })
    }
  }

  for (const item of artifact.what_worked ?? []) add(item, 'positive', 'discrimination')
  for (const item of artifact.what_improved_discrimination ?? []) add(item, 'positive', 'discrimination')
  for (const item of artifact.what_improved_same_model_spread ?? []) add(item, 'positive', 'same_model_spread')
  if (artifact.key_lesson) add(artifact.key_lesson, 'positive', 'key_lesson')

  for (const item of artifact.what_failed ?? []) add(item, 'negative', 'discrimination')
  for (const item of artifact.what_caused_compression ?? []) add(item, 'negative', 'compression')
  for (const item of artifact.what_reduced_same_model_spread ?? []) add(item, 'negative', 'same_model_spread')
  for (const item of artifact.contamination_patterns ?? []) add(item, 'negative', 'contamination')
  if (artifact.key_anti_lesson) add(artifact.key_anti_lesson, 'negative', 'anti_lesson')

  for (const ml of artifact.mutation_lessons ?? []) {
    if (ml.reason) {
      const text = `[${ml.type}] ${ml.helped ? 'HELPED' : 'DID NOT HELP'}: ${ml.reason}`
      add(text, 'mutation', ml.type)
    }
  }

  for (const item of artifact.what_triggered_audit ?? []) {
    add(item, 'calibration_system', 'audit_trigger', null)
  }

  for (const fix of artifact.human_reviewer_fixes ?? []) {
    if (typeof fix === 'string') {
      add(`Forge review required fix: ${fix}`, 'negative', 'reviewer_fix')
    }
  }

  return entries
}

// ─── Core ingestion ───────────────────────────────────────────────────────────

async function runIngestion(): Promise<{
  processed: number
  lessons_written: number
  errors: string[]
}> {
  const supabase = createAdminClient()
  const errors: string[] = []
  let processed = 0
  let lessonsWritten = 0
  const ts = new Date().toISOString()

  const { data: artifacts, error: fetchErr } = await supabase
    .from('calibration_learning_artifacts')
    .select('*')
    .eq('ballot_status', 'pending')
    .order('created_at', { ascending: true })

  if (fetchErr) throw new Error(`Failed to fetch artifacts: ${fetchErr.message}`)
  if (!artifacts || artifacts.length === 0) return { processed: 0, lessons_written: 0, errors: [] }

  for (const artifact of artifacts as LearningArtifact[]) {
    // Mark processing
    await supabase
      .from('calibration_learning_artifacts')
      .update({ ballot_status: 'processing' })
      .eq('id', artifact.id)

    try {
      const lessons = synthesizeLessons(artifact)

      for (const lesson of lessons) {
        const hash = hashLesson(lesson.lesson)

        // Check existing
        const { data: existing } = await supabase
          .from('ballot_lesson_entries')
          .select('id, observation_count')
          .eq('lesson_hash', hash)
          .single()

        if (existing) {
          const newCount = existing.observation_count + 1
          await supabase
            .from('ballot_lesson_entries')
            .update({
              observation_count: newCount,
              confidence: confidenceFromCount(newCount),
              last_seen_at: ts,
              updated_at: ts,
            })
            .eq('id', existing.id)
        } else {
          await supabase.from('ballot_lesson_entries').insert({
            artifact_id: artifact.id,
            category: lesson.category,
            family: lesson.family,
            subcategory: lesson.subcategory,
            lesson: lesson.lesson,
            confidence: 'low',
            observation_count: 1,
            first_seen_at: ts,
            last_seen_at: ts,
            lesson_hash: hash,
          })
        }
        lessonsWritten++
      }

      await supabase
        .from('calibration_learning_artifacts')
        .update({
          ballot_status: 'ingested',
          ballot_ingested_at: ts,
          ballot_error: null,
        })
        .eq('id', artifact.id)

      processed++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`${artifact.id}: ${msg}`)
      await supabase
        .from('calibration_learning_artifacts')
        .update({ ballot_status: 'error', ballot_error: msg })
        .eq('id', artifact.id)
    }
  }

  return { processed, lessons_written: lessonsWritten, errors }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // Allow internal server-to-server calls via service key header
    const internalKey = request.headers.get('x-internal-service-key')
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const isInternalCall = internalKey && serviceKey && internalKey === serviceKey

    if (!isInternalCall) {
      const admin = await requireAdmin()
      const { success } = await rateLimit(`admin:${admin.id}:ballot-run`, 5, 60_000)
      if (!success) {
        return NextResponse.json({ error: 'Rate limited — ballot run max 5/min' }, { status: 429 })
      }
    }

    const result = await runIngestion()

    return NextResponse.json({
      ok: true,
      processed: result.processed,
      lessons_written: result.lessons_written,
      errors: result.errors.length > 0 ? result.errors : undefined,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    if (msg.includes('Unauthorized') || msg.includes('Admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
