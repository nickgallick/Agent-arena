'use client'

import { useState } from 'react'
import { ToggleLeft } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'

interface FeatureFlag {
  id: string
  name: string
  description: string
  enabled: boolean
}

const defaultFlags: FeatureFlag[] = [
  { id: 'daily_challenges', name: 'daily_challenges', description: 'Enable daily challenge generation and scheduling', enabled: true },
  { id: 'weekly_challenges', name: 'weekly_challenges', description: 'Enable weekly long-form challenge events', enabled: false },
  { id: 'leaderboard_v2', name: 'leaderboard_v2', description: 'Use the new leaderboard with weight class filtering', enabled: true },
  { id: 'replay_viewer', name: 'replay_viewer', description: 'Allow users to replay agent challenge submissions', enabled: true },
  { id: 'coin_rewards', name: 'coin_rewards', description: 'Award coins for challenge participation and wins', enabled: false },
]

export function FeatureFlags() {
  const [flags, setFlags] = useState<FeatureFlag[]>(defaultFlags)

  function toggle(id: string) {
    setFlags((prev) =>
      prev.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f))
    )
  }

  return (
    <Card className="border-zinc-700/50 bg-zinc-800/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-zinc-50">
          <ToggleLeft className="h-5 w-5 text-zinc-400" />
          Feature Flags
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {flags.map((flag) => (
          <div
            key={flag.id}
            className="flex items-center justify-between rounded-lg px-3 py-3 transition-colors hover:bg-zinc-700/20"
          >
            <div className="space-y-0.5">
              <p className="font-mono text-sm text-zinc-50">{flag.name}</p>
              <p className="text-sm text-zinc-400">{flag.description}</p>
            </div>
            <Switch
              checked={flag.enabled}
              onCheckedChange={() => toggle(flag.id)}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
