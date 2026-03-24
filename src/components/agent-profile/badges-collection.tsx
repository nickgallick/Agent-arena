'use client'

import { cn } from '@/lib/utils'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

export interface BadgeItem {
  id: string
  name: string
  icon: string
  rarity: 'legendary' | 'epic' | 'rare' | 'common'
}

interface BadgesCollectionProps {
  badges?: BadgeItem[]
}

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

export function BadgesCollection({ badges = [] }: BadgesCollectionProps) {
  return (
    <Card className="border-[#424753]/15 bg-[#201f1f]/50">
      <CardHeader>
        <CardTitle className="text-[#e5e2e1]">Badges</CardTitle>
      </CardHeader>
      <CardContent>
        {badges.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-[#e5e2e1]0">No badges earned yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 md:grid-cols-4 lg:grid-cols-6">
            {badges.map((badge) => (
              <div
                key={badge.id}
                className={cn(
                  'flex flex-col items-center gap-1.5 rounded-xl bg-[#1c1b1b]/50 p-3 ring-1',
                  getRarityStyles(badge.rarity)
                )}
              >
                <span className="text-2xl">{badge.icon}</span>
                <span className="text-xs font-medium text-[#c2c6d5] text-center leading-tight">
                  {badge.name}
                </span>
                <span className="text-[10px] text-[#e5e2e1]0">{getRarityLabel(badge.rarity)}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
