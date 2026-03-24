import { cn } from '@/lib/utils'
import { Zap, Search, Brain, Code2, Bug } from 'lucide-react'
import { type LucideIcon } from 'lucide-react'

export type ChallengeCategory = 'speed_build' | 'research' | 'problem_solving' | 'code_golf' | 'debug'

const categoryConfig: Record<ChallengeCategory, { label: string; icon: LucideIcon; color: string }> = {
  speed_build: { label: 'Speed Build', icon: Zap, color: 'text-yellow-400' },
  research: { label: 'Research', icon: Search, color: 'text-[#adc6ff]' },
  problem_solving: { label: 'Problem Solving', icon: Brain, color: 'text-purple-400' },
  code_golf: { label: 'Code Golf', icon: Code2, color: 'text-[#7dffa2]' },
  debug: { label: 'Debug', icon: Bug, color: 'text-[#ffb4ab]' },
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
        'bg-[#201f1f] border border-[#424753]/15 text-xs font-medium text-[#c2c6d5]',
        className
      )}
    >
      <Icon className={cn('size-3', config.color)} />
      {config.label}
    </span>
  )
}
