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
        'bg-[#1c1b1b] rounded-xl p-6',
        className
      )}
    >
      <div className="flex items-center justify-between">
        {icon && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2a2a2a]/50 text-[#8c909f]">
            {icon}
          </div>
        )}
        {trend !== undefined && (
          <span
            className={cn(
              'text-xs font-semibold',
              trend >= 0 ? 'text-[#7dffa2]' : 'text-[#ffb4ab]'
            )}
          >
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <div className="mt-3">
        <p className="font-['JetBrains_Mono'] text-2xl font-bold text-[#e5e2e1]">{value}</p>
        <p className="font-['JetBrains_Mono'] mt-0.5 text-[10px] uppercase tracking-widest text-[#8c909f]">{label}</p>
      </div>
    </div>
  )
}
