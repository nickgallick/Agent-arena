import type { EvidencePackage } from './evidence-packager'
import { createAdminClient } from '@/lib/supabase/admin'

export interface LaneRunResult {
  lane: string
  raw_score: number
  rationale_summary: string
  confidence: 'low' | 'medium' | 'high'
  flags: string[]
  model_used: string
  latency_ms: number
  attempt_number: number
  used_fallback: boolean
}

export class LaneRunError extends Error {
  constructor(
    public readonly lane: string,
    public readonly stage: string,
    public readonly attempt: number,
    message: string
  ) {
    super(message)
    this.name = 'LaneRunError'
  }
}

const EDGE_FUNCTION_MAP: Record<string, string> = {
  objective: 'objective-judge',
  process: 'judge-entry',
  strategy: 'judge-entry',
  integrity: 'judge-entry',
  audit: 'judge-entry',
}

const FALLBACK_MODELS: Record<string, string> = {
  primary: 'claude-3-5-sonnet-20241022',
  fallback: 'claude-3-haiku-20240307',
}

export async function runLane(
  judge_run_id: string,
  submission_id: string,
  lane: 'objective' | 'process' | 'strategy' | 'integrity' | 'audit',
  evidence_package: EvidencePackage,
  opts?: { timeout_ms?: number; max_attempts?: number }
): Promise<LaneRunResult> {
  const timeout_ms = opts?.timeout_ms ?? 30_000
  const max_attempts = opts?.max_attempts ?? 2
  const supabase = createAdminClient()

  let lastError: Error | null = null

  for (let attempt = 1; attempt <= max_attempts; attempt++) {
    const used_fallback = attempt > 1
    const model_used = used_fallback ? FALLBACK_MODELS.fallback : FALLBACK_MODELS.primary
    const fn_name = EDGE_FUNCTION_MAP[lane]
    const start = Date.now()

    // Log: started
    await supabase.from('judge_execution_logs').insert({
      judge_run_id,
      stage: `${lane}_lane_judging`,
      event: 'started',
      lane,
      model_used,
      attempt_number: attempt,
      metadata: { edge_function: fn_name, timeout_ms },
    })

    try {
      const result = await callEdgeFunction(fn_name, {
        submission_id,
        judge_run_id,
        lane,
        evidence: evidence_package.content,
        model: model_used,
      }, timeout_ms)

      const latency_ms = Date.now() - start

      // Log: completed
      await supabase.from('judge_execution_logs').insert({
        judge_run_id,
        stage: `${lane}_lane_judging`,
        event: used_fallback ? 'fallback_used' : 'completed',
        lane,
        model_used,
        attempt_number: attempt,
        duration_ms: latency_ms,
        metadata: { raw_score: result.raw_score },
      })

      return {
        lane,
        raw_score: result.raw_score,
        rationale_summary: result.rationale_summary ?? '',
        confidence: result.confidence ?? 'medium',
        flags: result.flags ?? [],
        model_used,
        latency_ms,
        attempt_number: attempt,
        used_fallback,
      }
    } catch (err) {
      const latency_ms = Date.now() - start
      lastError = err instanceof Error ? err : new Error(String(err))

      const isTimeout = lastError.message.includes('timeout') || lastError.message.includes('AbortError')

      // Log: failed/timeout
      await supabase.from('judge_execution_logs').insert({
        judge_run_id,
        stage: `${lane}_lane_judging`,
        event: isTimeout ? 'timeout' : 'failed',
        lane,
        model_used,
        attempt_number: attempt,
        duration_ms: latency_ms,
        error: lastError.message,
      })

      if (attempt < max_attempts) {
        // Log retry
        await supabase.from('judge_execution_logs').insert({
          judge_run_id,
          stage: `${lane}_lane_judging`,
          event: 'retried',
          lane,
          attempt_number: attempt + 1,
          metadata: { reason: lastError.message },
        })
      }
    }
  }

  throw new LaneRunError(
    lane,
    `${lane}_lane_judging`,
    max_attempts,
    `Lane ${lane} failed after ${max_attempts} attempts: ${lastError?.message ?? 'unknown error'}`
  )
}

interface EdgeFunctionResponse {
  raw_score: number
  rationale_summary?: string
  confidence?: 'low' | 'medium' | 'high'
  flags?: string[]
}

async function callEdgeFunction(
  fn_name: string,
  payload: Record<string, unknown>,
  timeout_ms: number
): Promise<EdgeFunctionResponse> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing Supabase environment variables')
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout_ms)

  try {
    const resp = await fetch(`${supabaseUrl}/functions/v1/${fn_name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    if (!resp.ok) {
      const body = await resp.text()
      throw new Error(`Edge function ${fn_name} returned ${resp.status}: ${body}`)
    }

    const data = await resp.json() as EdgeFunctionResponse
    return data
  } finally {
    clearTimeout(timer)
  }
}
