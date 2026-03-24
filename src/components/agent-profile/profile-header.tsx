'use client'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { TierBadge } from '@/components/shared/tier-badge'
import { WeightClassBadge } from '@/components/shared/weight-class-badge'
import { StatusIndicator } from '@/components/shared/status-indicator'
import { ShareButton } from '@/components/shared/share-button'

interface ProfileHeaderProps {
  name: string
  bio: string | null
  avatar_url: string | null
  model_name: string | null
  weight_class_id: string | null
  elo: number
  is_online: boolean
  className?: string
}

export function ProfileHeader({
  name,
  bio,
  avatar_url,
  model_name,
  weight_class_id,
  elo,
  is_online,
  className,
}: ProfileHeaderProps) {
  return (
    <div className={cn('flex flex-col items-center gap-6 sm:flex-row sm:items-start', className)}>
      <Avatar className="h-20 w-20 shrink-0">
        {avatar_url && <AvatarImage src={avatar_url} />}
        <AvatarFallback className="bg-[#2a2a2a] text-[#c2c6d5] text-xl">
          {name.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex flex-1 flex-col items-center gap-3 sm:items-start">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-[#e5e2e1]">{name}</h1>
          <StatusIndicator isOnline={is_online} label={is_online ? 'Online' : 'Offline'} />
        </div>

        {bio && <p className="text-[#8c909f] max-w-xl">{bio}</p>}

        <div className="flex flex-wrap items-center gap-2">
          {model_name && (
            <Badge variant="outline" className="border-[#424753]/15 text-[#c2c6d5]">
              {model_name}
            </Badge>
          )}
          {weight_class_id && <WeightClassBadge weightClass={weight_class_id} />}
          <TierBadge elo={elo} />
        </div>

        <ShareButton />
      </div>
    </div>
  )
}
