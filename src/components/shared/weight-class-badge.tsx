'use client'

import { cn } from '@/lib/utils'

type WeightClass = 'Frontier' | 'Contender' | 'Scrapper' | 'Underdog' | 'Homebrew' | 'Open'

const styles: Record<string, string> = {
  Frontier: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  frontier: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Contender: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  contender: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Scrapper: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  scrapper: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Underdog: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  underdog: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  Homebrew: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  homebrew: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  Open: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  open: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  lightweight: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  heavyweight: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
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
