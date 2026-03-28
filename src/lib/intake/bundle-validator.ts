import type { GauntletBundle } from './bundle-schema'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ValidationFailure = {
  field: string
  rule: string
  message: string
}

export type ValidationResult = {
  passed: boolean
  failures: ValidationFailure[]
  warnings: string[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const REQUIRED_DIFFICULTY_DIMENSIONS = [
  'reasoning_depth',
  'tool_dependence',
  'ambiguity',
  'deception',
  'time_pressure',
  'error_recovery_burden',
  'non_local_dependency',
  'evaluation_strictness',
] as const

const REQUIRED_CALIBRATION_TIERS = ['naive', 'standard', 'strong', 'elite'] as const
const REQUIRED_EVIDENCE_LANES = ['objective', 'process', 'strategy', 'integrity'] as const
const JUDGE_WEIGHT_KEYS = ['objective', 'process', 'strategy', 'integrity'] as const

// ─────────────────────────────────────────────────────────────────────────────
// Validator
// ─────────────────────────────────────────────────────────────────────────────

export function validateBundle(bundle: GauntletBundle): ValidationResult {
  const failures: ValidationFailure[] = []
  const warnings: string[] = []

  // 1. Prompt non-empty
  if (!bundle.prompt || bundle.prompt.trim().length === 0) {
    failures.push({
      field: 'prompt',
      rule: 'non_empty',
      message: 'prompt must not be empty',
    })
  }

  // 2. visible_tests.length >= 3
  if (!bundle.visible_tests || bundle.visible_tests.length < 3) {
    failures.push({
      field: 'visible_tests',
      rule: 'min_count',
      message: `visible_tests must have at least 3 entries (found ${bundle.visible_tests?.length ?? 0})`,
    })
  }

  // 3. hidden_tests.length >= 2
  if (!bundle.hidden_tests || bundle.hidden_tests.length < 2) {
    failures.push({
      field: 'hidden_tests',
      rule: 'min_count',
      message: `hidden_tests must have at least 2 entries (found ${bundle.hidden_tests?.length ?? 0})`,
    })
  }

  // 4. judge_weights sum = 100 (allow ±1 rounding)
  if (bundle.judge_weights) {
    const sum = JUDGE_WEIGHT_KEYS.reduce(
      (acc, key) => acc + (bundle.judge_weights[key] ?? 0),
      0
    )
    if (Math.abs(sum - 100) > 1) {
      failures.push({
        field: 'judge_weights',
        rule: 'sum_to_100',
        message: `judge_weights must sum to 100 (±1), got ${sum}`,
      })
    }
  } else {
    failures.push({
      field: 'judge_weights',
      rule: 'required',
      message: 'judge_weights is required',
    })
  }

  // 5. All 4 evidence_map lanes present and non-empty
  if (bundle.evidence_map) {
    for (const lane of REQUIRED_EVIDENCE_LANES) {
      const laneData = bundle.evidence_map[lane]
      if (!laneData || laneData.length === 0) {
        failures.push({
          field: `evidence_map.${lane}`,
          rule: 'non_empty_lane',
          message: `evidence_map.${lane} must be present and non-empty`,
        })
      }
    }
  } else {
    failures.push({
      field: 'evidence_map',
      rule: 'required',
      message: 'evidence_map is required',
    })
  }

  // 6. difficulty_profile has all 8 dimensions
  if (bundle.difficulty_profile) {
    for (const dim of REQUIRED_DIFFICULTY_DIMENSIONS) {
      const val = bundle.difficulty_profile[dim]
      if (val === null || val === undefined) {
        failures.push({
          field: `difficulty_profile.${dim}`,
          rule: 'required_dimension',
          message: `difficulty_profile.${dim} is required`,
        })
      } else if (typeof val !== 'number' || val < 1 || val > 10) {
        failures.push({
          field: `difficulty_profile.${dim}`,
          rule: 'range_1_10',
          message: `difficulty_profile.${dim} must be a number between 1 and 10 (got ${val})`,
        })
      }
    }
  } else {
    failures.push({
      field: 'difficulty_profile',
      rule: 'required',
      message: 'difficulty_profile is required',
    })
  }

  // 7. calibration_expectations has all 4 tiers
  if (bundle.calibration_expectations) {
    for (const tier of REQUIRED_CALIBRATION_TIERS) {
      const tierData = bundle.calibration_expectations[tier]
      if (!tierData) {
        failures.push({
          field: `calibration_expectations.${tier}`,
          rule: 'required_tier',
          message: `calibration_expectations.${tier} is required`,
        })
      } else {
        if (typeof tierData.min !== 'number' || typeof tierData.max !== 'number') {
          failures.push({
            field: `calibration_expectations.${tier}`,
            rule: 'min_max_required',
            message: `calibration_expectations.${tier} must have numeric min and max`,
          })
        } else if (tierData.min > tierData.max) {
          failures.push({
            field: `calibration_expectations.${tier}`,
            rule: 'min_lte_max',
            message: `calibration_expectations.${tier}.min (${tierData.min}) must be <= max (${tierData.max})`,
          })
        }
      }
    }
  } else {
    failures.push({
      field: 'calibration_expectations',
      rule: 'required',
      message: 'calibration_expectations is required',
    })
  }

  // 8. Each visible test has non-empty description and expected_output
  if (bundle.visible_tests) {
    bundle.visible_tests.forEach((test, idx) => {
      if (!test.description || test.description.trim().length === 0) {
        failures.push({
          field: `visible_tests[${idx}].description`,
          rule: 'non_empty',
          message: `visible_tests[${idx}].description must not be empty`,
        })
      }
      if (!test.expected_output || test.expected_output.trim().length === 0) {
        failures.push({
          field: `visible_tests[${idx}].expected_output`,
          rule: 'non_empty',
          message: `visible_tests[${idx}].expected_output must not be empty`,
        })
      }
    })
  }

  // 9. No null/undefined in critical fields
  const criticalFields: Array<keyof GauntletBundle> = [
    'bundle_id',
    'gauntlet_version',
    'generation_timestamp',
    'content_hash',
    'family',
    'weight_class',
    'format',
    'title',
    'public_description',
    'internal_brief',
  ]

  for (const field of criticalFields) {
    if (bundle[field] === null || bundle[field] === undefined) {
      failures.push({
        field,
        rule: 'not_null',
        message: `${field} must not be null or undefined`,
      })
    }
  }

  // ─── Warnings (non-blocking) ──────────────────────────────────────────────

  if (!bundle.adversarial_tests || bundle.adversarial_tests.length === 0) {
    warnings.push('adversarial_tests is empty — consider adding adversarial scenarios')
  }

  if (bundle.mutation_generation > 0 && !bundle.parent_bundle_id) {
    warnings.push('mutation_generation > 0 but parent_bundle_id is missing')
  }

  if (!bundle.freshness_score) {
    warnings.push('freshness_score not provided — contamination check may be incomplete')
  }

  const avgDifficulty = bundle.difficulty_profile
    ? REQUIRED_DIFFICULTY_DIMENSIONS.reduce(
        (sum, dim) => sum + (bundle.difficulty_profile[dim] ?? 0),
        0
      ) / REQUIRED_DIFFICULTY_DIMENSIONS.length
    : 0

  if (avgDifficulty < 3) {
    warnings.push(`Average difficulty score is low (${avgDifficulty.toFixed(1)}) — verify this is intentional`)
  }

  return {
    passed: failures.length === 0,
    failures,
    warnings,
  }
}
