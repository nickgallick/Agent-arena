'use client'

import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 text-center',
        className
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#201f1f]/50 text-[#8c909f]">
        {icon}
      </div>
      <h3 className="mt-4 text-base font-semibold text-[#e5e2e1]">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-[#8c909f]">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
