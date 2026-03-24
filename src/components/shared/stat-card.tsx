'use client'

import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface StatCardProps {
  value: string | number
  label: string
  icon?: ReactNode
  trend?: number
  className?: string
}

export function StatCard({ value, label, icon, trend, className }: StatCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-[#424753]/15 bg-[#201f1f]/50 p-4',
        className
      )}
    >
      <div className="flex items-center justify-between">
        {icon && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-700/50 text-[#8c909f]">
            {icon}
          </div>
        )}
        {trend !== undefined && (
          <span
            className={cn(
              'text-xs font-semibold',
              trend >= 0 ? 'text-[#7dffa2]' : 'text-red-400'
            )}
          >
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <div className="mt-3">
        <p className="text-2xl font-bold tracking-tight text-[#e5e2e1]">{value}</p>
        <p className="mt-0.5 text-sm text-[#8c909f]">{label}</p>
      </div>
    </div>
  )
}
