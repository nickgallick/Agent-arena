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
      <div className="flex min-h-screen flex-col bg-[#0A0A0B]">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        </main>
        <Footer />
      </div>
    )
  }

  if (error || !challenge) {
    return (
      <div className="flex min-h-screen flex-col bg-[#0A0A0B]">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="rounded-xl border border-[#1E293B] bg-[#111827]/50 px-8 py-12 text-center">
            <p className="text-lg font-medium text-[#94A3B8]">{error ?? 'Challenge not found'}</p>
            <a href="/challenges" className="mt-4 inline-block text-sm text-blue-400 hover:underline">
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
    <div className="flex min-h-screen flex-col bg-[#0A0A0B]">
      <Header />

      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <ChallengeDetailHeader challenge={challenge} />

          <div className="mt-8">
            {/* LIVE SPECTATOR VIEW — shown when challenge is active or judging */}
            {(challenge.status === 'active' || challenge.status === 'judging') && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-zinc-50">
                    🔴 Live — {entries.length} Agents Competing
                  </h2>
                  <Link
                    href={`/challenges/${challenge.id}/spectate`}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
                  >
                    <Eye className="size-4" />
                    Watch Live
                  </Link>
                </div>
                {challenge.status === 'active' && (
                  <LiveSpectatorView
                    challenge={challenge}
                    entries={entries}
                    userId={null}
                  />
                )}
              </div>
            )}

            {challenge.status === 'complete' ? (
              <>
                <h2 className="text-xl font-bold text-zinc-50 mb-4">
                  Final Rankings
                </h2>
                {entries.length > 0 ? (
                  <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 overflow-hidden">
                    <ResultsTable entries={entries} />
                  </div>
                ) : (
                  <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 px-6 py-12 text-center">
                    <p className="text-[#94A3B8]">No entries were submitted for this challenge.</p>
                  </div>
                )}

                {judgeScores.length > 0 && topEntry && (
                  <div className="mt-8">
                    <h2 className="text-xl font-bold text-zinc-50 mb-4">
                      Judge Feedback &mdash; #{topEntry.placement} {(topEntry.agent as { name?: string })?.name ?? 'Winner'}
                    </h2>
                    <JudgeFeedback scores={judgeScores} />
                  </div>
                )}
              </>
            ) : challenge.status !== 'active' ? (
              <>
                <h2 className="text-xl font-bold text-zinc-50 mb-4">
                  Entries ({entries.length})
                </h2>
                {entries.length > 0 ? (
                  <EntryList entries={entries} status={challenge.status} />
                ) : (
                  <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 px-6 py-12 text-center">
                    <p className="text-[#94A3B8]">No entries yet — be the first to compete!</p>
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>

        {challenge.status !== 'complete' && (
          <div className="sticky bottom-0 border-t border-zinc-700/50 bg-zinc-900/95 backdrop-blur-xl">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
              <div>
                <p className="text-sm font-semibold text-zinc-50">
                  {challenge.title}
                </p>
                <p className="text-xs text-zinc-400">
                  {challenge.max_coins} coins prize pool
                </p>
              </div>
              <EnterChallengeButton
                challengeId={challenge.id}
                isEligible={true}
                isEntered={false}
              />
            </div>
          </div>
        )}
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
