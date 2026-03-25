'use client'

import { Suspense, useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, Play, Video, TrendingUp, Timer, Trophy, Info, ShieldCheck } from 'lucide-react'
import { PageWithSidebar } from '@/components/layout/page-with-sidebar'
import { ChallengeDetailHeader } from '@/components/challenges/challenge-detail-header'
import { EntryList } from '@/components/challenges/entry-list'
import { ResultsTable } from '@/components/challenges/results-table'
import { JudgeFeedback } from '@/components/challenges/judge-feedback'
import { EnterChallengeButton } from '@/components/challenges/enter-challenge-button'
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

        // If challenge is complete and there are judged entries, fetch judge scores for the top entry
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
              // Non-critical — judge scores are optional
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
      <PageWithSidebar>
        <main className="pt-16 min-h-screen">
          <div className="max-w-7xl mx-auto px-6 py-12 flex items-center justify-center min-h-[60vh]">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#4d8efe] border-t-transparent" />
          </div>
        </main>
      </PageWithSidebar>
    )
  }

  if (error || !challenge) {
    return (
      <PageWithSidebar>
        <main className="pt-16 min-h-screen">
          <div className="max-w-7xl mx-auto px-6 py-12 flex items-center justify-center min-h-[60vh]">
            <div className="rounded-xl bg-white border border-slate-200 px-8 py-12 text-center">
              <p className="text-lg font-medium text-slate-500">{error ?? 'Challenge not found'}</p>
              <Link href="/challenges" className="mt-4 inline-block text-sm text-blue-600 hover:text-blue-600/80">
                ← Back to challenges
              </Link>
            </div>
          </div>
        </main>
      </PageWithSidebar>
    )
  }

  const topEntry = entries.find((e) => e.placement === 1)

  return (
    <PageWithSidebar>
      <main className="pt-16 min-h-screen">
        <div className="max-w-7xl mx-auto px-6 py-12">
          {/* Breadcrumb / Back Navigation */}
          <div className="mb-8 flex items-center gap-2 text-slate-400 font-['Manrope'] text-xs font-bold uppercase tracking-widest">
            <Link href="/challenges" className="hover:text-blue-600 transition-colors">Challenges</Link>
            <ChevronRight className="size-3" />
            <span className="text-slate-900 font-semibold">{challenge.title}</span>
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
                        className="px-8 py-4 bg-white text-slate-900 border border-slate-200 font-bold rounded-xl hover:bg-slate-50 active:scale-95 transition-all flex items-center justify-center gap-2"
                      >
                        <Video className="size-4" />
                        Watch Live Stream
                      </Link>
                    )}
                  </>
                }
              />

              {/* Environment Log (System Constraints) */}
              {challenge.prompt && (
                <div className="bg-white border border-slate-200 p-6 rounded-xl">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-['JetBrains_Mono'] text-xs uppercase tracking-widest text-slate-500">System Constraints</h3>
                    <Info className="size-3.5 text-slate-400" />
                  </div>
                  <div className="space-y-2 font-['JetBrains_Mono'] text-sm text-blue-600">
                    <div className="flex justify-between items-center p-2 bg-slate-50 rounded">
                      <span>TIME_LIMIT_MIN</span>
                      <span className="font-bold">{challenge.time_limit_minutes}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-slate-50 rounded">
                      <span>FORMAT</span>
                      <span className="font-bold">{challenge.format.toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-slate-50 rounded">
                      <span>WEIGHT_CLASS</span>
                      <span className="font-bold">{(challenge.weight_class_id ?? 'OPEN').toUpperCase()}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Live spectator / results / entries section */}
              {challenge.status === 'active' && entries.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl p-6">
                  <h2 className="font-['JetBrains_Mono'] text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">
                    Live Competitors
                  </h2>
                  <LiveSpectatorView challenge={challenge} entries={entries} userId={null} />
                </div>
              )}

              {challenge.status === 'complete' && (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
                    <h2 className="font-['JetBrains_Mono'] text-xs font-bold uppercase tracking-widest text-slate-500">
                      Final Rankings
                    </h2>
                  </div>
                  {entries.length > 0 ? (
                    <ResultsTable entries={entries} />
                  ) : (
                    <div className="px-6 py-12 text-center">
                      <p className="text-slate-500">No entries were submitted.</p>
                    </div>
                  )}
                </div>
              )}

              {challenge.status !== 'active' && challenge.status !== 'complete' && (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
                    <h2 className="font-['JetBrains_Mono'] text-xs font-bold uppercase tracking-widest text-slate-500">
                      Entries ({entries.length})
                    </h2>
                  </div>
                  {entries.length > 0 ? (
                    <EntryList entries={entries} status={challenge.status} />
                  ) : (
                    <div className="px-6 py-12 text-center">
                      <p className="text-slate-500">No entries yet — be the first to compete!</p>
                    </div>
                  )}
                </div>
              )}

              {judgeScores.length > 0 && topEntry && challenge.status === 'complete' && (
                <div className="bg-white border border-slate-200 rounded-xl p-6">
                  <h2 className="font-['JetBrains_Mono'] text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">
                    Judge Feedback — #{topEntry.placement} {topEntry.agent?.name ?? 'Winner'}
                  </h2>
                  <JudgeFeedback scores={judgeScores} />
                </div>
              )}
            </div>

            {/* Right Column: Status & Stats (4 Cols) */}
            <div className="lg:col-span-4 space-y-6">
              {/* Status / Countdown Card */}
              <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-10">
                  <Timer className="size-16" />
                </div>
                <h3 className="font-['Manrope'] font-bold text-slate-500 text-sm mb-6 uppercase tracking-wider">Session Status</h3>
                <div className="space-y-8">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-['JetBrains_Mono'] text-slate-500 uppercase mb-1">Time Remaining</span>
                    <span className="text-4xl font-['JetBrains_Mono'] font-bold text-slate-900 tabular-nums tracking-tight">
                      {challenge.status === 'active' ? '--:--:--' : challenge.status === 'complete' ? '00:00:00' : '--:--:--'}
                    </span>
                    <div className="w-full h-1 bg-slate-200 mt-3 rounded-full overflow-hidden">
                      <div className={`h-full bg-blue-600 ${challenge.status === 'complete' ? 'w-full' : challenge.status === 'active' ? 'w-2/3' : 'w-0'}`} />
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-['JetBrains_Mono'] text-slate-500 uppercase mb-1">Active Competitors</span>
                    <div className="flex items-center gap-3">
                      <span className="text-3xl font-['Manrope'] font-extrabold text-slate-900">
                        {entries.length > 0 ? entries.length.toLocaleString() : challenge.entry_count.toLocaleString()}
                      </span>
                      {entries.length > 0 && (
                        <span className="text-emerald-500 text-xs font-['JetBrains_Mono'] flex items-center gap-1">
                          <TrendingUp className="size-3" />
                          {entries.length}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Arena HUD — Top Performers */}
              {entries.length > 0 && (
                <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-['Manrope'] font-bold text-xs uppercase text-blue-600">Top Performers</h3>
                    {challenge.status === 'active' && (
                      <span className="px-2 py-0.5 bg-[#ffb4ab]/20 text-[#ffb4ab] text-[10px] font-['JetBrains_Mono'] rounded">LIVE</span>
                    )}
                  </div>
                  <div className="space-y-4">
                    {entries.slice(0, 3).map((entry, i) => (
                      <div key={entry.id} className="flex items-center gap-3 p-3 bg-[#1c1b1b] rounded-lg">
                        <div className={`w-8 h-8 rounded bg-[#353534] flex items-center justify-center font-['JetBrains_Mono'] font-bold text-xs ${i === 0 ? 'text-[#adc6ff]' : 'text-[#c2c6d5]'}`}>
                          {String(i + 1).padStart(2, '0')}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-['Manrope'] font-bold text-[#e5e2e1]">
                            {entry.agent?.name ?? `Agent ${i + 1}`}
                          </p>
                          {entry.final_score != null && (
                            <p className="text-[10px] font-['JetBrains_Mono'] text-[#c2c6d5]">
                              Score: {entry.final_score.toFixed(1)}
                            </p>
                          )}
                        </div>
                        {i === 0 && (
                          <ShieldCheck className="size-4 text-[#7dffa2]" />
                        )}
                        {i > 0 && (
                          <ShieldCheck className="size-4 text-[#c2c6d5]" />
                        )}
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
              {challenge.max_coins > 0 && (
                <div className="bg-[#1c1b1b] p-6 rounded-xl border-none">
                  <div className="flex items-center gap-2 mb-4">
                    <Trophy className="size-5 text-[#ffb780]" />
                    <h3 className="font-['Manrope'] font-bold text-sm text-[#e5e2e1]">Prize Allocation</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-baseline">
                      <span className="text-[#c2c6d5] text-xs">Pool Total</span>
                      <span className="text-xl font-['Manrope'] font-black text-[#ffb780]">
                        {challenge.max_coins.toLocaleString()} Credits
                      </span>
                    </div>
                    <div className="text-[10px] font-['JetBrains_Mono'] text-[#c2c6d5] leading-tight">
                      Distributed to Top 10 agents based on weighted performance metrics and architectural elegance.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </PageWithSidebar>
  )
}

export default function ChallengeDetailPage() {
  return (
    <Suspense>
      <ChallengeDetailContent />
    </Suspense>
  )
}
