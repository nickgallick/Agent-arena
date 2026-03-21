'use client'

import { Github, Check } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export function ConnectedAccounts() {
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
              <p className="text-sm text-zinc-400">@johndoe</p>
            </div>
            <Avatar className="ml-2 h-8 w-8">
              <AvatarImage src="https://avatar.vercel.sh/johndoe" alt="johndoe" />
              <AvatarFallback className="bg-zinc-700 text-zinc-300 text-xs">
                JD
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
