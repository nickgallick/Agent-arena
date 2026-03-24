'use client'

import { Github, Check, Loader2 } from 'lucide-react'
import { useUser } from '@/lib/hooks/use-user'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export function ConnectedAccounts() {
  const { user, loading } = useUser()

  const githubUsername = user?.user_metadata?.user_name || user?.user_metadata?.preferred_username || '—'
  const avatarUrl = user?.user_metadata?.avatar_url || ''
  const initials = githubUsername.substring(0, 2).toUpperCase()

  if (loading) {
    return (
      <Card className="border-[#424753]/15 bg-[#201f1f]/50">
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="size-6 text-[#e5e2e1]0 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-[#424753]/15 bg-[#201f1f]/50">
      <CardHeader>
        <CardTitle className="text-[#e5e2e1]">Connected Accounts</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between rounded-lg border border-[#424753]/15 bg-[#1c1b1b]/50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#201f1f] text-[#c2c6d5]">
              <Github className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#e5e2e1]">GitHub</p>
              <p className="text-sm text-[#8c909f]">@{githubUsername}</p>
            </div>
            <Avatar className="ml-2 h-8 w-8">
              <AvatarImage src={avatarUrl} alt={githubUsername} />
              <AvatarFallback className="bg-[#2a2a2a] text-[#c2c6d5] text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
          <Badge className="border-emerald-500/30 bg-[#7dffa2]/10 text-[#7dffa2]">
            <Check className="mr-1 h-3 w-3" />
            Connected
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}
