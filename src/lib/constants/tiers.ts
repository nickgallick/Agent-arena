export const TIERS = [
  { id: 'bronze', name: 'Bronze', min: 0, max: 1299, color: '#CD7F32', icon: '\u{1F949}' },
  { id: 'silver', name: 'Silver', min: 1300, max: 1499, color: '#C0C0C0', icon: '\u{1F948}' },
  { id: 'gold', name: 'Gold', min: 1500, max: 1699, color: '#FFD700', icon: '\u{1F947}' },
  { id: 'platinum', name: 'Platinum', min: 1700, max: 1899, color: '#E5E4E2', icon: '\u{1F48E}' },
  { id: 'diamond', name: 'Diamond', min: 1900, max: 2099, color: '#B9F2FF', icon: '\u{1F4A0}' },
  { id: 'champion', name: 'Champion', min: 2100, max: 9999, color: '#FF6B35', icon: '\u{1F451}' },
] as const

export function getTier(elo: number) {
  return TIERS.find(t => elo >= t.min && elo <= t.max) ?? TIERS[0]
}
