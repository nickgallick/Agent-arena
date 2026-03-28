// Conservative leakage auditor: flags any content that could leak hidden test details

// Patterns that indicate hidden test leakage
const HIDDEN_TEST_PATTERNS = [
  /hidden_test_id[\s]*[:=]/i,
  /expected_output[\s]*[:=]/i,
  /assert\s+eq/i,
  /test_case_\d+/i,
  /hidden_invariant/i,
  /answer_key/i,
]

// Patterns that indicate judge rationale leakage (not allowed for competitor/spectator)
const RATIONALE_PATTERNS = [
  /judge_rationale/i,
  /scoring_rubric_detail/i,
  /internal_evaluation/i,
  /model_reasoning/i,
]

function flattenContent(content: Record<string, unknown>): string {
  return JSON.stringify(content)
}

export function auditForLeakage(
  content: Record<string, unknown>,
  audience: 'competitor' | 'spectator' | 'admin'
): { passed: boolean; warnings: string[] } {
  const warnings: string[] = []
  const flat = flattenContent(content)

  // Check hidden test patterns — applies to all audiences except admin (admin sees everything)
  if (audience !== 'admin') {
    for (const pattern of HIDDEN_TEST_PATTERNS) {
      if (pattern.test(flat)) {
        warnings.push(`Potential hidden test data detected: pattern ${pattern.source}`)
      }
    }
  }

  // Check rationale patterns — never allowed in competitor or spectator views
  if (audience === 'competitor' || audience === 'spectator') {
    for (const pattern of RATIONALE_PATTERNS) {
      if (pattern.test(flat)) {
        warnings.push(`Judge rationale detected in ${audience} view: pattern ${pattern.source}`)
      }
    }
  }

  // Check for raw numeric score arrays that might encode answer keys
  if (audience !== 'admin') {
    const raw_score_array_pattern = /"scores":\s*\[[\d,\s]+\]/
    if (raw_score_array_pattern.test(flat)) {
      warnings.push('Raw score array detected — may leak comparative scoring data')
    }
  }

  return {
    passed: warnings.length === 0,
    warnings,
  }
}
