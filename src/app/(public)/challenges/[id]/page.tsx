'use client'

import { Suspense, useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, Radio, Loader2 } from 'lucide-react'
import { PageWithSidebar } from '@/components/layout/page-with-sidebar'
import { PublicHeader } from '@/components/layout/public-header'
import { Footer } from '@/components/layout/footer'
import { WeightClassBadge } from '@/components/shared/weight-class-badge'
import { EnterChallengeButton } from '@/components/challenges/enter-challenge-button'
import type { Challenge, ChallengeEntry } from '@/types/challenge'
import type { JudgeScore } from '@/types/judge'

function ChallengeDetailContent() {
  const params = useParams<{ id: string }>()
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [entries, setEntries] = useState<ChallengeEntry[]>([])
  const [judgeScores, setJudgeScores] = useState<JudgeScore[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchChallenge() {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch(`/api/challenges/${params.id}`)
        if (res.status === 404) {
          setError('Challenge not found')
          return
        }
        if (!res.ok) {
          throw new Error('Failed to load challenge')
        }
        const data = await res.json()
        const c = data.challenge
        if (!c) {
          setError('Challenge not found')
          return
        }
        const challengeEntries = c.entries ?? []
        delete c.entries
        setChallenge(c)
        setEntries(challengeEntries)

        if (c.status === 'complete' && challengeEntries.length > 0) {
          const topEntry = challengeEntries.find((e: ChallengeEntry) => e.placement === 1) ?? challengeEntries[0]
          if (topEntry) {
            try {
              const replayRes = await fetch(`/api/replays/${topEntry.id}`)
              if (replayRes.ok) {
                const replayData = await replayRes.json()
                setJudgeScores(replayData.replay?.judge_scores ?? [])
              }
            } catch {
              // Non-critical
            }
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load challenge')
      } finally {
        setLoading(false)
      }
    }
    fetchChallenge()
  }, [params.id])

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <PublicHeader />
        <div className="max-w-7xl mx-auto px-6 py-12 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="size-8 animate-spin text-slate-400" />
        </div>
      </div>
    )
  }

  if (error || !challenge) {
    return (
      <div className="min-h-screen bg-white">
        <PublicHeader />
        <div className="max-w-7xl mx-auto px-6 py-12 pt-24 flex items-center justify-center min-h-[60vh]">
          <div className="rounded-xl bg-white border border-slate-200 px-8 py-12 text-center">
            <p className="text-lg font-medium text-slate-500">{error ?? 'Challenge not found'}</p>
            <Link href="/challenges" className="mt-4 inline-block text-sm text-blue-600 hover:text-blue-600/80">
              &larr; Back to challenges
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const formatStr = challenge.format
    ? `${challenge.format.charAt(0).toUpperCase() + challenge.format.slice(1)} (${challenge.time_limit_minutes}m)`
    : `Sprint (${challenge.time_limit_minutes}m)`

  return (
    <div className="min-h-screen bg-white">
      <PublicHeader />
      <div className="max-w-7xl mx-auto px-6 py-12 pt-24">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 mb-8 text-xs font-bold uppercase tracking-widest text-slate-400">
          <Link href="/challenges" className="hover:text-blue-600 transition-colors">Challenges</Link>
          <ChevronRight className="size-3" />
          <span className="text-slate-900">{challenge.title}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <div className="flex flex-wrap items-center gap-4 mb-6">
              <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-widest border border-blue-100">
                {challenge.category}
              </span>
              <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-widest">
                {formatStr}
              </span>
              {challenge.weight_class_id && (
                <WeightClassBadge weightClass={challenge.weight_class_id} />
              )}
            </div>

            <h1 className="text-5xl font-black tracking-tighter text-slate-900 mb-6">
              {challenge.title}
            </h1>

            <div className="prose prose-slate max-w-none">
              <h3 className="text-slate-900 font-bold">Challenge Brief</h3>
              <p className="text-slate-500 leading-relaxed font-medium">
                {challenge.description}
              </p>

              {challenge.prompt && (
                <>
                  <h4 className="text-slate-900 font-bold mt-8">Technical Constraints</h4>
                  <div className="text-slate-500 font-medium space-y-2 whitespace-pre-line">
                    {challenge.prompt}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Sidebar / Actions */}
          <div className="space-y-6">
            <div className="p-8 rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="mb-8">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Time Remaining</div>
                <div className="text-4xl font-black text-slate-900 font-mono tracking-tighter">
                  {challenge.status === 'active' ? '--:--:--' : challenge.status === 'complete' ? '00:00:00' : '--:--:--'}
                </div>
              </div>

              <div className="mb-8">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Entry Pool</div>
                <div className="text-2xl font-black text-slate-900 tracking-tight">{challenge.max_coins.toLocaleString()} COINS</div>
              </div>

              <div className="space-y-3">
                <EnterChallengeButton
                  challengeId={challenge.id}
                  isEligible={true}
                  isEntered={false}
                />
                {(challenge.status === 'active' || challenge.status === 'judging') && (
                  <Link
                    href={`/challenges/${challenge.id}/spectate`}
                    className="w-full py-4 bg-white text-slate-900 border border-slate-200 rounded-xl font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                  >
                    <Radio className="size-4" />
                    Watch Live Stream
                  </Link>
                )}
              </div>
            </div>

            <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50/50">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-4">
                Competitors ({entries.length > 0 ? entries.length : challenge.entry_count})
              </h4>
              <div className="space-y-4">
                {entries.length > 0 ? (
                  entries.slice(0, 5).map((entry) => (
                    <div key={entry.id} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200 border border-white flex items-center justify-center text-xs font-bold text-slate-500">
                        {(entry.agent?.name ?? 'A').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-900">{entry.agent?.name ?? 'Unknown Agent'}</div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {entry.agent?.weight_class_id ? `Tier: ${entry.agent.weight_class_id}` : `ID: ${entry.agent_id.slice(0, 8)}`}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-400">No competitors yet</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}

export default function ChallengeDetailPage() {
  return (
    <Suspense>
      <ChallengeDetailContent />
    </Suspense>
  )
}
