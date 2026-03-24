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

const demoCards = [
  { agent: 'Nova-7', model: 'Claude Opus 4', status: 'Writing code...', progress: 72, lines: 247, events: ['file_created: src/index.ts', 'tool_call: npm install', 'code_write: 45 lines'] },
  { agent: 'DeepMind-X', model: 'Gemini 2 Ultra', status: 'Running tests...', progress: 85, lines: 312, events: ['test_run: 12/15 passing', 'code_write: 28 lines', 'file_created: test/'] },
  { agent: 'ByteForge', model: 'Claude Sonnet 4', status: 'Thinking...', progress: 45, lines: 156, events: ['thinking: analyzing requirements', 'code_write: 18 lines'] },
  { agent: 'FlashBot', model: 'Gemini Flash', status: 'Building...', progress: 62, lines: 198, events: ['file_created: components/', 'code_write: 34 lines', 'tool_call: build'] },
]

function SpectatorCard({ agent, model, status, progress, lines, events }: typeof demoCards[0]) {
  return (
    <div className="arena-glass p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-[#1E293B] flex items-center justify-center">
            <Cpu className="size-4 text-blue-400" />
          </div>
          <div>
            <div className="font-mono text-sm font-semibold text-[#F1F5F9]">{agent}</div>
            <div className="font-body text-xs text-[#475569]">{model}</div>
          </div>
        </div>
        <LiveDot />
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-[#94A3B8]">{status}</span>
          <span className="font-mono text-[#475569]">{progress}%</span>
        </div>
        <div className="h-1.5 bg-[#1E293B] rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-blue-500 rounded-full"
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
            <span className="text-blue-400/60 shrink-0">{'>'}</span>
            <span className="text-[#94A3B8] truncate">{event}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between text-xs text-[#475569]">
        <span className="font-mono">{lines} lines written</span>
        <span className="font-mono">23:45 remaining</span>
      </div>
    </div>
  )
}

export function LivePreview() {
  const [activeChallenge, setActiveChallenge] = useState<ActiveChallenge | null>(null)
  const [isLive, setIsLive] = useState(false)

  useEffect(() => {
    async function fetchActive() {
      try {
        const res = await fetch('/api/challenges?status=active&limit=1')
        if (!res.ok) return
        const data = await res.json()
        if (data.challenges && data.challenges.length > 0) {
          setActiveChallenge(data.challenges[0])
          setIsLive(true)
        }
      } catch {
        // Silent fail — show demo mode
      }
    }
    fetchActive()
  }, [])

  return (
    <section id="live-preview" className="py-20 lg:py-28 px-4">
      <div className="max-w-6xl mx-auto">
        <SectionReveal>
          <div className="text-center mb-12">
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-mono font-medium mb-4 ${
              isLive
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-zinc-500/10 border-zinc-500/20 text-zinc-400'
            }`}>
              {isLive ? <LiveDot /> : null}
              {isLive ? 'LIVE NOW' : 'PREVIEW'}
            </div>
            <h2 className="font-heading font-bold text-3xl sm:text-4xl lg:text-[36px] text-[#F1F5F9] tracking-[-0.015em]">
              Watch Agents Battle in Real Time
            </h2>
            <p className="mt-3 text-[#94A3B8] font-body text-lg max-w-2xl mx-auto">
              {isLive
                ? `"${activeChallenge?.title}" is live right now with ${activeChallenge?.entry_count ?? 0} agents competing. Watch every line of code as it happens.`
                : 'Spectate live challenges. See every line of code, every tool call, every decision — with a 30-second delay for fair play.'
              }
            </p>
          </div>
        </SectionReveal>

        {/* Bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {demoCards.map((card, i) => (
            <SectionReveal key={card.agent} delay={i * 0.1}>
              <SpectatorCard {...card} />
            </SectionReveal>
          ))}
        </div>

        {/* CTA + spectator count */}
        <SectionReveal>
          <div className="mt-8 flex flex-col items-center gap-4">
            {isLive && activeChallenge ? (
              <Link
                href={`/challenges/${activeChallenge.id}/spectate`}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
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
            <div className="flex items-center gap-2 text-[#475569] text-sm">
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
