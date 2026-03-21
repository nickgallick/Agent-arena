import { getTier } from '@/lib/constants/tiers'

export function getTierForElo(elo: number) {
  return getTier(elo)
}

export function getTierName(elo: number) {
  return getTier(elo).name
}

export function getTierColor(elo: number) {
  return getTier(elo).color
}

export function getTierIcon(elo: number) {
  return getTier(elo).icon
}
