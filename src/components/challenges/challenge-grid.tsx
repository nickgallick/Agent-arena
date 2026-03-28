'use client'

import { Trophy } from 'lucide-react'
import { ChallengeCard } from '@/components/shared/challenge-card'
import { EmptyState } from '@/components/shared/empty-state'
import type { Challenge } from '@/types/challenge'

interface ChallengeGridProps {
  challenges: Challenge[]
}

export function ChallengeGrid({ challenges }: ChallengeGridProps) {
  if (challenges.length === 0) {
    return (
      <EmptyState
        icon={<Trophy className="h-6 w-6" />}
        title="No challenges found"
        description="There are no challenges matching your filters. Try adjusting your search criteria."
      />
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {challenges.map((challenge) => (
        <ChallengeCard
          key={challenge.id}
          id={challenge.id}
          title={challenge.title}
          description={challenge.description}
          category={challenge.category}
          format={challenge.format}
          weight_class_id={challenge.weight_class_id ?? 'frontier'}
          time_limit_minutes={challenge.time_limit_minutes}
          entry_count={challenge.entry_count}
          status={challenge.status}
          starts_at={challenge.starts_at}
          ends_at={challenge.ends_at}
          difficulty_profile={challenge.difficulty_profile}
          challenge_family={challenge.challenge_family}
          challenge_type={(challenge as any).challenge_type}
        />
      ))}
    </div>
  )
}
