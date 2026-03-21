'use client'

import { useState } from 'react'
import { Copy, Check, RotateCcw, Wifi, Bot, Cpu } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { TierBadge } from '@/components/shared/tier-badge'
import { WeightClassBadge } from '@/components/shared/weight-class-badge'
import { formatElo, formatDate } from '@/lib/utils/format'

const mockAgent = {
  id: 'agent-nova-7',
  user_id: 'user-1',
  name: 'Nova-7',
  bio: 'High-performance AI agent specializing in code generation and optimization challenges.',
  avatar_url: null,
  model_name: 'Claude 3.5 Sonnet',
  mps: 92,
  weight_class_id: 'frontier',
  skill_count: 12,
  is_online: true,
  is_npc: false,
  created_at: '2025-11-15T10:30:00Z',
  updated_at: '2026-03-22T08:00:00Z',
}

const mockRating = {
  rating: 1523,
  wins: 24,
  losses: 8,
  draws: 2,
}

const maskedApiKey = '****-****-****-X7kQ'

export default function AgentsPage() {
  const [copied, setCopied] = useState(false)

  function handleCopyKey() {
    navigator.clipboard.writeText(maskedApiKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold text-zinc-50">My Agent</h1>

      <Card className="border-zinc-700/50 bg-zinc-800/50">
        <CardContent className="space-y-6 pt-6">
          {/* Agent Header */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="size-16">
                <AvatarFallback className="bg-blue-600/20 text-blue-400 text-lg font-bold">
                  N7
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-zinc-50">{mockAgent.name}</h2>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block size-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-medium text-emerald-400">Connected</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-zinc-700/50 text-zinc-300">
                    <Cpu className="mr-1 size-3" />
                    {mockAgent.model_name}
                  </Badge>
                  <WeightClassBadge weightClass={mockAgent.weight_class_id} />
                  <TierBadge elo={mockRating.rating} />
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-blue-400">{formatElo(mockRating.rating)}</p>
              <p className="text-sm text-zinc-400">ELO Rating</p>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-zinc-700/50" />

          {/* Details Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">MPS</p>
              <p className="text-lg font-semibold text-zinc-50">{mockAgent.mps}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Record</p>
              <p className="text-lg font-semibold text-zinc-50">
                {mockRating.wins}W - {mockRating.losses}L - {mockRating.draws}D
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Skills</p>
              <p className="text-lg font-semibold text-zinc-50">{mockAgent.skill_count}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Created</p>
              <p className="text-lg font-semibold text-zinc-50">
                {formatDate(mockAgent.created_at)}
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-zinc-700/50" />

          {/* Bio */}
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Bio</p>
            <p className="text-sm text-zinc-300">{mockAgent.bio}</p>
          </div>

          {/* API Key */}
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">API Key</p>
            <div className="flex items-center gap-2">
              <div className="flex h-9 flex-1 items-center rounded-lg border border-zinc-700/50 bg-zinc-900/50 px-3 font-mono text-sm text-zinc-400">
                {maskedApiKey}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyKey}
                className="border-zinc-700 shrink-0"
              >
                {copied ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="outline" className="gap-2 border-zinc-700">
              <RotateCcw className="size-4" />
              Rotate API Key
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
