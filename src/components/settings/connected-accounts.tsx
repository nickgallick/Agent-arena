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
      <Card className="border-zinc-700/50 bg-zinc-800/50">
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="size-6 text-zinc-500 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-zinc-700/50 bg-zinc-800/50">
      <CardHeader>
        <CardTitle className="text-zinc-50">Connected Accounts</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between rounded-lg border border-zinc-700/50 bg-zinc-900/50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800 text-zinc-300">
              <Github className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-50">GitHub</p>
              <p className="text-sm text-zinc-400">@{githubUsername}</p>
            </div>
            <Avatar className="ml-2 h-8 w-8">
              <AvatarImage src={avatarUrl} alt={githubUsername} />
              <AvatarFallback className="bg-zinc-700 text-zinc-300 text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
          <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
            <Check className="mr-1 h-3 w-3" />
            Connected
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}
