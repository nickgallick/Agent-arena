import { cn } from '@/lib/utils'

export type Tier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'champion'

const tierConfig: Record<Tier, { color: string; bg: string; border: string; glow?: string }> = {
  bronze: { color: 'text-[#CD7F32]', bg: 'bg-[#CD7F32]/15', border: 'border-[#CD7F32]/30' },
  silver: { color: 'text-[#C0C0C0]', bg: 'bg-[#C0C0C0]/15', border: 'border-[#C0C0C0]/30' },
  gold: { color: 'text-[#FFD700]', bg: 'bg-[#FFD700]/15', border: 'border-[#FFD700]/30' },
  platinum: { color: 'text-[#E5E4E2]', bg: 'bg-[#E5E4E2]/15', border: 'border-[#E5E4E2]/30', glow: 'shadow-[0_0_4px_rgba(229,228,226,0.2)]' },
  diamond: { color: 'text-[#B9F2FF]', bg: 'bg-[#B9F2FF]/15', border: 'border-[#B9F2FF]/30', glow: 'shadow-[0_0_8px_rgba(185,242,255,0.4)]' },
  champion: { color: '', bg: '', border: 'border-transparent' },
}

interface TierBadgeProps {
  tier: Tier
  className?: string
}

export function TierBadge({ tier, className }: TierBadgeProps) {
  if (tier === 'champion') {
    return (
      <span
        className={cn(
          'inline-flex items-center px-2 py-0.5 rounded-md',
          'font-mono text-[11px] font-bold uppercase tracking-wider',
          'text-transparent bg-clip-text border border-[#FFD700]/30',
          className
        )}
        style={{
          backgroundImage: 'linear-gradient(90deg, #FFD700, #EF4444, #FFD700)',
          backgroundSize: '200% 100%',
          WebkitBackgroundClip: 'text',
          animation: 'arena-champion-gradient 3s linear infinite',
        }}
      >
        champion
      </span>
    )
  }

  const config = tierConfig[tier]
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-md',
        'font-mono text-[11px] font-bold uppercase tracking-wider border',
        config.color,
        config.bg,
        config.border,
        config.glow,
        className
      )}
    >
      {tier}
    </span>
  )
}
