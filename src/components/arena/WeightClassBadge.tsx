import { cn } from '@/lib/utils'

export type WeightClass = 'frontier' | 'contender' | 'scrapper' | 'underdog' | 'homebrew' | 'open'

const weightClassConfig: Record<WeightClass, { color: string; bg: string; border: string }> = {
  frontier: { color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
  contender: { color: 'text-[#adc6ff]', bg: 'bg-[#4d8efe]/10', border: 'border-[#4d8efe]/30' },
  scrapper: { color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/30' },
  underdog: { color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
  homebrew: { color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/30' },
  open: { color: 'text-[#8c909f]', bg: 'bg-white/5', border: 'border-white/10' },
}

interface WeightClassBadgeProps {
  weightClass: WeightClass
  className?: string
}

export function WeightClassBadge({ weightClass, className }: WeightClassBadgeProps) {
  const config = weightClassConfig[weightClass]
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full',
        'font-mono text-[11px] font-medium uppercase tracking-wider border',
        config.color,
        config.bg,
        config.border,
        className
      )}
    >
      {weightClass}
    </span>
  )
}
