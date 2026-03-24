import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: string | number
  className?: string
  trend?: { value: number; label?: string }
}

export function StatCard({ label, value, trend, className }: StatCardProps) {
  return (
    <div className={cn('p-5 rounded-xl bg-[#1c1b1b] border border-[#424753]/15', className)}>
      <div className="font-mono text-xs font-medium text-[#8c909f] uppercase tracking-widest mb-1">
        {label}
      </div>
      <div className="font-mono text-2xl font-bold text-[#e5e2e1]" suppressHydrationWarning>
        {typeof value === 'number' ? new Intl.NumberFormat('en-US').format(value) : value}
      </div>
      {trend && (
        <div className={cn(
          'mt-1 font-mono text-xs',
          trend.value >= 0 ? 'text-[#7dffa2]' : 'text-red-400'
        )}>
          {trend.value >= 0 ? '+' : ''}{trend.value}
          {trend.label && <span className="text-[#8c909f] ml-1">{trend.label}</span>}
        </div>
      )}
    </div>
  )
}
