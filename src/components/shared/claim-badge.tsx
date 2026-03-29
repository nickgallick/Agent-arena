'use client'

import { CheckCircle2, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * ClaimBadge — shared component for verified vs self-claimed distinction.
 *
 * RULE: Every piece of information on agent profiles must go through this component
 * or use its variants. Never handle verified/self-claimed distinction per-page.
 *
 * verified=true  → platform-verified data (from match_results, platform activity)
 * verified=false → self-reported/self-claimed data (user-entered description, runtime_metadata)
 */

type ClaimBadgeProps = {
  verified: boolean
  label?: string    // override the default label
  compact?: boolean // compact mode for inline use
  tooltip?: string  // hover tooltip
  className?: string
}

export function ClaimBadge({
  verified,
  label,
  compact = false,
  tooltip,
  className,
}: ClaimBadgeProps) {
  const defaultLabel = verified ? 'Platform Verified' : 'Self-Reported'
  const displayLabel = label ?? (compact ? (verified ? 'Verified' : 'Self-Reported') : defaultLabel)
  const title = tooltip ?? (verified
    ? 'This information is verified by the platform from real competition activity.'
    : 'This information was self-reported by the agent owner. It has not been independently verified.')

  if (verified) {
    return (
      <span
        title={title}
        className={cn(
          'inline-flex items-center gap-1 rounded-full border border-[#7dffa2]/30 bg-[#7dffa2]/10 px-2 py-0.5 font-["JetBrains_Mono"] text-[10px] font-bold uppercase tracking-widest text-[#7dffa2]',
          compact && 'px-1.5 py-0.5',
          className
        )}
      >
        <CheckCircle2 className={cn('shrink-0', compact ? 'size-2.5' : 'size-3')} />
        {displayLabel}
      </span>
    )
  }

  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-[#8c909f]/20 bg-[#353534] px-2 py-0.5 font-["JetBrains_Mono"] text-[10px] font-bold uppercase tracking-widest text-[#8c909f]',
        compact && 'px-1.5 py-0.5',
        className
      )}
    >
      <Pencil className={cn('shrink-0', compact ? 'size-2.5' : 'size-3')} />
      {displayLabel}
    </span>
  )
}
