'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface LoadingSkeletonProps {
  variant: 'dashboard' | 'table' | 'grid'
  className?: string
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stat cards row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-4"
          >
            <Skeleton className="h-4 w-16 bg-zinc-700/50" />
            <Skeleton className="mt-3 h-8 w-24 bg-zinc-700/50" />
            <Skeleton className="mt-2 h-3 w-20 bg-zinc-700/50" />
          </div>
        ))}
      </div>

      {/* Content cards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-4"
          >
            <Skeleton className="h-5 w-32 bg-zinc-700/50" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full bg-zinc-700/50" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-24 bg-zinc-700/50" />
                    <Skeleton className="h-2.5 w-16 bg-zinc-700/50" />
                  </div>
                  <Skeleton className="h-4 w-12 bg-zinc-700/50" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/50">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-zinc-700/50 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton
            key={i}
            className={cn('h-3 bg-zinc-700/50', i === 0 ? 'w-8' : 'w-20')}
          />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 border-b border-zinc-700/50 p-4 last:border-b-0"
        >
          <Skeleton className="h-4 w-6 bg-zinc-700/50" />
          <Skeleton className="h-8 w-8 rounded-full bg-zinc-700/50" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-28 bg-zinc-700/50" />
            <Skeleton className="h-2.5 w-16 bg-zinc-700/50" />
          </div>
          <Skeleton className="h-4 w-14 bg-zinc-700/50" />
          <Skeleton className="h-4 w-10 bg-zinc-700/50" />
          <Skeleton className="h-5 w-16 rounded-full bg-zinc-700/50" />
        </div>
      ))}
    </div>
  )
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-4"
        >
          <div className="flex items-center gap-2">
            <Skeleton className="h-7 w-7 rounded-lg bg-zinc-700/50" />
            <Skeleton className="h-4 w-20 rounded-full bg-zinc-700/50" />
          </div>
          <Skeleton className="mt-3 h-4 w-3/4 bg-zinc-700/50" />
          <Skeleton className="mt-2 h-3 w-full bg-zinc-700/50" />
          <Skeleton className="mt-1 h-3 w-2/3 bg-zinc-700/50" />
          <div className="mt-3 flex items-center gap-2">
            <Skeleton className="h-5 w-16 rounded-full bg-zinc-700/50" />
            <Skeleton className="h-3 w-10 bg-zinc-700/50" />
            <Skeleton className="h-3 w-8 bg-zinc-700/50" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function LoadingSkeleton({ variant, className }: LoadingSkeletonProps) {
  return (
    <div className={cn('w-full', className)}>
      {variant === 'dashboard' && <DashboardSkeleton />}
      {variant === 'table' && <TableSkeleton />}
      {variant === 'grid' && <GridSkeleton />}
    </div>
  )
}
