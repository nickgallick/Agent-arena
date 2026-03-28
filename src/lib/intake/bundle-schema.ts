import { z } from 'zod'

// ─────────────────────────────────────────────────────────────────────────────
// Test schemas
// ─────────────────────────────────────────────────────────────────────────────

const VisibleTestSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  input: z.string(),
  expected_output: z.string().min(1),
  scoring_weight: z.number().min(0).max(1),
})

const HiddenTestSchema = VisibleTestSchema.extend({
  is_hidden: z.literal(true),
})

const AdversarialTestSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  attack_vector: z.string().min(1),
  expected_failure_mode: z.string().min(1),
})

// ─────────────────────────────────────────────────────────────────────────────
// Judge weights: must sum to 100
// ─────────────────────────────────────────────────────────────────────────────

const JudgeWeightsSchema = z
  .object({
    objective: z.number().min(0).max(100),
    process: z.number().min(0).max(100),
    strategy: z.number().min(0).max(100),
    integrity: z.number().min(0).max(100),
  })
  .refine(
    (w) => {
      const sum = w.objective + w.process + w.strategy + w.integrity
      return Math.abs(sum - 100) <= 1
    },
    { message: 'judge_weights must sum to 100 (±1 for rounding)' }
  )

// ─────────────────────────────────────────────────────────────────────────────
// Difficulty profile: 8 named dimensions, each 1–10
// ─────────────────────────────────────────────────────────────────────────────

const DifficultyProfileSchema = z.object({
  reasoning_depth: z.number().min(1).max(10),
  tool_dependence: z.number().min(1).max(10),
  ambiguity: z.number().min(1).max(10),
  deception: z.number().min(1).max(10),
  time_pressure: z.number().min(1).max(10),
  error_recovery_burden: z.number().min(1).max(10),
  non_local_dependency: z.number().min(1).max(10),
  evaluation_strictness: z.number().min(1).max(10),
})

// ─────────────────────────────────────────────────────────────────────────────
// Evidence map: 4 lanes
// ─────────────────────────────────────────────────────────────────────────────

const EvidenceMapSchema = z.object({
  objective: z.array(z.string()).min(1),
  process: z.array(z.string()).min(1),
  strategy: z.array(z.string()).min(1),
  integrity: z.array(z.string()).min(1),
})

// ─────────────────────────────────────────────────────────────────────────────
// Calibration expectations: 4 tiers, each with min/max
// ─────────────────────────────────────────────────────────────────────────────

const CalibrationTierSchema = z.object({
  min: z.number().min(0).max(100),
  max: z.number().min(0).max(100),
}).refine(
  (t) => t.min <= t.max,
  { message: 'min must be <= max' }
)

const CalibrationExpectationsSchema = z.object({
  naive: CalibrationTierSchema,
  standard: CalibrationTierSchema,
  strong: CalibrationTierSchema,
  elite: CalibrationTierSchema,
})

// ─────────────────────────────────────────────────────────────────────────────
// Scoring rubric
// ─────────────────────────────────────────────────────────────────────────────

const ScoringRubricSchema = z.record(z.string(), z.unknown())

// ─────────────────────────────────────────────────────────────────────────────
// Main Gauntlet bundle schema
// ─────────────────────────────────────────────────────────────────────────────

export const GauntletBundleSchema = z.object({
  // Identity
  bundle_id: z.string().min(1),
  gauntlet_version: z.string().min(1),
  generation_timestamp: z.string().datetime(),
  content_hash: z.string().length(64).regex(/^[0-9a-f]{64}$/i, 'must be 64-char hex string'),

  // Classification
  family: z.enum([
    'blacksite_debug',
    'fog_of_war',
    'false_summit',
    'recovery_spiral',
    'toolchain_betrayal',
    'abyss_protocol',
  ]),
  weight_class: z.enum(['lightweight', 'middleweight', 'heavyweight', 'frontier']),
  format: z.enum(['sprint', 'standard', 'marathon']),

  // Content
  title: z.string().min(1).max(200),
  public_description: z.string().min(1).max(2000),
  internal_brief: z.string().min(1),
  prompt: z.string().min(1),
  starter_state: z.record(z.string(), z.unknown()).optional(),

  // Tests
  visible_tests: z.array(VisibleTestSchema).min(3),
  hidden_tests: z.array(HiddenTestSchema).min(2),
  adversarial_tests: z.array(AdversarialTestSchema).default([]),

  // Scoring
  judge_weights: JudgeWeightsSchema,
  scoring_rubric: ScoringRubricSchema,
  evidence_map: EvidenceMapSchema,
  failure_mode_targets: z.array(z.string()).default([]),

  // Difficulty
  difficulty_profile: DifficultyProfileSchema,
  calibration_expectations: CalibrationExpectationsSchema,

  // Freshness / mutation
  contamination_notes: z.string().optional(),
  freshness_score: z.number().min(0).max(1).optional(),
  parent_bundle_id: z.string().optional(),
  mutation_generation: z.number().int().min(0).default(0),
  mutation_type: z.string().optional(),
  lineage: z.array(z.string()).optional(),

  // Publish recommendation from Gauntlet
  publish_recommendation: z.enum(['publish', 'hold', 'mutate', 'reject']).default('hold'),

  // Assets
  asset_references: z.array(z.record(z.string(), z.unknown())).default([]),
})

export type GauntletBundle = z.infer<typeof GauntletBundleSchema>
export type VisibleTest = z.infer<typeof VisibleTestSchema>
export type HiddenTest = z.infer<typeof HiddenTestSchema>
export type AdversarialTest = z.infer<typeof AdversarialTestSchema>
export type JudgeWeights = z.infer<typeof JudgeWeightsSchema>
export type DifficultyProfile = z.infer<typeof DifficultyProfileSchema>
export type EvidenceMap = z.infer<typeof EvidenceMapSchema>
export type CalibrationExpectations = z.infer<typeof CalibrationExpectationsSchema>
