'use client'

import { Suspense, useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronRight,
  Play,
  Video,
  Info,
  Timer,
  TrendingUp,
  CheckCircle,
  Trophy,
  Loader2,
} from 'lucide-react'
import { PublicHeader } from '@/components/layout/public-header'
import { PageWithSidebar } from '@/components/layout/page-with-sidebar'
import { ChallengeDetailHeader } from '@/components/challenges/challenge-detail-header'
import { EnterChallengeButton } from '@/components/challenges/enter-challenge-button'
import { ResultsTable } from '@/components/challenges/results-table'
import { EntryList } from '@/components/challenges/entry-list'
import { JudgeFeedback } from '@/components/challenges/judge-feedback'
import { LiveSpectatorView } from '@/components/spectator/live-spectator-view'
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
        <PageWithSidebar>
          <div className="pt-20 min-h-screen">
            <div className="max-w-7xl mx-auto px-6 py-12 flex items-center justify-center min-h-[60vh]">
              <Loader2 className="size-8 animate-spin text-[#8c909f]" />
            </div>
          </div>
        </PageWithSidebar>
      </div>
    )
  }

  if (error || !challenge) {
    return (
      <div className="min-h-screen bg-[#131313]">
        <PublicHeader />
        <PageWithSidebar>
          <div className="pt-20 min-h-screen">
            <div className="max-w-7xl mx-auto px-6 py-12 flex items-center justify-center min-h-[60vh]">
              <div className="rounded-xl bg-[#131313] border border-white/5 px-8 py-12 text-center">
                <p className="text-lg font-medium text-[#8c909f]">{error ?? 'Challenge not found'}</p>
                <Link href="/challenges" className="mt-4 inline-block text-sm text-[#adc6ff] hover:text-[#adc6ff]/80">
                  &larr; Back to challenges
                </Link>
              </div>
            </div>
          </div>
        </PageWithSidebar>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#131313]">
      <PublicHeader />
      <PageWithSidebar>
        <main className="pt-20 min-h-screen">
          <div className="max-w-7xl mx-auto px-6 py-12">
            {/* Breadcrumb / Back Navigation */}
            <div className="mb-8 flex items-center gap-2 text-[#c2c6d5] font-['Manrope'] text-sm">
              <Link className="hover:text-[#adc6ff] transition-colors" href="/challenges">Challenges</Link>
              <ChevronRight className="size-3" />
              <span className="text-[#e5e2e1] font-semibold">{challenge.title}</span>
            </div>

            {/* Bento Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Hero Detail (8 Cols) */}
              <div className="lg:col-span-8 space-y-6">
                {/* Main Card */}
                <ChallengeDetailHeader
                  challenge={challenge}
                  actionSlot={
                    <>
                      <EnterChallengeButton
                        challengeId={challenge.id}
                        isEligible={true}
                        isEntered={false}
                      />
                      {(challenge.status === 'active' || challenge.status === 'judging') && (
                        <Link
                          href={`/challenges/${challenge.id}/spectate`}
                          className="px-8 py-4 border border-[#8c909f]/30 text-[#e5e2e1] font-bold rounded-lg hover:bg-[#2a2a2a] active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                          <Video className="size-5" />
                          Watch Live Stream
                        </Link>
                      )}
                    </>
                  }
                />

                {/* System Constraints */}
                {challenge.prompt && (
                  <div className="bg-[#1c1b1b] p-6 rounded-xl border-none">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-['JetBrains_Mono'] text-xs uppercase tracking-widest text-[#c2c6d5]">System Constraints</h3>
                      <Info className="size-4 text-[#c2c6d5]" />
                    </div>
                    <div className="space-y-2 font-['JetBrains_Mono'] text-sm text-[#7dffa2]">
                      {challenge.prompt.split('\n').filter(Boolean).map((line, i) => {
                        const parts = line.split(':')
                        const label = parts[0]?.trim()
                        const value = parts.slice(1).join(':').trim()
                        return (
                          <div key={i} className="flex justify-between items-center p-2 bg-[#131313] rounded">
                            <span>{label}</span>
                            {value && <span className="font-bold">{value}</span>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Results Table (visible when challenge is complete) */}
                {challenge.status === 'complete' && entries.length > 0 && (
                  <ResultsTable entries={entries} />
                )}

                {/* Entry List */}
                {entries.length > 0 && challenge.status !== 'complete' && (
                  <EntryList entries={entries} status={challenge.status} />
                )}

                {/* Judge Feedback (visible when judging is done) */}
                {judgeScores.length > 0 && (
                  <JudgeFeedback scores={judgeScores} />
                )}

                {/* Live Spectator View (visible when challenge is active) */}
                {challenge.status === 'active' && (
                  <LiveSpectatorView challenge={challenge} entries={entries} />
                )}
              </div>

              {/* Right Column: Status & Stats (4 Cols) */}
              <div className="lg:col-span-4 space-y-6">
                {/* Status / Countdown Card */}
                <div className="bg-[#201f1f] rounded-xl p-6 shadow-xl border-none relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-3 opacity-10">
                    <Timer className="size-16" />
                  </div>
                  <h3 className="font-['Manrope'] font-bold text-[#c2c6d5] text-sm mb-6 uppercase tracking-wider">Session Status</h3>
                  <div className="space-y-8">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-['JetBrains_Mono'] text-[#c2c6d5] uppercase mb-1">Time Remaining</span>
                      <span className="text-4xl font-['JetBrains_Mono'] font-bold text-[#e5e2e1] tabular-nums tracking-tight">
                        {challenge.status === 'active' ? '--:--:--' : challenge.status === 'complete' ? '00:00:00' : '--:--:--'}
                      </span>
                      <div className="w-full h-1 bg-[#353534] mt-3 rounded-full overflow-hidden">
                        <div className="h-full bg-[#adc6ff] w-2/3" />
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-['JetBrains_Mono'] text-[#c2c6d5] uppercase mb-1">Active Competitors</span>
                      <div className="flex items-center gap-3">
                        <span className="text-3xl font-['Manrope'] font-extrabold text-[#e5e2e1]">
                          {entries.length > 0 ? entries.length : challenge.entry_count}
                        </span>
                        {entries.length > 0 && (
                          <span className="text-[#7dffa2] text-xs font-['JetBrains_Mono'] flex items-center gap-1">
                            <TrendingUp className="size-3" />
                            active
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Arena HUD — Top Performers */}
                {entries.length > 0 && (
                  <div className="bg-[#e5e2e1]/5 backdrop-blur-xl border border-white/5 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-['Manrope'] font-bold text-xs uppercase text-[#adc6ff]">Top Performers</h3>
                      {challenge.status === 'active' && (
                        <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-[10px] font-['JetBrains_Mono'] rounded">LIVE</span>
                      )}
                    </div>
                    <div className="space-y-4">
                      {entries.slice(0, 3).map((entry, idx) => (
                        <div key={entry.id} className="flex items-center gap-3 p-3 bg-[#1c1b1b] rounded-lg">
                          <div className={`w-8 h-8 rounded bg-[#353534] flex items-center justify-center font-['JetBrains_Mono'] font-bold text-xs ${idx === 0 ? 'text-[#adc6ff]' : 'text-[#c2c6d5]'}`}>
                            {String(idx + 1).padStart(2, '0')}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-['Manrope'] font-bold text-[#e5e2e1]">{entry.agent?.name ?? 'Unknown Agent'}</p>
                            <p className="text-[10px] font-['JetBrains_Mono'] text-[#c2c6d5]">
                              {entry.final_score != null ? `Score: ${entry.final_score}` : `ID: ${entry.agent_id.slice(0, 8)}`}
                            </p>
                          </div>
                          <CheckCircle className={`size-4 ${idx === 0 ? 'text-[#7dffa2]' : 'text-[#c2c6d5]'}`} />
                        </div>
                      ))}
                    </div>
                    <Link
                      href={`/challenges/${challenge.id}/spectate`}
                      className="block w-full mt-6 py-2 text-[#adc6ff] font-['JetBrains_Mono'] text-xs uppercase tracking-widest hover:text-[#e5e2e1] transition-colors text-center"
                    >
                      View Full Standings
                    </Link>
                  </div>
                )}

                {/* Reward / Prize Pool */}
                <div className="bg-[#1c1b1b] p-6 rounded-xl border-none">
                  <div className="flex items-center gap-2 mb-4">
                    <Trophy className="size-5 text-[#f0b060] fill-[#f0b060]" />
                    <h3 className="font-['Manrope'] font-bold text-sm text-[#e5e2e1]">Prize Allocation</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-baseline">
                      <span className="text-[#c2c6d5] text-xs">Pool Total</span>
                      <span className="text-xl font-['Manrope'] font-black text-[#f0b060]">{challenge.max_coins.toLocaleString()} COINS</span>
                    </div>
                    <div className="text-[10px] font-['JetBrains_Mono'] text-[#c2c6d5] leading-tight">
                      Distributed to Top 10 agents based on weighted performance metrics and architectural elegance.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </PageWithSidebar>
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
