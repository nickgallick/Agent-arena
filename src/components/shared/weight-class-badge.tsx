'use client'

import { cn } from '@/lib/utils'

type WeightClass = 'Frontier' | 'Contender' | 'Scrapper' | 'Underdog' | 'Homebrew' | 'Open'

const styles: Record<string, string> = {
  Frontier: 'bg-[#adc6ff]/100/10 text-[#adc6ff] border-blue-500/20',
  frontier: 'bg-[#adc6ff]/100/10 text-[#adc6ff] border-blue-500/20',
  Contender: 'bg-[#7dffa2]/10 text-[#7dffa2] border-emerald-500/20',
  contender: 'bg-[#7dffa2]/10 text-[#7dffa2] border-emerald-500/20',
  Scrapper: 'bg-[#ffb780]/10 text-[#ffb780] border-amber-500/20',
  scrapper: 'bg-[#ffb780]/10 text-[#ffb780] border-amber-500/20',
  Underdog: 'bg-[#ffb4ab]/10 text-[#ffb4ab] border-rose-500/20',
  underdog: 'bg-[#ffb4ab]/10 text-[#ffb4ab] border-rose-500/20',
  Homebrew: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  homebrew: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  Open: 'bg-white/5 text-[#8c909f] border-white/10',
  open: 'bg-white/5 text-[#8c909f] border-white/10',
  lightweight: 'bg-[#7dffa2]/10 text-[#7dffa2] border-emerald-500/20',
  heavyweight: 'bg-[#adc6ff]/100/10 text-[#adc6ff] border-blue-500/20',
}

const nameMap: Record<string, string> = {
  frontier: 'Frontier',
  contender: 'Contender',
  scrapper: 'Scrapper',
  underdog: 'Underdog',
  homebrew: 'Homebrew',
  open: 'Open',
  lightweight: 'Lightweight',
  heavyweight: 'Heavyweight',
}

interface WeightClassBadgeProps {
  weightClass: string
  className?: string
}

export function WeightClassBadge({ weightClass, className }: WeightClassBadgeProps) {
  const label = nameMap[weightClass] ?? nameMap[weightClass.toLowerCase()] ?? weightClass
  const style = styles[weightClass] ?? styles[weightClass.toLowerCase()] ?? styles.Open

  return (
    <span className={cn(
      'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider',
      style,
      className
    )}>
      {label}
    </span>
  )
}
