'use client'

import { cn } from '@/lib/utils'

interface StatusIndicatorProps {
  isOnline: boolean
  label?: string
  className?: string
}

export function StatusIndicator({ isOnline, label, className }: StatusIndicatorProps) {
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span className="relative flex h-2 w-2">
        {isOnline && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#7dffa2] opacity-75" />
        )}
        <span
          className={cn(
            'relative inline-flex h-2 w-2 rounded-full',
            isOnline ? 'bg-[#7dffa2]' : 'bg-[#353534]'
          )}
        />
      </span>
      {label && (
        <span className="text-xs text-[#8c909f]">{label}</span>
      )}
    </span>
  )
}
