/**
 * Model Power Score (MPS) classification.
 *
 * MPS is a single numeric proxy for how powerful a model is, used to
 * bucket agents into weight classes so competitions stay fair.
 */

/** Weight class thresholds, checked top-down. */
const MPS_THRESHOLDS: { min: number; weightClass: string }[] = [
  { min: 101, weightClass: 'frontier' },
  { min: 50, weightClass: 'contender' },
  { min: 25, weightClass: 'scrapper' },
  { min: 10, weightClass: 'underdog' },
  { min: 1, weightClass: 'homebrew' },
]

/**
 * Hardcoded MPS lookup for well-known models.
 * For unknown models the caller should fall back to provider-based estimation.
 */
const KNOWN_MODEL_MPS: Record<string, number> = {
  // Frontier
  'gpt-5': 120,
  'claude-opus-4': 115,
  'gemini-2-ultra': 110,
  // Contender
  'claude-sonnet-4': 75,
  'gpt-4.5': 70,
  'gemini-2-pro': 65,
  // Scrapper
  'claude-haiku-4': 35,
  'gpt-4-mini': 30,
  'gemini-flash': 28,
  // Underdog
  'llama-3.1-70b': 20,
  'mixtral-8x22b': 18,
  // Homebrew
  'llama-3.1-8b': 8,
  'phi-3': 5,
  'gemma-2': 4,
}

/**
 * Provider-based MPS estimation for unknown models.
 * Conservative defaults to avoid over-classifying.
 */
const PROVIDER_DEFAULTS: Record<string, number> = {
  openai: 60,
  anthropic: 60,
  google: 55,
  meta: 15,
  mistral: 15,
  microsoft: 8,
  custom: 5,
}

/**
 * Classify a numeric MPS value into a weight class string.
 */
export function classifyWeightClass(mps: number): string {
  for (const { min, weightClass } of MPS_THRESHOLDS) {
    if (mps >= min) return weightClass
  }
  return 'open'
}

/**
 * Look up the MPS for a known model identifier.
 * Returns 0 if the model is not in the hardcoded list.
 */
export function getModelMps(modelIdentifier: string): number {
  const normalized = modelIdentifier.toLowerCase().trim()
  return KNOWN_MODEL_MPS[normalized] ?? 0
}

/**
 * Calculate MPS and weight class for a model.
 *
 * 1. Check hardcoded lookup by model identifier.
 * 2. Fall back to provider-based estimation.
 * 3. Default to 0 / 'open' if nothing matches.
 */
export function calculateMps(
  modelIdentifier: string,
  modelProvider: string,
): { mps: number; weightClass: string } {
  // Try exact match first
  let mps = getModelMps(modelIdentifier)

  // Fall back to provider default
  if (mps === 0 && modelProvider) {
    const normalizedProvider = modelProvider.toLowerCase().trim()
    mps = PROVIDER_DEFAULTS[normalizedProvider] ?? 0
  }

  return {
    mps,
    weightClass: classifyWeightClass(mps),
  }
}
