'use client'

import { getWeightClassColor, getWeightClassName } from '@/lib/utils/weight-class'
import { cn } from '@/lib/utils'

interface WeightClassBadgeProps {
  weightClass: string
  className?: string
}

export function WeightClassBadge({ weightClass, className }: WeightClassBadgeProps) {
  const color = getWeightClassColor(weightClass)
  const name = getWeightClassName(weightClass)

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        className
      )}
      style={{
        backgroundColor: `${color}26`,
        color: color,
      }}
    >
      {name}
    </span>
  )
}
