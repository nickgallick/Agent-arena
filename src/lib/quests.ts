/**
 * Quest progress evaluation.
 *
 * Quests are time-limited objectives that reward agents with bonus XP.
 * Daily quests refresh every 24 hours; this module defines the default
 * quest pool and evaluates progress against agent activity.
 */

export interface Quest {
  id: string
  type: QuestType
  title: string
  description: string
  targetCount: number
  xpReward: number
}

export type QuestType =
  | 'enter_challenge'
  | 'win_battle'
  | 'earn_xp'
  | 'submit_solution'
  | 'spectate'

export interface AgentActivity {
  challengesEntered: number
  wins: number
  xpEarned: number
  submissionsMade: number
  spectated: number
}

/**
 * Full pool of possible daily quests. The default selection rotates
 * through these based on the day.
 */
const QUEST_POOL: Quest[] = [
  {
    id: 'daily_enter_1',
    type: 'enter_challenge',
    title: 'Ready for Action',
    description: 'Enter 1 challenge today',
    targetCount: 1,
    xpReward: 50,
  },
  {
    id: 'daily_enter_3',
    type: 'enter_challenge',
    title: 'Triple Threat',
    description: 'Enter 3 challenges today',
    targetCount: 3,
    xpReward: 150,
  },
  {
    id: 'daily_win_1',
    type: 'win_battle',
    title: 'Victory Lap',
    description: 'Win 1 battle today',
    targetCount: 1,
    xpReward: 100,
  },
  {
    id: 'daily_win_3',
    type: 'win_battle',
    title: 'Winning Streak',
    description: 'Win 3 battles today',
    targetCount: 3,
    xpReward: 300,
  },
  {
    id: 'daily_xp_100',
    type: 'earn_xp',
    title: 'XP Grinder',
    description: 'Earn 100 XP today',
    targetCount: 100,
    xpReward: 75,
  },
  {
    id: 'daily_xp_500',
    type: 'earn_xp',
    title: 'XP Marathon',
    description: 'Earn 500 XP today',
    targetCount: 500,
    xpReward: 200,
  },
  {
    id: 'daily_submit_3',
    type: 'submit_solution',
    title: 'Prolific Coder',
    description: 'Submit 3 solutions today',
    targetCount: 3,
    xpReward: 100,
  },
  {
    id: 'daily_submit_5',
    type: 'submit_solution',
    title: 'Machine Output',
    description: 'Submit 5 solutions today',
    targetCount: 5,
    xpReward: 175,
  },
  {
    id: 'daily_spectate_1',
    type: 'spectate',
    title: 'Curious Observer',
    description: 'Spectate 1 live match',
    targetCount: 1,
    xpReward: 25,
  },
  {
    id: 'daily_spectate_3',
    type: 'spectate',
    title: 'Arena Fan',
    description: 'Spectate 3 live matches',
    targetCount: 3,
    xpReward: 75,
  },
]

/**
 * Returns 3-5 daily quests based on the current date.
 *
 * Uses a deterministic rotation so every agent sees the same quests
 * on a given day, but the selection changes daily.
 */
export function getDefaultDailyQuests(): Quest[] {
  // Use day-of-year as a seed for deterministic rotation
  const now = new Date()
  const startOfYear = new Date(now.getFullYear(), 0, 0)
  const dayOfYear = Math.floor(
    (now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24),
  )

  // Select 4 quests via rotation, ensuring variety across types
  const questsByType = new Map<QuestType, Quest[]>()
  for (const q of QUEST_POOL) {
    const list = questsByType.get(q.type) ?? []
    list.push(q)
    questsByType.set(q.type, list)
  }

  const types: QuestType[] = [
    'enter_challenge',
    'win_battle',
    'earn_xp',
    'submit_solution',
    'spectate',
  ]

  const selected: Quest[] = []
  for (let i = 0; i < types.length && selected.length < 4; i++) {
    const typeIndex = (dayOfYear + i) % types.length
    const type = types[typeIndex]
    const candidates = questsByType.get(type) ?? []
    if (candidates.length === 0) continue
    const pick = candidates[dayOfYear % candidates.length]
    // Avoid duplicates
    if (!selected.some((q) => q.id === pick.id)) {
      selected.push(pick)
    }
  }

  // Ensure at least 3 quests
  if (selected.length < 3) {
    for (const q of QUEST_POOL) {
      if (!selected.some((s) => s.id === q.id)) {
        selected.push(q)
        if (selected.length >= 3) break
      }
    }
  }

  return selected
}

/**
 * Evaluate current progress toward a specific quest objective.
 *
 * @param questType    The type of quest being evaluated
 * @param targetCount  The goal amount for completion
 * @param agentActivity  The agent's activity for the current period
 * @returns            Current progress count (capped at targetCount)
 */
export function evaluateQuestProgress(
  questType: string,
  targetCount: number,
  agentActivity: AgentActivity,
): number {
  let current: number

  switch (questType) {
    case 'enter_challenge':
      current = agentActivity.challengesEntered
      break
    case 'win_battle':
      current = agentActivity.wins
      break
    case 'earn_xp':
      current = agentActivity.xpEarned
      break
    case 'submit_solution':
      current = agentActivity.submissionsMade
      break
    case 'spectate':
      current = agentActivity.spectated
      break
    default:
      current = 0
  }

  // Cap at target so progress never exceeds 100%
  return Math.min(current, targetCount)
}
