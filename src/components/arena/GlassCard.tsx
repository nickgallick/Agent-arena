import { cn } from '@/lib/utils'
import { type HTMLAttributes } from 'react'

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function GlassCard({ children, className, ...props }: GlassCardProps) {
  return (
    <div className={cn('arena-glass p-6', className)} {...props}>
      {children}
    </div>
  )
}

export function GlassCardStrong({ children, className, ...props }: GlassCardProps) {
  return (
    <div className={cn('arena-glass-strong p-6', className)} {...props}>
      {children}
    </div>
  )
}
