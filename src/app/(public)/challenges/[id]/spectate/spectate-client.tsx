'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
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
      <header className="bg-[#1c1b1b] p-6 rounded-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="bg-[#7dffa2]/10 text-[#7dffa2] px-3 py-1 rounded font-[family-name:var(--font-mono)] text-[10px] uppercase font-bold tracking-wider flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#7dffa2] animate-pulse" />
            Live
          </span>
          <h1 className="font-[family-name:var(--font-heading)] text-xl md:text-2xl font-extrabold tracking-tighter text-[#e5e2e1]">
            {challenge.title}
          </h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="font-[family-name:var(--font-mono)] text-[10px] text-[#8c909f] uppercase tracking-widest">
              Time Remaining
            </span>
            <span className="font-[family-name:var(--font-mono)] text-2xl font-bold text-[#adc6ff]">
              <CountdownTimer endsAt={challenge.ends_at} />
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="font-[family-name:var(--font-mono)] text-[10px] text-[#8c909f] uppercase tracking-widest">
              Competitors
            </span>
            <span className="font-[family-name:var(--font-mono)] text-2xl font-bold text-[#e5e2e1]">
              {entries.length}
            </span>
          </div>
        </div>
      </header>

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-[#8c909f]">
        <Link href="/challenges" className="hover:text-[#adc6ff] transition-colors">Challenges</Link>
        <span className="text-[#353534]">›</span>
        <Link href={`/challenges/${challenge.id}`} className="hover:text-[#adc6ff] transition-colors">{challenge.title}</Link>
        <span className="text-[#353534]">›</span>
        <span className="text-[#e5e2e1] font-semibold">Spectate</span>
      </nav>

      {/* Live spectator view */}
      <LiveSpectatorView
        challenge={challenge}
        entries={entries}
        userId={user?.id ?? null}
      />

      {/* Challenge info bar */}
      <div className="flex flex-wrap gap-3">
        <div className="bg-[#353534] px-4 py-2 rounded-lg flex flex-col">
          <span className="font-[family-name:var(--font-mono)] text-[10px] text-[#8c909f] uppercase tracking-widest">Category</span>
          <span className="font-[family-name:var(--font-heading)] font-bold text-[#e5e2e1]">{challenge.category.replace('_', ' ')}</span>
        </div>
        <div className="bg-[#353534] px-4 py-2 rounded-lg flex flex-col">
          <span className="font-[family-name:var(--font-mono)] text-[10px] text-[#8c909f] uppercase tracking-widest">Time Limit</span>
          <span className="font-[family-name:var(--font-heading)] font-bold text-[#e5e2e1]">{challenge.time_limit_minutes}m</span>
        </div>
        <div className="bg-[#353534] px-4 py-2 rounded-lg flex flex-col">
          <span className="font-[family-name:var(--font-mono)] text-[10px] text-[#8c909f] uppercase tracking-widest">Prize Pool</span>
          <span className="font-[family-name:var(--font-heading)] font-bold text-[#adc6ff]">{challenge.max_coins} Credits</span>
        </div>
      </div>
    </div>
  )
}
