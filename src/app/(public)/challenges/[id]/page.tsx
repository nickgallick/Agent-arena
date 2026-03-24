'use client'

import { Suspense, useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Eye } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
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
      <div className="flex min-h-screen flex-col bg-[#131313]">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#4d8efe] border-t-transparent" />
        </main>
        <Footer />
      </div>
    )
  }

  if (error || !challenge) {
    return (
      <div className="flex min-h-screen flex-col bg-[#131313]">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="rounded-xl border border-[#424753]/15 bg-[#1c1b1b]/50 px-8 py-12 text-center">
            <p className="text-lg font-medium text-[#c2c6d5]">{error ?? 'Challenge not found'}</p>
            <a href="/challenges" className="mt-4 inline-block text-sm text-[#adc6ff] hover:text-[#adc6ff]">
              ← Back to challenges
            </a>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  const topEntry = entries.find((e) => e.placement === 1)

  return (
    <div className="flex min-h-screen flex-col bg-[#131313]">
      <Header />

      <main className="flex-1 pt-20">
        <div className="mx-auto max-w-7xl px-4 py-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-[#8c909f] font-[family-name:var(--font-heading)] mb-6">
            <Link href="/challenges" className="hover:text-[#adc6ff] transition-colors">Challenges</Link>
            <span className="text-[#353534]">›</span>
            <span className="text-[#e5e2e1] font-semibold">{challenge.title}</span>
          </nav>

          {/* Bento Grid: 8/4 split */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Main content (8 cols) */}
            <div className="lg:col-span-8 space-y-6">
              <div className="bg-[#1c1b1b] rounded-xl overflow-hidden">
                {/* Challenge header */}
                <div className="p-8">
                  <ChallengeDetailHeader challenge={challenge} />

                  {/* Action buttons */}
                  <div className="flex flex-col sm:flex-row gap-4 mt-8">
                    <EnterChallengeButton
                      challengeId={challenge.id}
                      isEligible={true}
                      isEntered={false}
                    />
                    {(challenge.status === 'active' || challenge.status === 'judging') && (
                      <Link
                        href={`/challenges/${challenge.id}/spectate`}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#2a2a2a] hover:bg-[#353534] px-6 py-3 text-sm font-semibold text-[#c2c6d5] transition-all duration-150"
                      >
                        <Eye className="size-4" />
                        Watch Live Stream
                      </Link>
                    )}
                  </div>
                </div>
              </div>

              {/* Live spectator / results / entries section */}
              {challenge.status === 'active' && entries.length > 0 && (
                <div className="bg-[#1c1b1b] rounded-xl p-6">
                  <h2 className="font-[family-name:var(--font-mono)] text-xs font-bold uppercase tracking-widest text-[#8c909f] mb-4">
                    Live Competitors
                  </h2>
                  <LiveSpectatorView challenge={challenge} entries={entries} userId={null} />
                </div>
              )}

              {challenge.status === 'complete' && (
                <div className="bg-[#1c1b1b] rounded-xl overflow-hidden">
                  <div className="px-6 py-4 bg-[#2a2a2a]">
                    <h2 className="font-[family-name:var(--font-mono)] text-xs font-bold uppercase tracking-widest text-[#c2c6d5]">
                      Final Rankings
                    </h2>
                  </div>
                  {entries.length > 0 ? (
                    <ResultsTable entries={entries} />
                  ) : (
                    <div className="px-6 py-12 text-center">
                      <p className="text-[#c2c6d5]">No entries were submitted.</p>
                    </div>
                  )}
                </div>
              )}

              {challenge.status !== 'active' && challenge.status !== 'complete' && (
                <div className="bg-[#1c1b1b] rounded-xl overflow-hidden">
                  <div className="px-6 py-4 bg-[#2a2a2a]">
                    <h2 className="font-[family-name:var(--font-mono)] text-xs font-bold uppercase tracking-widest text-[#c2c6d5]">
                      Entries ({entries.length})
                    </h2>
                  </div>
                  {entries.length > 0 ? (
                    <EntryList entries={entries} status={challenge.status} />
                  ) : (
                    <div className="px-6 py-12 text-center">
                      <p className="text-[#c2c6d5]">No entries yet — be the first to compete!</p>
                    </div>
                  )}
                </div>
              )}

              {judgeScores.length > 0 && topEntry && challenge.status === 'complete' && (
                <div className="bg-[#1c1b1b] rounded-xl p-6">
                  <h2 className="font-[family-name:var(--font-mono)] text-xs font-bold uppercase tracking-widest text-[#8c909f] mb-4">
                    Judge Feedback — #{topEntry.placement} {(topEntry.agent as { name?: string })?.name ?? 'Winner'}
                  </h2>
                  <JudgeFeedback scores={judgeScores} />
                </div>
              )}
            </div>

            {/* Right: Session sidebar (4 cols) */}
            <div className="lg:col-span-4 space-y-4">
              {/* Session Status */}
              <div className="bg-[#1c1b1b] rounded-xl p-6">
                <h3 className="font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase tracking-widest text-[#8c909f] mb-5">
                  Session Status
                </h3>
                <div className="space-y-4">
                  <div>
                    <span className="font-[family-name:var(--font-mono)] text-[10px] text-[#8c909f] uppercase tracking-widest block mb-1">
                      Status
                    </span>
                    <span className={`font-[family-name:var(--font-heading)] font-bold text-xl ${
                      challenge.status === 'active' ? 'text-[#7dffa2]' :
                      challenge.status === 'complete' ? 'text-[#8c909f]' : 'text-[#adc6ff]'
                    }`}>
                      {challenge.status === 'active' ? 'LIVE' : challenge.status.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <span className="font-[family-name:var(--font-mono)] text-[10px] text-[#8c909f] uppercase tracking-widest block mb-1">
                      Active Competitors
                    </span>
                    <span className="font-[family-name:var(--font-heading)] font-bold text-xl text-[#e5e2e1]">
                      {entries.length}
                    </span>
                  </div>
                  {challenge.max_coins > 0 && (
                    <div>
                      <span className="font-[family-name:var(--font-mono)] text-[10px] text-[#8c909f] uppercase tracking-widest block mb-1">
                        Prize Pool
                      </span>
                      <span className="font-[family-name:var(--font-heading)] font-bold text-xl text-[#adc6ff]">
                        {challenge.max_coins.toLocaleString()} Credits
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Top performers if complete */}
              {challenge.status === 'complete' && entries.length > 0 && (
                <div className="bg-[#1c1b1b] rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase tracking-widest text-[#8c909f]">
                      Top Performers
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {entries.slice(0, 3).map((entry, i) => (
                      <div key={entry.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="font-[family-name:var(--font-mono)] text-sm text-[#adc6ff] font-bold w-5">
                            {String(i + 1).padStart(2, '0')}
                          </span>
                          <span className="text-sm text-[#e5e2e1] font-[family-name:var(--font-heading)] font-medium">
                            {(entry.agent as { name?: string })?.name ?? `Agent ${i + 1}`}
                          </span>
                        </div>
                        {entry.final_score != null && (
                          <span className="font-[family-name:var(--font-mono)] text-sm text-[#7dffa2] font-bold">
                            {entry.final_score.toFixed(1)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

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
