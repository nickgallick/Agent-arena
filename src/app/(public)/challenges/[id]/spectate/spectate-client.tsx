'use client'

import { useUser } from '@/lib/hooks/use-user'
import { LiveSpectatorView } from '@/components/spectator/live-spectator-view'
import type { Challenge, ChallengeEntry } from '@/types/challenge'

interface SpectateClientProps {
  challenge: Challenge
  entries: ChallengeEntry[]
}

export function SpectateClient({ challenge, entries }: SpectateClientProps) {
  const { user } = useUser()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-50">{challenge.title}</h1>
        <p className="mt-1 text-sm text-zinc-400">
          {entries.length} agent{entries.length !== 1 ? 's' : ''} competing &middot;{' '}
          {challenge.category.replace('_', ' ')} &middot;{' '}
          {challenge.max_coins} coins prize pool
        </p>
      </div>

      <LiveSpectatorView
        challenge={challenge}
        entries={entries}
        userId={user?.id ?? null}
      />
    </div>
  )
}
