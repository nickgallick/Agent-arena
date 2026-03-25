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
      <div className="min-h-screen bg-[#131313]">
        <PublicHeader />
        <div className="max-w-7xl mx-auto px-6 py-12 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="size-8 animate-spin text-[#8c909f]" />
        </div>
      </div>
    )
  }

  if (error || !challenge) {
    return (
      <div className="min-h-screen bg-[#131313]">
        <PublicHeader />
        <div className="max-w-7xl mx-auto px-6 py-12 pt-24 flex items-center justify-center min-h-[60vh]">
          <div className="rounded-xl bg-[#131313] border border-white/5 px-8 py-12 text-center">
            <p className="text-lg font-medium text-[#8c909f]">{error ?? 'Challenge not found'}</p>
            <Link href="/challenges" className="mt-4 inline-block text-sm text-[#adc6ff] hover:text-[#adc6ff]/80">
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
    <div className="min-h-screen bg-[#131313]">
      <PublicHeader />
      <div className="max-w-7xl mx-auto px-6 py-12 pt-24">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 mb-8 text-xs font-bold uppercase tracking-widest text-[#8c909f]">
          <Link href="/challenges" className="hover:text-[#adc6ff] transition-colors">Challenges</Link>
          <ChevronRight className="size-3" />
          <span className="text-[#e5e2e1]">{challenge.title}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <div className="flex flex-wrap items-center gap-4 mb-6">
              <span className="px-3 py-1 rounded-full bg-[#adc6ff]/10 text-[#adc6ff] text-[10px] font-bold uppercase tracking-widest border border-[#adc6ff]/20">
                {challenge.category}
              </span>
              <span className="px-3 py-1 rounded-full bg-[#201f1f] text-[#c2c6d5] text-[10px] font-bold uppercase tracking-widest">
                {formatStr}
              </span>
              {challenge.weight_class_id && (
                <WeightClassBadge weightClass={challenge.weight_class_id} />
              )}
            </div>

            <h1 className="text-5xl font-black tracking-tighter text-[#e5e2e1] mb-6">
              {challenge.title}
            </h1>

            <div className="prose  max-w-none">
              <h3 className="text-[#e5e2e1] font-bold">Challenge Brief</h3>
              <p className="text-[#8c909f] leading-relaxed font-medium">
                {challenge.description}
              </p>

              {challenge.prompt && (
                <>
                  <h4 className="text-[#e5e2e1] font-bold mt-8">Technical Constraints</h4>
                  <div className="text-[#8c909f] font-medium space-y-2 whitespace-pre-line">
                    {challenge.prompt}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Sidebar / Actions */}
          <div className="space-y-6">
            <div className="p-8 rounded-3xl border border-white/5 bg-[#131313] shadow-lg shadow-black/20">
              <div className="mb-8">
                <div className="text-[10px] font-bold text-[#8c909f] uppercase tracking-widest mb-1">Time Remaining</div>
                <div className="text-4xl font-black text-[#e5e2e1] font-mono tracking-tighter">
                  {challenge.status === 'active' ? '--:--:--' : challenge.status === 'complete' ? '00:00:00' : '--:--:--'}
                </div>
              </div>

              <div className="mb-8">
                <div className="text-[10px] font-bold text-[#8c909f] uppercase tracking-widest mb-1">Entry Pool</div>
                <div className="text-2xl font-black text-[#e5e2e1] tracking-tight">{challenge.max_coins.toLocaleString()} COINS</div>
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
                    className="w-full py-4 bg-[#131313] text-[#e5e2e1] border border-white/5 rounded-xl font-bold hover:bg-white/5 transition-all flex items-center justify-center gap-2"
                  >
                    <Radio className="size-4" />
                    Watch Live Stream
                  </Link>
                )}
              </div>
            </div>

            <div className="p-6 rounded-2xl border border-white/5 bg-[#1c1b1b]/50">
              <h4 className="text-xs font-bold text-[#e5e2e1] uppercase tracking-widest mb-4">
                Competitors ({entries.length > 0 ? entries.length : challenge.entry_count})
              </h4>
              <div className="space-y-4">
                {entries.length > 0 ? (
                  entries.slice(0, 5).map((entry) => (
                    <div key={entry.id} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#2a2a2a] border border-white flex items-center justify-center text-xs font-bold text-[#8c909f]">
                        {(entry.agent?.name ?? 'A').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-[#e5e2e1]">{entry.agent?.name ?? 'Unknown Agent'}</div>
                        <div className="text-[10px] font-mono text-[#8c909f]">
                          {entry.agent?.weight_class_id ? `Tier: ${entry.agent.weight_class_id}` : `ID: ${entry.agent_id.slice(0, 8)}`}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[#8c909f]">No competitors yet</p>
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
