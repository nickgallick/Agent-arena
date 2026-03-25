'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { GlassCard } from '@/components/arena/GlassCard'
import { SectionReveal } from '@/components/arena/SectionReveal'

interface ReplayResult {
  challenge_title: string
  category: string
  placement: number | null
  score: number | null
  elo_change: number | null
  submission_text: string | null
  transcript: unknown[] | null
  screenshot_urls: Array<{ viewport: string; url: string }> | null
}

export default function ReplayPage() {
  const params = useParams<{ id: string }>()
  const [result, setResult] = useState<ReplayResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchReplay() {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch(`/api/replays/${params.id}`)
        if (res.status === 404) {
          setError('Replay not found')
          return
        }
        if (res.status === 403) {
          setError('Replay not available until challenge is complete')
          return
        }
        if (!res.ok) {
          throw new Error('Failed to load replay')
        }
        const data = await res.json()
        const replay = data.replay
        if (!replay) {
          setError('Replay not found')
          return
        }
        setResult({
          challenge_title: replay.challenge?.title ?? 'Challenge',
          category: replay.challenge?.category ?? 'unknown',
          placement: replay.placement,
          score: replay.final_score,
          elo_change: replay.elo_change ?? null,
          submission_text: replay.submission_text,
          transcript: replay.transcript,
          screenshot_urls: replay.screenshot_urls ?? null,
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load replay')
      } finally {
        setLoading(false)
      }
    }
    fetchReplay()
  }, [params.id])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#131313]">
        <Header />
        <main className="flex-1 pt-20 flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#4d8efe] border-t-transparent" />
        </main>
        <Footer />
      </div>
    )
  }

  if (error || !result) {
    return (
      <div className="min-h-screen bg-[#131313]">
        <Header />
        <main className="flex-1 pt-20 flex items-center justify-center py-20">
          <div className="rounded-xl border border-white/5 bg-[#1c1b1b]/50 px-8 py-12 text-center">
            <p className="text-lg font-medium text-[#c2c6d5]">{error ?? 'Replay not available'}</p>
            <a href="/challenges" className="mt-4 inline-block text-sm text-[#adc6ff] hover:text-[#adc6ff]">
              ← Browse challenges
            </a>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#131313]">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <SectionReveal>
          <GlassCard className="p-8 mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mb-6">
              <div>
                <h1 className="font-heading text-3xl font-bold text-[#e5e2e1]">
                  {result.challenge_title}
                </h1>
                <p className="text-[#c2c6d5] font-body mt-2">
                  Replay entry #{params.id} • Challenge concluded
                </p>
              </div>
              {result.placement !== null && (
                <div className="text-right">
                  <div className="font-mono text-4xl font-bold text-[#e5e2e1]">
                    #{result.placement}
                  </div>
                  <div className="text-[#8c909f] font-mono text-xs uppercase tracking-wider">
                    Placement
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {result.score !== null && (
                <div>
                  <div className="font-mono text-xs font-medium text-[#8c909f] uppercase tracking-wider">Score</div>
                  <div className="font-mono text-2xl font-bold text-[#e5e2e1] mt-1">{result.score}/100</div>
                </div>
              )}
              {result.elo_change !== null && (
                <div>
                  <div className="font-mono text-xs font-medium text-[#8c909f] uppercase tracking-wider">ELO Change</div>
                  <div className={`font-mono text-2xl font-bold mt-1 ${result.elo_change >= 0 ? 'text-[#7dffa2]' : 'text-[#ffb4ab]'}`}>
                    {result.elo_change >= 0 ? '+' : ''}{result.elo_change}
                  </div>
                </div>
              )}
              <div>
                <div className="font-mono text-xs font-medium text-[#8c909f] uppercase tracking-wider">Category</div>
                <div className="font-body text-sm font-medium text-[#e5e2e1] mt-1 capitalize">{result.category.replace('_', ' ')}</div>
              </div>
            </div>
          </GlassCard>
        </SectionReveal>

        {result.screenshot_urls && result.screenshot_urls.length > 0 && (
          <SectionReveal delay={0.1}>
            <GlassCard className="p-8 mb-8">
              <h2 className="font-heading text-xl font-semibold text-[#e5e2e1] mb-4">
                Visual Output
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {result.screenshot_urls.map((ss) => (
                  <div key={ss.viewport} className="rounded-xl border border-white/5 bg-[#131313] overflow-hidden">
                    <div className="px-4 py-2 border-b border-white/5 text-xs font-mono text-[#8c909f] uppercase tracking-wider">
                      {ss.viewport === 'desktop' ? '🖥️ Desktop (1280×800)' : '📱 Mobile (375×812)'}
                    </div>
                    <div className="p-2">
                      <img
                        src={ss.url}
                        alt={`${ss.viewport} screenshot`}
                        className="w-full rounded-lg border border-white/5"
                        loading="lazy"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </SectionReveal>
        )}

        <SectionReveal delay={result.screenshot_urls?.length ? 0.2 : 0.1}>
          <GlassCard className="p-8">
            <h2 className="font-heading text-xl font-semibold text-[#e5e2e1] mb-4">
              Submission
            </h2>
            {result.submission_text ? (
              <div className="arena-code-block">
                <pre className="whitespace-pre-wrap text-[#10B981] text-sm font-mono">{result.submission_text}</pre>
              </div>
            ) : (
              <div className="text-[#8c909f] text-sm">No submission text available.</div>
            )}
          </GlassCard>
        </SectionReveal>
      </main>
      <Footer />
    </div>
  )
}
