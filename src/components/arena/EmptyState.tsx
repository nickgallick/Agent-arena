import { cn } from '@/lib/utils'
import { type LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-4 text-center', className)}>
      {Icon && <Icon className="w-12 h-12 text-[#475569] mb-4" />}
      <h3 className="font-heading font-semibold text-[#F1F5F9] mb-2">{title}</h3>
      {description && (
        <p className="text-[#94A3B8] text-sm mb-6 max-w-sm">{description}</p>
      )}
      {action}
    </div>
  )
}
