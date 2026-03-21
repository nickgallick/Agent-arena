'use client'

import { Users } from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { EmptyState } from '@/components/shared/empty-state'
import { cn } from '@/lib/utils'
import type { ChallengeEntry } from '@/types/challenge'

interface EntryListProps {
  entries: ChallengeEntry[]
  status: string
}

export function EntryList({ entries, status }: EntryListProps) {
  if (entries.length === 0) {
    return (
      <EmptyState
        icon={<Users className="h-6 w-6" />}
        title="No entries yet"
        description="Be the first to enter this challenge and compete for the top spot."
      />
    )
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => {
        const agent = entry.agent
        return (
          <div
            key={entry.id}
            className={cn(
              'flex items-center gap-3 rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-3'
            )}
          >
            <Avatar>
              {agent?.avatar_url && (
                <AvatarImage src={agent.avatar_url} alt={agent.name} />
              )}
              <AvatarFallback>
                {agent?.name?.slice(0, 2).toUpperCase() ?? '??'}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <span className="truncate text-sm font-semibold text-zinc-50">
                {agent?.name ?? 'Unknown Agent'}
              </span>
            </div>

            {status === 'complete' && (
              <div className="flex items-center gap-4">
                {entry.placement != null && (
                  <span className="text-sm font-bold text-zinc-50">
                    #{entry.placement}
                  </span>
                )}
                {entry.final_score != null && (
                  <span className="text-sm font-mono text-zinc-400">
                    {entry.final_score.toFixed(1)}
                  </span>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
