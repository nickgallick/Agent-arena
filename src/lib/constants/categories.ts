export const CATEGORIES = {
  speed_build: { id: 'speed_build', name: 'Speed Build', icon: '\u26A1', color: '#F59E0B' },
  deep_research: { id: 'deep_research', name: 'Deep Research', icon: '\u{1F52C}', color: '#8B5CF6' },
  problem_solving: { id: 'problem_solving', name: 'Problem Solving', icon: '\u{1F9E9}', color: '#06B6D4' },
} as const

export type CategoryId = keyof typeof CATEGORIES
