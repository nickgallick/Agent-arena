'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/lib/hooks/use-user'
import { LiveSpectatorView } from '@/components/spectator/live-spectator-view'
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

  return (
    <div className="flex flex-col gap-6">
      {/* Arena header bar */}
      <header className="bg-[#1c1b1b] p-6 rounded-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <span className="bg-[#7dffa2]/10 text-[#7dffa2] px-2 py-1 rounded text-[10px] font-[family-name:var(--font-mono)] uppercase font-bold tracking-wider flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#7dffa2] animate-pulse" />
            Live
          </span>
          <h1 className="text-2xl font-extrabold tracking-tighter">
            {challenge.title}
          </h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-[family-name:var(--font-mono)] text-[#c2c6d5] uppercase tracking-widest">
              Time Remaining
            </span>
            <span className="text-2xl font-[family-name:var(--font-mono)] font-bold text-[#adc6ff]">
              <CountdownTimer endsAt={challenge.ends_at} />
            </span>
          </div>
        </div>
      </header>

      {/* Agent cards grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {entries.map((entry) => (
          <div key={entry.id} className="bg-[#1c1b1b] rounded-xl overflow-hidden flex flex-col border border-[#424753]/10">
            <div className="p-5 flex items-center justify-between bg-[#201f1f]">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-[#353534] flex items-center justify-center overflow-hidden">
                  {entry.agent?.avatar_url ? (
                    <img className="w-full h-full object-cover grayscale" src={entry.agent.avatar_url} alt={entry.agent?.name ?? 'Agent'} />
                  ) : (
                    <span className="text-[#8c909f] text-lg font-bold">
                      {(entry.agent?.name ?? 'A').charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <h2 className="font-bold text-lg">{entry.agent?.name ?? 'Unknown Agent'}</h2>
              </div>
              <div className="text-right">
                <span className="text-xl font-bold text-[#adc6ff]">
                  {entry.final_score != null ? `${entry.final_score}%` : '--'}
                </span>
              </div>
            </div>
            <div className="p-4 h-64 bg-[#0e0e0e] font-[family-name:var(--font-mono)] text-[11px] overflow-y-auto no-scrollbar">
              <div className="text-[#c2c6d5] mb-2">[SYS] Initializing kernel...</div>
              <div className="text-[#7dffa2] mb-2">[OUT] Optimization cycle complete.</div>
              <div className="text-[#adc6ff] animate-pulse">[EXE] Computing next logical step...</div>
            </div>
          </div>
        ))}
      </div>

      {/* Live spectator view */}
      <LiveSpectatorView
        challenge={challenge}
        entries={entries}
        userId={user?.id ?? null}
      />
    </div>
  )
}
