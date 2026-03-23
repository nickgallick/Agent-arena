/**
 * Badge evaluation logic.
 *
 * Badges are awarded based on agent stats thresholds. This module
 * evaluates which badges an agent qualifies for given their current
 * statistics snapshot.
 */

/** Tier ranking for comparison. Higher index = higher tier. */
const TIER_RANK: Record<string, number> = {
  bronze: 0,
  silver: 1,
  gold: 2,
  platinum: 3,
  diamond: 4,
  champion: 5,
}

interface AgentStats {
  wins: number
  losses: number
  draws: number
  currentStreak: number
  bestStreak: number
  challengesCompleted: number
  level: number
  xp: number
  tier: string
  categoryStats: Record<string, number>
}

interface BadgeCriteria {
  name: string
  check: (stats: AgentStats) => boolean
}

/**
 * Badge definitions with their qualification criteria.
 *
 * Each badge has a human-readable name and a predicate that returns
 * true when the agent meets the requirement.
 */
const BADGE_DEFINITIONS: BadgeCriteria[] = [
  {
    name: 'First Blood',
    check: (stats) => stats.wins >= 1,
  },
  {
    name: 'Speed Demon',
    check: (stats) => (stats.categoryStats['speed_build'] ?? 0) >= 10,
  },
  {
    name: 'Hat Trick',
    check: (stats) => stats.currentStreak >= 3,
  },
  {
    name: 'Iron Streak',
    check: (stats) => stats.bestStreak >= 30,
  },
  {
    name: 'Code Golfer',
    check: (stats) => (stats.categoryStats['code_golf'] ?? 0) >= 1,
  },
  {
    name: 'Bug Squasher',
    check: (stats) => (stats.categoryStats['debug'] ?? 0) >= 1,
  },
  {
    name: 'Researcher',
    check: (stats) => (stats.categoryStats['research'] ?? 0) >= 5,
  },
  {
    name: 'Contender Rising',
    check: (stats) => {
      const rank = TIER_RANK[stats.tier.toLowerCase()] ?? -1
      return rank >= TIER_RANK['gold']
    },
  },
  {
    name: 'Diamond Hands',
    check: (stats) => {
      const rank = TIER_RANK[stats.tier.toLowerCase()] ?? -1
      return rank >= TIER_RANK['diamond']
    },
  },
  // 'Social Butterfly' is intentionally omitted — it requires rival
  // count data that lives outside of AgentStats and is evaluated
  // separately by the caller.
]

/**
 * Evaluate which badges an agent currently qualifies for.
 *
 * @param agentStats  Current snapshot of the agent's stats
 * @returns           Array of badge names the agent has earned
 */
export function evaluateBadges(agentStats: AgentStats): string[] {
  const earned: string[] = []

  for (const badge of BADGE_DEFINITIONS) {
    if (badge.check(agentStats)) {
      earned.push(badge.name)
    }
  }

  return earned
}
