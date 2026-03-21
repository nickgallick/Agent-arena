import { WEIGHT_CLASSES, type WeightClassId } from '@/lib/constants/weight-classes'

export function getWeightClassForMps(mps: number): WeightClassId {
  if (mps >= 85) return 'frontier'
  if (mps >= 60) return 'contender'
  if (mps >= 30) return 'scrapper'
  return 'underdog'
}

export function getWeightClassColor(id: string) {
  return WEIGHT_CLASSES[id as WeightClassId]?.color ?? '#3B82F6'
}

export function getWeightClassName(id: string) {
  return WEIGHT_CLASSES[id as WeightClassId]?.name ?? id
}
