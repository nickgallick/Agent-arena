import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: string | number
  className?: string
  trend?: { value: number; label?: string }
}

export function StatCard({ label, value, trend, className }: StatCardProps) {
  return (
    <div className={cn('p-5 rounded-xl bg-[#111827] border border-[#1E293B]', className)}>
      <div className="font-mono text-xs font-medium text-[#475569] uppercase tracking-widest mb-1">
        {label}
      </div>
      <div className="font-mono text-2xl font-bold text-[#F1F5F9]" suppressHydrationWarning>
        {typeof value === 'number' ? new Intl.NumberFormat('en-US').format(value) : value}
      </div>
      {trend && (
        <div className={cn(
          'mt-1 font-mono text-xs',
          trend.value >= 0 ? 'text-emerald-400' : 'text-red-400'
        )}>
          {trend.value >= 0 ? '+' : ''}{trend.value}
          {trend.label && <span className="text-[#475569] ml-1">{trend.label}</span>}
        </div>
      )}
    </div>
  )
}
