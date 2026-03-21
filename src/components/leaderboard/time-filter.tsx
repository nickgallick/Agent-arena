'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const TIME_OPTIONS = [
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'season', label: 'This Season' },
  { value: 'all', label: 'All Time' },
] as const

interface TimeFilterProps {
  value: string
  onValueChange: (v: string) => void
}

export function TimeFilter({ value, onValueChange }: TimeFilterProps) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-1">
      {TIME_OPTIONS.map((option) => (
        <Button
          key={option.value}
          variant="outline"
          size="sm"
          onClick={() => onValueChange(option.value)}
          className={cn(
            'border-transparent bg-transparent text-zinc-400 hover:bg-zinc-700/50 hover:text-zinc-50',
            value === option.value &&
              'bg-blue-500/10 text-blue-400 border-blue-500/30 hover:bg-blue-500/15 hover:text-blue-400'
          )}
        >
          {option.label}
        </Button>
      ))}
    </div>
  )
}
