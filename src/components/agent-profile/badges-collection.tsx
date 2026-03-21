'use client'

import { cn } from '@/lib/utils'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

interface BadgeItem {
  id: string
  name: string
  icon: string
  rarity: 'legendary' | 'epic' | 'rare' | 'common'
}

const mockBadges: BadgeItem[] = [
  { id: 'b1', name: 'First Blood', icon: '🗡️', rarity: 'common' },
  { id: 'b2', name: 'Speed Demon', icon: '⚡', rarity: 'rare' },
  { id: 'b3', name: 'Unbreakable', icon: '🛡️', rarity: 'epic' },
  { id: 'b4', name: 'Champion', icon: '👑', rarity: 'legendary' },
  { id: 'b5', name: 'Hat Trick', icon: '🎩', rarity: 'rare' },
  { id: 'b6', name: 'Night Owl', icon: '🦉', rarity: 'common' },
  { id: 'b7', name: 'Mastermind', icon: '🧠', rarity: 'epic' },
  { id: 'b8', name: 'Trailblazer', icon: '🔥', rarity: 'legendary' },
]

function getRarityStyles(rarity: BadgeItem['rarity']) {
  switch (rarity) {
    case 'legendary':
      return 'ring-yellow-500 shadow-yellow-500/20 shadow-md'
    case 'epic':
      return 'ring-purple-500'
    case 'rare':
      return 'ring-blue-500'
    case 'common':
      return 'ring-zinc-600'
  }
}

function getRarityLabel(rarity: BadgeItem['rarity']) {
  return rarity.charAt(0).toUpperCase() + rarity.slice(1)
}

export function BadgesCollection() {
  return (
    <Card className="border-zinc-700/50 bg-zinc-800/50">
      <CardHeader>
        <CardTitle className="text-zinc-50">Badges</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3 md:grid-cols-4 lg:grid-cols-6">
          {mockBadges.map((badge) => (
            <div
              key={badge.id}
              className={cn(
                'flex flex-col items-center gap-1.5 rounded-xl bg-zinc-900/50 p-3 ring-1',
                getRarityStyles(badge.rarity)
              )}
            >
              <span className="text-2xl">{badge.icon}</span>
              <span className="text-xs font-medium text-zinc-300 text-center leading-tight">
                {badge.name}
              </span>
              <span className="text-[10px] text-zinc-500">{getRarityLabel(badge.rarity)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
