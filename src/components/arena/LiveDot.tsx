import { cn } from '@/lib/utils'

interface LiveDotProps {
  className?: string
}

export function LiveDot({ className }: LiveDotProps) {
  return <span className={cn('arena-live-dot inline-block', className)} aria-label="Live" />
}

export function LivePulse({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('arena-live-pulse', className)}>{children}</div>
}
