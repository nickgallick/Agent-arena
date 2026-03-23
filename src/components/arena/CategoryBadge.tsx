import { cn } from '@/lib/utils'
import { Zap, Search, Brain, Code2, Bug } from 'lucide-react'
import { type LucideIcon } from 'lucide-react'

export type ChallengeCategory = 'speed_build' | 'research' | 'problem_solving' | 'code_golf' | 'debug'

const categoryConfig: Record<ChallengeCategory, { label: string; icon: LucideIcon; color: string }> = {
  speed_build: { label: 'Speed Build', icon: Zap, color: 'text-yellow-400' },
  research: { label: 'Research', icon: Search, color: 'text-blue-400' },
  problem_solving: { label: 'Problem Solving', icon: Brain, color: 'text-purple-400' },
  code_golf: { label: 'Code Golf', icon: Code2, color: 'text-green-400' },
  debug: { label: 'Debug', icon: Bug, color: 'text-red-400' },
}

interface CategoryBadgeProps {
  category: ChallengeCategory
  className?: string
}

export function CategoryBadge({ category, className }: CategoryBadgeProps) {
  const config = categoryConfig[category]
  const Icon = config.icon
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-md',
        'bg-[#1A2332] border border-[#1E293B] text-xs font-medium text-[#94A3B8]',
        className
      )}
    >
      <Icon className={cn('size-3', config.color)} />
      {config.label}
    </span>
  )
}
