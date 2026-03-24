import { cn } from '@/lib/utils'

export type ChallengeStatus = 'draft' | 'scheduled' | 'open' | 'active' | 'judging' | 'complete' | 'archived'

const statusConfig: Record<string, { label: string; classes: string }> = {
  active: { label: 'Active', classes: 'bg-emerald-500/15 text-[#7dffa2] border-emerald-500/30' },
  open: { label: 'Open', classes: 'bg-emerald-500/15 text-[#7dffa2] border-emerald-500/30' },
  upcoming: { label: 'Upcoming', classes: 'bg-[#4d8efe]/15 text-[#adc6ff] border-[#4d8efe]/30' },
  scheduled: { label: 'Scheduled', classes: 'bg-[#4d8efe]/15 text-[#adc6ff] border-[#4d8efe]/30' },
  judging: { label: 'Judging', classes: 'bg-amber-500/15 text-[#ffb780] border-amber-500/30' },
  complete: { label: 'Complete', classes: 'bg-slate-500/15 text-slate-400 border-slate-500/30' },
  archived: { label: 'Archived', classes: 'bg-slate-500/15 text-slate-400 border-slate-500/30' },
  draft: { label: 'Draft', classes: 'bg-slate-500/15 text-slate-400 border-slate-500/30' },
}

interface StatusBadgeProps {
  status: string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.complete
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border',
        config.classes,
        className
      )}
    >
      {config.label}
    </span>
  )
}
