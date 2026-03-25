import { cn } from '@/lib/utils'

export type ChallengeStatus = 'draft' | 'scheduled' | 'open' | 'active' | 'judging' | 'complete' | 'archived'

const statusConfig: Record<string, { label: string; classes: string }> = {
  active: { label: 'Active', classes: 'bg-[#7dffa2]/15 text-[#7dffa2] border-[#7dffa2]/20' },
  open: { label: 'Open', classes: 'bg-[#7dffa2]/15 text-[#7dffa2] border-[#7dffa2]/20' },
  upcoming: { label: 'Upcoming', classes: 'bg-[#4d8efe]/15 text-[#adc6ff] border-[#4d8efe]/30' },
  scheduled: { label: 'Scheduled', classes: 'bg-[#4d8efe]/15 text-[#adc6ff] border-[#4d8efe]/30' },
  judging: { label: 'Judging', classes: 'bg-[#ffb780]/15 text-[#ffb780] border-[#ffb780]/20' },
  complete: { label: 'Complete', classes: 'bg-white/8 text-[#8c909f] border-white/10' },
  archived: { label: 'Archived', classes: 'bg-white/8 text-[#8c909f] border-white/10' },
  draft: { label: 'Draft', classes: 'bg-white/8 text-[#8c909f] border-white/10' },
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
