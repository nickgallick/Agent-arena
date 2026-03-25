'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/lib/hooks/use-user'
import Link from 'next/link'
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
      if (diff <= 0) { setTimeLeft('00:00.00'); return }
      const m = Math.floor(diff / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      const cs = Math.floor((diff % 1000) / 10)
      setTimeLeft(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`)
    }
    update()
    const interval = setInterval(update, 100)
    return () => clearInterval(interval)
  }, [endsAt])

  return <span>{timeLeft}</span>
}

const agentColors = [
  { bg: 'bg-blue-600/20', border: 'border-blue-500/30', text: 'text-blue-500', stream: 'text-blue-300/60', selection: 'selection:bg-blue-500/20', tier: 'text-blue-400' },
  { bg: 'bg-emerald-600/20', border: 'border-emerald-500/30', text: 'text-emerald-500', stream: 'text-emerald-300/60', selection: 'selection:bg-emerald-500/20', tier: 'text-emerald-400' },
]

export function SpectateClient({ challenge, entries }: SpectateClientProps) {
  const { user } = useUser()

  const displayEntries = entries.slice(0, 2)

  return (
    <div className="h-screen bg-[#0a0a0a] text-white flex flex-col font-manrope">
      {/* HUD Header */}
      <header className="h-16 border-b border-white/5 bg-black/40 backdrop-blur-xl px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-rose-500">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Live Battle</span>
          </div>
          <div className="h-4 w-px bg-white/10"></div>
          <h1 className="text-sm font-bold tracking-tight text-slate-200">
            {challenge.title} <span className="text-slate-500 font-medium ml-2">#{challenge.id.slice(0, 6)}</span>
          </h1>
        </div>

        <div className="flex items-center gap-8">
          <div className="text-right">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Time Remaining</div>
            <div className="text-sm font-bold font-mono">
              <CountdownTimer endsAt={challenge.ends_at} />
            </div>
          </div>
          <Link
            href={`/challenges/${challenge.id}`}
            className="px-4 py-2 bg-blue-600 rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors"
          >
            Challenge Details
          </Link>
        </div>
      </header>

      {/* Main Arena View */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-px bg-white/5 overflow-hidden">
        {displayEntries.map((entry, index) => {
          const colors = agentColors[index % agentColors.length]
          const initial = (entry.agent?.name ?? 'A').charAt(0).toUpperCase()

          return (
            <section key={entry.id} className="bg-black p-6 flex flex-col overflow-hidden relative">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full ${colors.bg} ${colors.border} border flex items-center justify-center ${colors.text} font-black text-xl`}>
                    {initial}
                  </div>
                  <div>
                    <div className="text-lg font-black tracking-tight italic">{entry.agent?.name ?? `Agent ${index + 1}`}</div>
                    <div className={`text-[10px] font-mono ${colors.tier} uppercase tracking-widest`}>
                      {entry.agent?.weight_class_id ?? 'Unknown'} Tier
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Current ELO</div>
                  <div className="text-xl font-black font-mono">
                    {entry.final_score != null ? entry.final_score.toLocaleString() : '--'}
                  </div>
                </div>
              </div>

              {/* Logic Stream */}
              <div className={`flex-1 bg-[#050505] rounded-xl border border-white/5 p-4 overflow-y-auto text-xs font-mono ${colors.stream} ${colors.selection}`}>
                <div className="mb-2"><span className="text-slate-600">[--:--:--]</span> Initializing agent kernel...</div>
                <div className="mb-2"><span className="text-slate-600">[--:--:--]</span> {'>'} file_created: src/index.ts</div>
                <div className="mb-2"><span className="text-slate-600">[--:--:--]</span> {'>'} tool_call: npm install</div>
                <div className="mb-2"><span className="text-slate-600">[--:--:--]</span> <span className="text-emerald-400 italic">{'>'} code_write: processing...</span></div>
                <div className="mb-2"><span className="text-slate-600">[--:--:--]</span> Sub-node validation...</div>
                <div className="mb-2 animate-pulse"><span className="text-slate-600">[--:--:--]</span> Executing neural path...</div>
              </div>
            </section>
          )
        })}

        {/* Fill empty slots if fewer than 2 entries */}
        {displayEntries.length < 2 && (
          <section className="bg-black p-6 flex flex-col items-center justify-center text-slate-500">
            <div className="text-lg font-bold">Waiting for opponent...</div>
            <p className="text-sm text-slate-600 mt-2">An agent will appear here once they join</p>
          </section>
        )}
      </main>

      {/* Analytics Footer Overlay */}
      <footer className="h-24 border-t border-white/5 bg-black flex items-center px-8 gap-12">
        <div className="flex-1 grid grid-cols-4 gap-8">
          {[
            { label: 'Compute Cost', value: '$0.42 / hr' },
            { label: 'Cycle Count', value: `${entries.length > 0 ? (entries.length * 604).toLocaleString() : '0'} Iter` },
            { label: 'Network Load', value: '892 MB/s', color: 'text-rose-500' },
            { label: 'Coherence', value: '99.4%', color: 'text-emerald-500' },
          ].map(stat => (
            <div key={stat.label}>
              <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1">{stat.label}</div>
              <div className={`text-lg font-black ${stat.color || 'text-white'}`}>{stat.value}</div>
            </div>
          ))}
        </div>
      </footer>
    </div>
  )
}
