/**
 * ELO rating calculations with K-factor scaling and weight class floors.
 *
 * Uses a Glicko-2 inspired approach where placement in a multi-agent
 * challenge is decomposed into pairwise comparisons against every other
 * entrant, then averaged to produce a single rating update.
 */

/** ELO floor per weight class — agents cannot drop below this rating. */
const WEIGHT_CLASS_FLOORS: Record<string, number> = {
  frontier: 1000,
  contender: 900,
  scrapper: 800,
  underdog: 700,
  homebrew: 600,
  open: 500,
}

/**
 * Returns the ELO floor for a given weight class.
 * Falls back to 500 (open) for unknown classes.
 */
export function getEloFloor(weightClass: string): number {
  return WEIGHT_CLASS_FLOORS[weightClass] ?? 500
}

/**
 * K-factor determines rating volatility.
 * New agents (few games) move faster; experienced agents move slower.
 */
export function getKFactor(totalGames: number): number {
  if (totalGames < 10) return 64
  if (totalGames < 30) return 40
  return 24
}

/**
 * Standard expected score using the logistic curve.
 * Returns a value between 0 and 1 representing the probability
 * that `playerElo` beats `opponentElo`.
 */
export function calculateExpectedScore(
  playerElo: number,
  opponentElo: number,
): number {
  return 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400))
}

/**
 * Calculates the ELO change after a challenge, treating the multi-agent
 * competition as a series of pairwise matchups.
 *
 * `placement` is 1-indexed (1 = first place).
 * Each position above the player counts as a loss, each below as a win,
 * and ties (same position) are not considered here.
 *
 * The average expected score against a hypothetical field of agents at
 * `currentElo` is used as the opponent baseline (self-anchored), which
 * is the standard simplification when individual opponent ratings aren't
 * available at scoring time.
 *
 * @param currentElo   Agent's current ELO rating
 * @param placement    Finishing position (1 = first)
 * @param totalEntries Total agents in the challenge
 * @param totalGames   Agent's lifetime game count (for K-factor)
 * @param eloFloor     Minimum rating the agent can have
 * @returns            New ELO and the signed change
 */
export function calculateEloChange(
  currentElo: number,
  placement: number,
  totalEntries: number,
  totalGames: number,
  eloFloor: number,
): { newElo: number; change: number } {
  // Edge case: solo entry — no change
  if (totalEntries <= 1) {
    return { newElo: currentElo, change: 0 }
  }

  const k = getKFactor(totalGames)

  // Actual score: proportion of opponents beaten.
  // 1st place beats everyone → score = 1
  // Last place beats nobody  → score = 0
  const actualScore = (totalEntries - placement) / (totalEntries - 1)

  // Expected score against the field: we model each opponent as having
  // the same rating as the player (0.5 expected per matchup). In a real
  // deployment with known opponent ratings you'd sum pairwise expected
  // scores and divide by (totalEntries - 1).
  const expectedScore = 0.5

  const change = Math.round(k * (actualScore - expectedScore))
  const newElo = Math.max(eloFloor, currentElo + change)

  return {
    newElo,
    change: newElo - currentElo,
  }
}
