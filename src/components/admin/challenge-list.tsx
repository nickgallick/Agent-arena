'use client'

import { useEffect, useState } from 'react'
import { Trophy, Gavel, Loader2, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface Challenge {
  id: string
  title: string
  status: string
  category: string
  entry_count: number
  submitted_entry_count: number
  starts_at: string
  ends_at: string
  created_at: string
}

const statusColors: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  upcoming: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  judging: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  complete: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30',
}

export function ChallengeList() {
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [loading, setLoading] = useState(true)
  const [judging, setJudging] = useState<string | null>(null)

  async function loadChallenges() {
    const res = await fetch('/api/admin/challenges?limit=50')
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.error || 'Failed to load challenges')
    }
    setChallenges(data.challenges ?? [])
  }

  useEffect(() => {
    loadChallenges()
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : 'Failed to load admin challenges')
      })
      .finally(() => setLoading(false))
  }, [])

  async function handleJudge(challengeId: string) {
    setJudging(challengeId)
    try {
      const res = await fetch(`/api/admin/judge/${challengeId}`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to trigger judging')
        return
      }
      toast.success(`Judging complete: ${data.judges_invoked} judge scores recorded`, {
        duration: 5000,
      })
      await loadChallenges()
    } catch {
      toast.error('Network error')
    } finally {
      setJudging(null)
    }
  }

  if (loading) {
    return (
      <Card className="border-zinc-700/50 bg-zinc-800/50">
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="size-6 text-zinc-500 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  if (challenges.length === 0) {
    return (
      <Card className="border-zinc-700/50 bg-zinc-800/50">
        <CardContent className="py-12 text-center">
          <Trophy className="size-8 text-zinc-600 mx-auto mb-3" />
          <p className="text-sm text-zinc-400">No challenges yet. Create one above.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-zinc-700/50 bg-zinc-800/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-zinc-50">
          <Trophy className="h-5 w-5 text-zinc-400" />
          Challenges ({challenges.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {challenges.map((c) => (
          <div
            key={c.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-zinc-700/50 bg-zinc-900/50 p-4"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-semibold text-zinc-50 truncate">{c.title}</p>
                <Badge className={statusColors[c.status] ?? statusColors.active}>
                  {c.status}
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-xs text-zinc-500 font-mono">
                <span>{c.category}</span>
                <span>{c.entry_count} entries</span>
                <span>{c.submitted_entry_count} submitted</span>
                <span>{new Date(c.created_at).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {c.status === 'complete' && (
                <span className="flex items-center gap-1 text-xs text-emerald-400">
                  <CheckCircle className="size-3" /> Judged
                </span>
              )}
              {c.status === 'judging' && (
                <span className="flex items-center gap-1 text-xs text-amber-400">
                  <Clock className="size-3" /> Judging...
                </span>
              )}
              {(c.status === 'active' || c.status === 'upcoming') && c.entry_count > 0 && c.submitted_entry_count === 0 && (
                <span className="flex items-center gap-1 text-xs text-zinc-400">
                  <AlertCircle className="size-3" /> Waiting for submissions
                </span>
              )}
              {(c.status === 'active' || c.status === 'upcoming') && c.submitted_entry_count > 0 && (
                <Button
                  size="sm"
                  onClick={() => handleJudge(c.id)}
                  disabled={judging === c.id}
                  className="gap-1 bg-amber-500 text-black hover:bg-amber-400 text-xs"
                >
                  {judging === c.id ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Gavel className="size-3" />
                  )}
                  Judge
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
