// objective-judge/index.ts — Lane 1: Deterministic Objective Scoring
// Forge · 2026-03-27
//
// The most important scoring lane — verifies whether the work actually functions.
// Non-LLM first: runs structural validators, regex/exact/schema checks, and
// extracts self-reported test results from submission telemetry.
//
// Scoring strategy (in order of evidence strength):
//   1. Hidden test cases  → run against submission (eval_type: regex/exact/contains/json_schema)
//   2. Telemetry evidence → test_run_count, verification_density, error patterns
//   3. Structural check   → does submission contain required elements?
//   4. Self-report parse  → extract claimed pass/fail from submission text
//
// When hidden tests exist: objective score = weighted test pass rate (0-100)
// When no hidden tests: objective score = 0 (weight redistributed to LLM lanes by finalize_entry_scoring)

import { getSupabaseClient } from '../_shared/supabase-client.ts'

interface ObjectiveResult {
  score: number              // 0-100
  tests_run: number
  tests_passed: number
  tests_failed: number
  total_points: number
  points_earned: number
  confidence: 'deterministic' | 'telemetry_inferred' | 'structural' | 'none'
  evidence_summary: string
  test_results: TestResult[]
}

interface TestResult {
  test_name: string
  test_group: string
  passed: boolean
  points_earned: number
  points_possible: number
  eval_type: string
  matched_text?: string
  error_message?: string
}

Deno.serve(async (req: Request) => {
  try {
    const body = await req.json()
    const { entry_id, challenge_id } = body

    if (!entry_id) return json({ error: 'entry_id required' }, 400)

    const supabase = getSupabaseClient()

    // ── 1. Load entry ──────────────────────────────────────────
    const { data: entry, error: entryErr } = await supabase
      .from('challenge_entries')
      .select(`
        id, submission_text, challenge_id, challenge_format, objective_score,
        challenge:challenges(format, has_objective_tests, objective_test_count, judge_weights, family_id)
      `)
      .eq('id', entry_id)
      .single()

    if (entryErr || !entry?.submission_text) {
      return json({ error: 'Entry not found or no submission' }, 404)
    }

    const challengeId = challenge_id ?? entry.challenge_id
    const challengeData = entry.challenge as {
      format?: string
      has_objective_tests?: boolean
      objective_test_count?: number
      judge_weights?: Record<string, number>
      family_id?: string
    } | null

    // ── 2. Load hidden test cases ──────────────────────────────
    const { data: testCases } = await supabase
      .from('hidden_test_cases')
      .select('id, test_name, test_group, weight, eval_type, expected_pattern, expected_schema, points_possible, partial_credit')
      .eq('challenge_id', challengeId)
      .eq('is_active', true)
      .order('test_group', { ascending: true })

    // ── 3. Load telemetry for inference fallback ───────────────
    const { data: metrics } = await supabase
      .from('run_metrics')
      .select('test_run_count, verification_density, error_count, total_events, telemetry_process_score, telemetry_efficiency_score')
      .eq('entry_id', entry_id)
      .maybeSingle()

    let result: ObjectiveResult

    if (testCases && testCases.length > 0) {
      // ── Path A: Run deterministic hidden tests ─────────────
      result = await runHiddenTests(entry.submission_text, testCases)
    } else {
      // ── Path B: No tests — infer from telemetry + structure ─
      result = inferFromTelemetryAndStructure(entry.submission_text, metrics)
    }

    // ── 4. Write test results to objective_test_results ───────
    if (result.test_results.length > 0) {
      const rows = result.test_results.map(tr => ({
        entry_id,
        challenge_id: challengeId,
        test_case_id: testCases?.find(tc => tc.test_name === tr.test_name)?.id ?? null,
        test_name: tr.test_name,
        test_group: tr.test_group,
        passed: tr.passed,
        points_earned: tr.points_earned,
        points_possible: tr.points_possible,
        matched_text: tr.matched_text ?? null,
        error_message: tr.error_message ?? null,
        eval_type: tr.eval_type,
      }))

      try {
        await supabase.from('objective_test_results').upsert(rows, {
          onConflict: 'entry_id,test_name',
          ignoreDuplicates: false,
        })
      } catch (err) {
        console.error('[objective-judge] test_results insert error:', (err as Error).message)
      }
    }

    // ── 5. Write objective_score to challenge_entries ──────────
    await supabase
      .from('challenge_entries')
      .update({ objective_score: result.score })
      .eq('id', entry_id)

    // ── 6. Write to judge_outputs as objective lane ────────────
    // Use DELETE + INSERT pattern to avoid onConflict resolution ambiguity
    // (Deno supabase-js upsert with onConflict can silently no-op on some constraint configs)
    await supabase.from('judge_outputs')
      .delete()
      .eq('entry_id', entry_id)
      .eq('lane', 'objective')
      .eq('is_arbitration', false)

    const { error: objInsertErr } = await supabase.from('judge_outputs').insert({
      entry_id,
      challenge_id: challengeId,
      lane: 'objective',
      model_id: 'deterministic-v1',
      provider: 'objective',
      score: result.score,
      confidence: result.confidence === 'deterministic' ? 1.0
                : result.confidence === 'telemetry_inferred' ? 0.6
                : result.confidence === 'structural' ? 0.4 : 0.2,
      dimension_scores: {
        tests_passed: result.tests_passed,
        tests_total: result.tests_run,
        points_earned: result.points_earned,
        points_possible: result.total_points,
      },
      evidence_refs: result.test_results.slice(0, 5).map((tr: { test_name: string; passed: boolean; points_earned: number; points_possible: number }) =>
        `${tr.test_name}: ${tr.passed ? 'PASS' : 'FAIL'} (${tr.points_earned}/${tr.points_possible}pts)`
      ),
      short_rationale: result.evidence_summary,
      flags: [],
      is_fallback: false,
      is_arbitration: false,
    })

    if (objInsertErr) {
      console.error('[objective-judge] judge_outputs insert error:', objInsertErr.message)
    } else {
      console.log(`[objective-judge] judge_outputs written: entry=${entry_id} score=${result.score}`)
    }

    // ── 7. Check if all required lanes complete → finalize ─────
    const { data: completedLanes } = await supabase
      .from('judge_outputs')
      .select('lane')
      .eq('entry_id', entry_id)
      .in('lane', ['process', 'strategy', 'integrity'])
      .eq('is_arbitration', false)

    // Objective is Lane 1 — check if LLM lanes are also done
    if (completedLanes && completedLanes.length === 3) {
      console.log(`[objective-judge] all lanes complete for entry ${entry_id} — triggering finalize`)
      try {
        await supabase.rpc('finalize_entry_scoring', { p_entry_id: entry_id })
      } catch (err) {
        console.error('[objective-judge] finalize error:', (err as Error).message)
      }
      try { await supabase.rpc('update_capability_profile', { p_entry_id: entry_id }) } catch { /* non-critical */ }
    } else {
      console.log(`[objective-judge] objective done, waiting for ${3 - (completedLanes?.length ?? 0)} LLM lanes`)
    }

    return json({
      status: 'scored',
      entry_id,
      lane: 'objective',
      score: result.score,
      tests_run: result.tests_run,
      tests_passed: result.tests_passed,
      confidence: result.confidence,
      evidence_summary: result.evidence_summary,
    })

  } catch (err) {
    console.error('[objective-judge] error:', (err as Error).message)
    return json({ error: (err as Error).message }, 500)
  }
})

// ============================================================
// Path A: Run hidden test cases deterministically
// ============================================================

async function runHiddenTests(
  submissionText: string,
  testCases: Array<{
    id: string
    test_name: string
    test_group: string
    weight: number
    eval_type: string
    expected_pattern: string | null
    expected_schema: Record<string, unknown> | null
    points_possible: number
    partial_credit: boolean
  }>
): Promise<ObjectiveResult> {
  const testResults: TestResult[] = []
  let totalPoints = 0
  let earnedPoints = 0

  for (const tc of testCases) {
    totalPoints += tc.points_possible
    const tr = await runSingleTest(submissionText, tc)
    testResults.push(tr)
    earnedPoints += tr.points_earned
  }

  const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0
  const passed = testResults.filter(t => t.passed).length
  const failed = testResults.filter(t => !t.passed).length

  return {
    score,
    tests_run: testResults.length,
    tests_passed: passed,
    tests_failed: failed,
    total_points: totalPoints,
    points_earned: earnedPoints,
    confidence: 'deterministic',
    evidence_summary: `${passed}/${testResults.length} tests passed (${score}/100). ${
      failed > 0 ? `${failed} failing: ${testResults.filter(t=>!t.passed).map(t=>t.test_name).join(', ')}` : 'All tests passing.'
    }`,
    test_results: testResults,
  }
}

async function runSingleTest(
  submissionText: string,
  tc: {
    test_name: string
    test_group: string
    eval_type: string
    expected_pattern: string | null
    expected_schema: Record<string, unknown> | null
    points_possible: number
    partial_credit: boolean
  }
): Promise<TestResult> {
  const base: TestResult = {
    test_name: tc.test_name,
    test_group: tc.test_group,
    passed: false,
    points_earned: 0,
    points_possible: tc.points_possible,
    eval_type: tc.eval_type,
  }

  try {
    switch (tc.eval_type) {
      case 'regex': {
        if (!tc.expected_pattern) return { ...base, error_message: 'No pattern defined' }
        const re = new RegExp(tc.expected_pattern, 'im')
        const match = submissionText.match(re)
        if (match) {
          return { ...base, passed: true, points_earned: tc.points_possible, matched_text: match[0].slice(0, 200) }
        }
        return base
      }

      case 'exact': {
        if (!tc.expected_pattern) return { ...base, error_message: 'No pattern defined' }
        const normalized = submissionText.replace(/\s+/g, ' ').trim()
        const passed = normalized.includes(tc.expected_pattern.trim())
        return {
          ...base, passed,
          points_earned: passed ? tc.points_possible : 0,
          matched_text: passed ? tc.expected_pattern.slice(0, 200) : undefined,
        }
      }

      case 'contains': {
        if (!tc.expected_pattern) return { ...base, error_message: 'No pattern defined' }
        // Support multiple required strings separated by ||| 
        const required = tc.expected_pattern.split('|||').map(s => s.trim()).filter(Boolean)
        const matches = required.filter(r => submissionText.toLowerCase().includes(r.toLowerCase()))
        if (tc.partial_credit && required.length > 0) {
          const ratio = matches.length / required.length
          return {
            ...base,
            passed: ratio === 1,
            points_earned: Math.round(tc.points_possible * ratio),
            matched_text: matches.join(', ').slice(0, 200),
          }
        }
        const allPass = matches.length === required.length
        return { ...base, passed: allPass, points_earned: allPass ? tc.points_possible : 0 }
      }

      case 'json_schema': {
        if (!tc.expected_schema) return { ...base, error_message: 'No schema defined' }
        // Extract first JSON block from submission
        const jsonMatch = submissionText.match(/```(?:json)?\s*([\s\S]+?)```/)
          ?? submissionText.match(/\{[\s\S]+\}/)
        if (!jsonMatch) return { ...base, error_message: 'No JSON found in submission' }
        try {
          const parsed = JSON.parse(jsonMatch[1] ?? jsonMatch[0])
          const valid = validateJsonSchema(parsed, tc.expected_schema)
          return { ...base, passed: valid, points_earned: valid ? tc.points_possible : 0 }
        } catch {
          return { ...base, error_message: 'Failed to parse JSON from submission' }
        }
      }

      case 'llm_check': {
        // Lightweight structural check — no LLM call, use keyword proxy
        // Full LLM eval is Phase 3 (expensive, reserved for high-value challenges)
        if (!tc.expected_pattern) return { ...base, error_message: 'No llm_check pattern defined' }
        const keywords = tc.expected_pattern.split(',').map(k => k.trim().toLowerCase())
        const found = keywords.filter(kw => submissionText.toLowerCase().includes(kw))
        const ratio = found.length / keywords.length
        return {
          ...base,
          passed: ratio >= 0.75,
          points_earned: tc.partial_credit ? Math.round(tc.points_possible * ratio) : (ratio >= 0.75 ? tc.points_possible : 0),
          matched_text: found.join(', ').slice(0, 200),
        }
      }

      default:
        return { ...base, error_message: `Unknown eval_type: ${tc.eval_type}` }
    }
  } catch (err) {
    return { ...base, error_message: `Eval error: ${(err as Error).message}` }
  }
}

// ============================================================
// Path B: Infer objective score from telemetry + structure
// Used when no hidden tests are configured for the challenge
// Score will be 0 (triggering weight redistribution in finalize_entry_scoring)
// unless there is enough telemetry evidence to score meaningfully
// ============================================================

function inferFromTelemetryAndStructure(
  submissionText: string,
  metrics: {
    test_run_count?: number
    verification_density?: number
    error_count?: number
    total_events?: number
    telemetry_process_score?: number
    telemetry_efficiency_score?: number
  } | null
): ObjectiveResult {
  // No hidden tests — objective score stays 0
  // finalize_entry_scoring will redistribute objective weight to LLM lanes
  const testResults: TestResult[] = []

  // Structural presence checks — quick sanity signals
  const hasCode = /```[\s\S]+?```|def |function |class |const |let |var /.test(submissionText)
  const hasExplanation = submissionText.length > 200
  const claimsTestsPassed = /all.*test.*pass|test.*pass.*all|\d+\/\d+ test/i.test(submissionText)
  const claimsFixed = /fix(ed)?|resolv(ed)?|correct(ed)?/i.test(submissionText)

  // Structural result
  testResults.push({
    test_name: 'submission_has_code',
    test_group: 'structural',
    passed: hasCode,
    points_earned: hasCode ? 5 : 0,
    points_possible: 5,
    eval_type: 'structural',
    matched_text: hasCode ? 'Code block detected' : undefined,
  })

  testResults.push({
    test_name: 'submission_has_explanation',
    test_group: 'structural',
    passed: hasExplanation,
    points_earned: hasExplanation ? 3 : 0,
    points_possible: 3,
    eval_type: 'structural',
  })

  testResults.push({
    test_name: 'claims_completion',
    test_group: 'structural',
    passed: claimsFixed || claimsTestsPassed,
    points_earned: (claimsFixed || claimsTestsPassed) ? 2 : 0,
    points_possible: 2,
    eval_type: 'structural',
    matched_text: claimsFixed ? 'Fixed/resolved claim found' : claimsTestsPassed ? 'Tests passed claim found' : undefined,
  })

  const earnedPoints = testResults.reduce((s, t) => s + t.points_earned, 0)
  const totalPoints = testResults.reduce((s, t) => s + t.points_possible, 0)
  const structuralScore = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0

  // NOTE: We return 0 for the actual objective_score when no hidden tests exist
  // The structural signals are captured for transparency but don't contribute to the
  // official objective score — that weight gets redistributed to the LLM lanes
  return {
    score: 0,  // No hidden tests = no objective score
    tests_run: testResults.length,
    tests_passed: testResults.filter(t => t.passed).length,
    tests_failed: testResults.filter(t => !t.passed).length,
    total_points: 0,
    points_earned: 0,
    confidence: 'none',
    evidence_summary: `No hidden test cases configured for this challenge. Objective weight redistributed to LLM lanes. Structural check: ${structuralScore}/100 (informational only).`,
    test_results: testResults,
  }
}

// ============================================================
// Minimal JSON Schema validator (no external deps)
// Handles: type, required, properties, minimum, maximum, pattern
// ============================================================

function validateJsonSchema(data: unknown, schema: Record<string, unknown>): boolean {
  if (schema.type === 'object') {
    if (typeof data !== 'object' || data === null || Array.isArray(data)) return false
    const obj = data as Record<string, unknown>
    if (Array.isArray(schema.required)) {
      for (const req of schema.required as string[]) {
        if (!(req in obj)) return false
      }
    }
    if (schema.properties && typeof schema.properties === 'object') {
      for (const [key, propSchema] of Object.entries(schema.properties as Record<string, unknown>)) {
        if (key in obj) {
          if (!validateJsonSchema(obj[key], propSchema as Record<string, unknown>)) return false
        }
      }
    }
    return true
  }
  if (schema.type === 'array') {
    if (!Array.isArray(data)) return false
    if (schema.items && Array.isArray(data)) {
      return data.every(item => validateJsonSchema(item, schema.items as Record<string, unknown>))
    }
    return true
  }
  if (schema.type === 'string') {
    if (typeof data !== 'string') return false
    if (schema.pattern && !new RegExp(schema.pattern as string).test(data)) return false
    return true
  }
  if (schema.type === 'number' || schema.type === 'integer') {
    if (typeof data !== 'number') return false
    if (schema.minimum !== undefined && data < (schema.minimum as number)) return false
    if (schema.maximum !== undefined && data > (schema.maximum as number)) return false
    return true
  }
  if (schema.type === 'boolean') return typeof data === 'boolean'
  return true  // unknown type — pass
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
