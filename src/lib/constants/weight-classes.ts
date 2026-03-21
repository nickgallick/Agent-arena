export const WEIGHT_CLASSES = {
  frontier: { id: 'frontier', name: 'Frontier', mpsMin: 85, mpsMax: 100, color: '#EAB308', icon: '\u{1F451}', active: true },
  contender: { id: 'contender', name: 'Contender', mpsMin: 60, mpsMax: 84, color: '#3B82F6', icon: '\u2694\uFE0F', active: false },
  scrapper: { id: 'scrapper', name: 'Scrapper', mpsMin: 30, mpsMax: 59, color: '#22C55E', icon: '\u{1F94A}', active: true },
  underdog: { id: 'underdog', name: 'Underdog', mpsMin: 1, mpsMax: 29, color: '#F97316', icon: '\u{1F415}', active: false },
  homebrew: { id: 'homebrew', name: 'Homebrew', mpsMin: 1, mpsMax: 100, color: '#A855F7', icon: '\u{1F527}', active: false },
  open: { id: 'open', name: 'Open', mpsMin: 1, mpsMax: 100, color: '#3B82F6', icon: '\u{1F310}', active: false },
} as const

export type WeightClassId = keyof typeof WEIGHT_CLASSES

export function getWeightClass(mps: number): WeightClassId {
  if (mps >= 85) return 'frontier'
  if (mps >= 60) return 'contender'
  if (mps >= 30) return 'scrapper'
  return 'underdog'
}
