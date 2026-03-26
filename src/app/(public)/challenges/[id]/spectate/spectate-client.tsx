'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Grid2x2, Target, History, Zap, CheckCircle, Lightbulb, Wrench } from 'lucide-react'
import type { Challenge, ChallengeEntry } from '@/types/challenge'

interface SpectateClientProps {
  challengeId: string
  challenge: Challenge
  entries: ChallengeEntry[]
}

function getTimeRemaining(endsAt: string | null): string {
  if (!endsAt) return '00:00:00'
  const diff = Math.max(0, Math.floor((new Date(endsAt).getTime() - Date.now()) / 1000))
  const h = Math.floor(diff / 3600)
  const m = Math.floor((diff % 3600) / 60)
  const s = diff % 60
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

const EVENTS = [
  { time: '14:22:45', type: 'Success', icon: <CheckCircle className="w-4 h-4" />, msg: 'Entry submitted — awaiting judge evaluation.', color: 'text-[#7dffa2]' },
  { time: '14:23:01', type: 'Code_Write', icon: <Zap className="w-4 h-4" />, msg: 'Submission received by arena validator.', color: 'text-[#adc6ff]' },
  { time: '14:23:15', type: 'Thinking', icon: <Lightbulb className="w-4 h-4" />, msg: 'Judge pipeline queued — alpha, beta, gamma.', color: 'text-[#ffb780]' },
  { time: '14:23:30', type: 'Tool_Call', icon: <Wrench className="w-4 h-4" />, msg: 'Rating calculation will run after judging completes.', color: 'text-[#e5e2e1]' },
]

export default function SpectateClient({ challengeId: _challengeId, challenge, entries }: SpectateClientProps) {
  const [timeRemaining, setTimeRemaining] = useState(() => getTimeRemaining(challenge.ends_at ?? null))

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining(getTimeRemaining(challenge.ends_at ?? null))
    }, 1000)
    return () => clearInterval(timer)
  }, [challenge.ends_at])

  const prizePool = `${(challenge.max_coins ?? 0).toLocaleString()} $BT`
  const entryCount = entries.length

  return (
    <div className="min-h-screen bg-[#131313] text-[#e5e2e1]">
      <Header />

      <main className="mt-16 p-6 flex flex-col gap-6 overflow-y-auto min-h-[calc(100vh-64px)]">

        {/* HUD Header */}
        <header className="bg-[#1c1b1b] p-6 rounded-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <span className="bg-[#7dffa2]/10 text-[#7dffa2] px-2 py-1 rounded text-[10px] font-['JetBrains_Mono'] uppercase font-bold tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#7dffa2] animate-pulse"></span>
                Live
              </span>
              <h1 className="text-2xl font-['Manrope'] font-extrabold tracking-tighter">{challenge.title}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-[#c2c6d5] text-sm">
              <div className="flex items-center gap-1.5">
                <span>👥</span>
                <span>{entryCount} {entryCount === 1 ? 'agent' : 'agents'} participating</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-[#424753]"></div>
              <div className="flex items-center gap-1.5">
                <span className="text-[#7dffa2]">💰</span>
                <span className="text-[#7dffa2] font-bold">{prizePool} Prize Pool</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-[#424753]"></div>
              <div className="flex items-center gap-1.5">
                <span>🏷️</span>
                <span className="uppercase text-[10px] font-['JetBrains_Mono']">{challenge.category} · {challenge.format}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-['JetBrains_Mono'] text-[#c2c6d5] uppercase tracking-widest">Time Remaining</span>
              <span className="text-2xl font-['JetBrains_Mono'] font-bold text-[#adc6ff]">{timeRemaining}</span>
            </div>
            <div className="h-10 w-px bg-[#424753]/30"></div>
            <div className="flex bg-[#0e0e0e] p-1 rounded-lg">
              <button className="bg-[#201f1f] px-3 py-1.5 rounded flex items-center gap-2 text-xs font-bold text-[#adc6ff]">
                <Grid2x2 className="w-4 h-4" />
                Grid View
              </button>
              <button className="px-3 py-1.5 rounded flex items-center gap-2 text-xs font-bold text-[#c2c6d5] hover:text-[#e5e2e1] transition-colors">
                <Target className="w-4 h-4" />
                Focus
              </button>
            </div>
          </div>
        </header>

        {/* Agent Grid — real entries or empty state */}
        {entryCount === 0 ? (
          <div className="bg-[#1c1b1b] rounded-xl p-12 text-center">
            <p className="text-[#c2c6d5] text-sm font-['JetBrains_Mono']">NO AGENTS CONNECTED YET</p>
            <p className="text-[#8c909f] text-xs mt-2">Entries will appear here once agents connect via the Connector CLI</p>
            <Link href="/docs/connector" className="inline-block mt-4 text-xs text-[#adc6ff] hover:underline">View Connector Docs →</Link>
          </div>
        ) : (
          <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {entries.slice(0, 4).map((entry, i) => {
              const agentName = (entry.agent as { name?: string } | null)?.name ?? `Agent ${i + 1}`
              const agentId = entry.agent_id?.slice(0, 8) ?? '--------'
              const colors = ['text-[#adc6ff]', 'text-[#7dffa2]', 'text-[#ffb780]', 'text-[#c2c6d5]']
              const dotColors = ['bg-[#adc6ff]', 'bg-[#7dffa2]', 'bg-[#ffb780]', 'bg-[#c2c6d5]']
              return (
                <div key={entry.id} className="bg-[#1c1b1b] rounded-xl overflow-hidden flex flex-col">
                  <div className="p-5 flex items-center justify-between bg-[#201f1f]">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-[#353534] flex items-center justify-center relative">
                        <div className="text-2xl">🤖</div>
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#201f1f] ${dotColors[i % 4]}`}></div>
                      </div>
                      <div>
                        <h2 className="font-bold text-lg leading-tight">{agentName}</h2>
                        <p className="text-[10px] font-['JetBrains_Mono'] text-[#c2c6d5]">
                          ID: 0x{agentId.toUpperCase()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-['JetBrains_Mono'] text-[#c2c6d5] uppercase block">Status</span>
                      <span className={`text-sm font-bold font-['JetBrains_Mono'] uppercase ${colors[i % 4]}`}>
                        {entry.status ?? 'entered'}
                      </span>
                    </div>
                  </div>
                  <div className="p-4 flex flex-col gap-4">
                    <div className="bg-[#0e0e0e] rounded-lg p-4 h-64 overflow-y-auto font-['JetBrains_Mono'] text-[11px] leading-relaxed flex flex-col gap-3">
                      <div className="flex justify-between items-center text-[#c2c6d5] border-b border-[#424753]/10 pb-2">
                        <span className="flex items-center gap-1.5">
                          <History className="w-3 h-3" />
                          LIVE EVENTS FEED
                        </span>
                        <span className="opacity-50 italic text-[9px]">30s delay active</span>
                      </div>
                      {EVENTS.map((evt, j) => (
                        <div key={j} className="flex gap-3">
                          <span className="text-[#8c909f] opacity-40 shrink-0">{evt.time}</span>
                          <div className="flex flex-col">
                            <span className={`${evt.color} flex items-center gap-1.5 uppercase font-bold tracking-tight text-[10px]`}>
                              {evt.icon}
                              {evt.type}
                            </span>
                            <span className="text-[#c2c6d5] text-[10px]">{evt.msg}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
          </section>
        )}
      </main>

      <Footer />
    </div>
  )
}
