'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/lib/hooks/use-user'
import { LiveSpectatorView } from '@/components/spectator/live-spectator-view'
import { Users, Eye, Grid3X3, Focus, Clock, CheckCircle2, Terminal, Brain, Wrench, Rocket } from 'lucide-react'
import type { Challenge, ChallengeEntry } from '@/types/challenge'

interface SpectateClientProps {
  challenge: Challenge
  entries: ChallengeEntry[]
}

function CountdownTimer({ endsAt }: { endsAt: string }) {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    function update() {
      const diff = new Date(endsAt).getTime() - Date.now()
      if (diff <= 0) { setTimeLeft('00:00:00'); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setTimeLeft(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`)
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [endsAt])

  return <span>{timeLeft}</span>
}

export function SpectateClient({ challenge, entries }: SpectateClientProps) {
  const { user } = useUser()
  const [viewMode, setViewMode] = useState<'grid' | 'focus'>('grid')

  return (
    <div className="flex flex-col gap-6">
      {/* Arena Header HUD */}
      <header className="bg-[#1c1b1b] p-6 rounded-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span className="bg-[#7dffa2]/10 text-[#7dffa2] px-2 py-1 rounded text-[10px] font-['JetBrains_Mono'] uppercase font-bold tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#7dffa2] animate-pulse" />
              Live
            </span>
            <h1 className="text-2xl font-extrabold tracking-tighter">{challenge.title}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-[#c2c6d5] text-sm">
            <div className="flex items-center gap-1.5">
              <Users className="w-[14px] h-[14px]" />
              <span>{entries.length} Agents participating</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-[#424753]" />
            <div className="flex items-center gap-1.5">
              <Eye className="w-[14px] h-[14px]" />
              <span className="text-[#7dffa2] font-bold">{challenge.max_coins.toLocaleString()} Max Coins</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-[#424753]" />
            <div className="flex items-center gap-1.5">
              <Eye className="w-[14px] h-[14px]" />
              <span>{challenge.entry_count.toLocaleString()} entries</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-['JetBrains_Mono'] text-[#c2c6d5] uppercase tracking-widest">Time Remaining</span>
            <span className="text-2xl font-['JetBrains_Mono'] font-bold text-[#adc6ff]">
              <CountdownTimer endsAt={challenge.ends_at} />
            </span>
          </div>
          <div className="h-10 w-px bg-[#424753]/30" />
          <div className="flex bg-[#0e0e0e] p-1 rounded-lg">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded flex items-center gap-2 text-xs font-bold ${viewMode === 'grid' ? 'bg-[#201f1f] text-[#adc6ff]' : 'text-[#c2c6d5] hover:text-[#e5e2e1] transition-colors'}`}
            >
              <Grid3X3 className="w-[14px] h-[14px]" />
              Grid View
            </button>
            <button
              onClick={() => setViewMode('focus')}
              className={`px-3 py-1.5 rounded flex items-center gap-2 text-xs font-bold ${viewMode === 'focus' ? 'bg-[#201f1f] text-[#adc6ff]' : 'text-[#c2c6d5] hover:text-[#e5e2e1] transition-colors'}`}
            >
              <Focus className="w-[14px] h-[14px]" />
              Focus
            </button>
          </div>
        </div>
      </header>

      {/* Agent Grid */}
      <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {entries.map((entry, index) => (
          <div key={entry.id} className="bg-[#1c1b1b] rounded-xl overflow-hidden flex flex-col">
            <div className="p-5 flex items-center justify-between bg-[#201f1f]">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-[#353534] flex items-center justify-center relative overflow-hidden">
                  {entry.agent?.avatar_url ? (
                    <img className="rounded-lg grayscale w-full h-full object-cover" src={entry.agent.avatar_url} alt={entry.agent?.name ?? 'Agent'} />
                  ) : (
                    <span className="text-[#8c909f] text-lg font-bold">
                      {(entry.agent?.name ?? 'A').charAt(0).toUpperCase()}
                    </span>
                  )}
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#1c1b1b] ${index % 2 === 0 ? 'bg-[#adc6ff]' : 'bg-[#7dffa2]'}`} />
                </div>
                <div>
                  <h2 className="font-bold text-lg leading-tight">{entry.agent?.name ?? 'Unknown Agent'}</h2>
                  <p className="text-[10px] font-['JetBrains_Mono'] text-[#c2c6d5]">ID: {entry.agent_id.slice(0, 5)}...{entry.agent_id.slice(-3)}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-['JetBrains_Mono'] text-[#c2c6d5] uppercase block">Confidence</span>
                <span className={`text-xl font-bold ${index % 2 === 0 ? 'text-[#adc6ff]' : 'text-[#7dffa2]'}`}>
                  {entry.final_score != null ? `${entry.final_score}%` : '--'}
                </span>
              </div>
            </div>
            {/* Live Stream Content Replacement (Events Feed) */}
            <div className="p-4 flex flex-col gap-4">
              <div className="bg-[#0e0e0e] rounded-lg p-4 h-64 overflow-y-auto font-['JetBrains_Mono'] text-[11px] leading-relaxed flex flex-col gap-3">
                <div className="flex justify-between items-center text-[#c2c6d5] border-b border-white/5 pb-2">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    LIVE EVENTS FEED
                  </span>
                  <span className="opacity-50 italic">30s delay active</span>
                </div>
                <div className="flex gap-3">
                  <span className="text-[#c2c6d5] opacity-40 shrink-0">--:--:--</span>
                  <div className="flex flex-col">
                    <span className="text-[#7dffa2] flex items-center gap-1.5 uppercase font-bold tracking-tight">
                      <CheckCircle2 className="w-[14px] h-[14px]" />
                      Success
                    </span>
                    <span className="text-[#c2c6d5]">Initializing agent kernel...</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="text-[#c2c6d5] opacity-40 shrink-0">--:--:--</span>
                  <div className="flex flex-col">
                    <span className="text-[#adc6ff] flex items-center gap-1.5 uppercase font-bold tracking-tight">
                      <Terminal className="w-[14px] h-[14px]" />
                      Code_Write
                    </span>
                    <span className="text-[#c2c6d5]">Injecting optimization script...</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="text-[#c2c6d5] opacity-40 shrink-0">--:--:--</span>
                  <div className="flex flex-col">
                    <span className="text-[#ffb780] flex items-center gap-1.5 uppercase font-bold tracking-tight">
                      <Brain className="w-[14px] h-[14px]" />
                      Thinking
                    </span>
                    <span className="text-[#c2c6d5]">Evaluating cost-benefit ratio...</span>
                  </div>
                </div>
                <div className="flex gap-3 animate-pulse">
                  <span className="text-[#c2c6d5] opacity-40 shrink-0">--:--:--</span>
                  <div className="flex flex-col">
                    <span className="text-[#e5e2e1] flex items-center gap-1.5 uppercase font-bold tracking-tight">
                      <Wrench className="w-[14px] h-[14px]" />
                      Tool_Call
                    </span>
                    <span className="text-[#c2c6d5]">Requesting data access...</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Comparative Performance Index Chart */}
      <section className="bg-[#1c1b1b] p-6 rounded-xl flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <h3 className="font-bold text-sm tracking-tight">Performance Index Delta</h3>
            <p className="text-xs text-[#c2c6d5]">Real-time competitive divergence analysis</p>
          </div>
          <div className="flex items-center gap-4 text-[10px] font-['JetBrains_Mono'] uppercase">
            {entries.slice(0, 2).map((entry, index) => (
              <div key={entry.id} className="flex items-center gap-2">
                <span className={`w-3 h-0.5 ${index === 0 ? 'bg-[#adc6ff]' : 'bg-[#7dffa2]'}`} />
                <span>{entry.agent?.name ?? `Agent ${index + 1}`}</span>
              </div>
            ))}
          </div>
        </div>
        {/* Mock SVG Chart */}
        <div className="h-48 w-full relative bg-[#0e0e0e] rounded-lg border border-white/5 overflow-hidden">
          <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
            {/* Grid lines */}
            <line stroke="#424753" strokeDasharray="1,1" strokeWidth="0.1" x1="0" x2="100" y1="20" y2="20" />
            <line stroke="#424753" strokeDasharray="1,1" strokeWidth="0.1" x1="0" x2="100" y1="40" y2="40" />
            <line stroke="#424753" strokeDasharray="1,1" strokeWidth="0.1" x1="0" x2="100" y1="60" y2="60" />
            <line stroke="#424753" strokeDasharray="1,1" strokeWidth="0.1" x1="0" x2="100" y1="80" y2="80" />
            {/* Alpha Line (Primary) */}
            <path d="M0 70 Q 10 65, 20 68 T 40 55 T 60 45 T 80 50 T 100 35" fill="none" stroke="#adc6ff" strokeWidth="0.5" />
            {/* Beta Line (Secondary) */}
            <path d="M0 75 Q 15 70, 25 60 T 45 40 T 65 30 T 85 25 T 100 15" fill="none" stroke="#7dffa2" strokeWidth="0.5" />
            {/* Shaded areas */}
            <path d="M0 70 Q 10 65, 20 68 T 40 55 T 60 45 T 80 50 T 100 35 L 100 100 L 0 100 Z" fill="url(#grad-primary)" fillOpacity="0.05" />
            <path d="M0 75 Q 15 70, 25 60 T 45 40 T 65 30 T 85 25 T 100 15 L 100 100 L 0 100 Z" fill="url(#grad-secondary)" fillOpacity="0.05" />
            <defs>
              <linearGradient id="grad-primary" x1="0%" x2="0%" y1="0%" y2="100%">
                <stop offset="0%" style={{ stopColor: '#adc6ff', stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: '#adc6ff', stopOpacity: 0 }} />
              </linearGradient>
              <linearGradient id="grad-secondary" x1="0%" x2="0%" y1="0%" y2="100%">
                <stop offset="0%" style={{ stopColor: '#7dffa2', stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: '#7dffa2', stopOpacity: 0 }} />
              </linearGradient>
            </defs>
          </svg>
          {/* Tooltip Placeholder */}
          <div className="absolute top-10 right-20 bg-[#353534] border border-[#adc6ff]/20 p-2 rounded shadow-xl backdrop-blur-md pointer-events-none">
            <div className="text-[9px] font-['JetBrains_Mono'] text-[#c2c6d5]">
              T+ <CountdownTimer endsAt={challenge.ends_at} />
            </div>
            <div className="text-xs font-bold text-[#7dffa2]">Delta: --</div>
          </div>
        </div>
      </section>

      {/* Live spectator view */}
      <LiveSpectatorView
        challenge={challenge}
        entries={entries}
        userId={user?.id ?? null}
      />
    </div>
  )
}
