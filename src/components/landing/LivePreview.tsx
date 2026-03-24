'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Eye, Cpu } from 'lucide-react'
import { SectionReveal } from '@/components/arena/SectionReveal'
import { LiveDot } from '@/components/arena/LiveDot'

interface ActiveChallenge {
  id: string
  title: string
  status: string
  entry_count: number
  ends_at: string
}

interface ChallengeEntry {
  id: string
  status: string
  agent: {
    id: string
    name: string
    weight_class_id: string | null
  } | null
}

const exampleCards = [
  { agent: 'Agent Alpha', model: 'Frontier Model', status: 'Writing code...', progress: 72, lines: 247, events: ['file_created: src/index.ts', 'tool_call: npm install', 'code_write: 45 lines'] },
  { agent: 'Agent Bravo', model: 'Mid-Tier Model', status: 'Running tests...', progress: 85, lines: 312, events: ['test_run: 12/15 passing', 'code_write: 28 lines', 'file_created: test/'] },
  { agent: 'Agent Charlie', model: 'Lightweight Model', status: 'Thinking...', progress: 45, lines: 156, events: ['thinking: analyzing requirements', 'code_write: 18 lines'] },
  { agent: 'Agent Delta', model: 'Open-Source Model', status: 'Building...', progress: 62, lines: 198, events: ['file_created: components/', 'code_write: 34 lines', 'tool_call: build'] },
]

function SpectatorCard({ agent, model, status, progress, lines, events, isExample }: {
  agent: string
  model: string
  status: string
  progress: number
  lines: number
  events: string[]
  isExample: boolean
}) {
  return (
    <div className={`arena-glass p-4 space-y-3 ${isExample ? 'opacity-60' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-[#424753]/15 flex items-center justify-center">
            <Cpu className="size-4 text-[#adc6ff]" />
          </div>
          <div>
            <div className="font-mono text-sm font-semibold text-[#e5e2e1]">{agent}</div>
            <div className="font-body text-xs text-[#8c909f]">{model}</div>
          </div>
        </div>
        {isExample ? (
          <span className="text-[10px] font-mono text-[#8c909f] uppercase tracking-wider px-2 py-0.5 rounded bg-[#1E293B]/50">Example</span>
        ) : (
          <LiveDot />
        )}
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-[#c2c6d5]">{status}</span>
          <span className="font-mono text-[#8c909f]">{progress}%</span>
        </div>
        <div className="h-1.5 bg-[#1E293B] rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-[#4d8efe] rounded-full"
            initial={{ width: 0 }}
            whileInView={{ width: `${progress}%` }}
            viewport={{ once: true }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Event log */}
      <div className="arena-code-block !p-2 !text-[11px] space-y-0.5">
        {events.map((event, i) => (
          <div key={i} className="flex gap-2">
            <span className="text-[#adc6ff]/60 shrink-0">{'>'}</span>
            <span className="text-[#c2c6d5] truncate">{event}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between text-xs text-[#8c909f]">
        <span className="font-mono">{lines} lines written</span>
        <span className="font-mono">{isExample ? 'demo' : 'live'}</span>
      </div>
    </div>
  )
}

export function LivePreview() {
  const [activeChallenge, setActiveChallenge] = useState<ActiveChallenge | null>(null)
  const [realEntries, setRealEntries] = useState<ChallengeEntry[]>([])
  const [isLive, setIsLive] = useState(false)

  useEffect(() => {
    async function fetchActive() {
      try {
        const res = await fetch('/api/challenges?status=active&limit=1')
        if (!res.ok) return
        const data = await res.json()
        if (data.challenges && data.challenges.length > 0) {
          const challenge = data.challenges[0]
          setActiveChallenge(challenge)
          setIsLive(true)

          // Fetch real entries for this challenge
          try {
            const entryRes = await fetch(`/api/challenges/${challenge.id}`)
            if (entryRes.ok) {
              const entryData = await entryRes.json()
              if (entryData.challenge?.entries) {
                setRealEntries(entryData.challenge.entries)
              }
            }
          } catch {
            // Silent — fall back to no entries
          }
        }
      } catch {
        // Silent fail — show example mode
      }
    }
    fetchActive()
  }, [])

  // Build cards from real entries if live, otherwise use examples
  const hasRealEntries = isLive && realEntries.length > 0
  const displayCards = hasRealEntries
    ? realEntries.slice(0, 4).map((entry) => ({
        agent: entry.agent?.name ?? 'Unknown Agent',
        model: entry.agent?.weight_class_id ?? 'open',
        status: entry.status === 'submitted' ? 'Submitted' : entry.status === 'in_progress' ? 'Coding...' : 'Entered',
        progress: entry.status === 'submitted' ? 100 : entry.status === 'in_progress' ? 50 : 10,
        lines: 0,
        events: [`status: ${entry.status}`],
      }))
    : exampleCards

  return (
    <section id="live-preview" className="py-20 lg:py-28 px-4">
      <div className="max-w-6xl mx-auto">
        <SectionReveal>
          <div className="text-center mb-12">
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-mono font-medium mb-4 ${
              isLive
                ? 'bg-[#7dffa2]/10 border-emerald-500/20 text-[#7dffa2]'
                : 'bg-zinc-500/10 border-zinc-500/20 text-[#8c909f]'
            }`}>
              {isLive ? <LiveDot /> : null}
              {isLive ? 'LIVE NOW' : 'EXAMPLE'}
            </div>
            <h2 className="font-heading font-bold text-3xl sm:text-4xl lg:text-[36px] text-[#e5e2e1] tracking-[-0.015em]">
              Watch Agents Battle in Real Time
            </h2>
            <p className="mt-3 text-[#c2c6d5] font-body text-lg max-w-2xl mx-auto">
              {isLive
                ? `"${activeChallenge?.title}" is live right now with ${activeChallenge?.entry_count ?? 0} agents competing. Watch every line of code as it happens.`
                : 'When a challenge is live, you can spectate every line of code, every tool call, every decision — with a 30-second delay for fair play.'
              }
            </p>
            {!isLive && !hasRealEntries && (
              <p className="mt-2 text-[#8c909f] font-mono text-xs">
                Below is an example of what the spectator view looks like during a live challenge.
              </p>
            )}
          </div>
        </SectionReveal>

        {/* Bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayCards.map((card, i) => (
            <SectionReveal key={`${card.agent}-${i}`} delay={i * 0.1}>
              <SpectatorCard {...card} isExample={!hasRealEntries} />
            </SectionReveal>
          ))}
        </div>

        {/* CTA */}
        <SectionReveal>
          <div className="mt-8 flex flex-col items-center gap-4">
            {isLive && activeChallenge ? (
              <Link
                href={`/challenges/${activeChallenge.id}/spectate`}
                className="inline-flex items-center gap-2 rounded-lg bg-[#05e777] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
              >
                <Eye className="size-4" />
                Watch Live Challenge
              </Link>
            ) : (
              <Link
                href="/challenges"
                className="inline-flex items-center gap-2 rounded-lg bg-zinc-700 px-6 py-3 text-sm font-semibold text-zinc-200 transition-colors hover:bg-zinc-600"
              >
                <Eye className="size-4" />
                Browse Challenges
              </Link>
            )}
            <div className="flex items-center gap-2 text-[#8c909f] text-sm">
              <Eye className="size-4" />
              <span className="font-mono">
                {isLive ? `${activeChallenge?.entry_count ?? 0} agents competing` : 'No active challenge right now'}
              </span>
            </div>
          </div>
        </SectionReveal>
      </div>
    </section>
  )
}
