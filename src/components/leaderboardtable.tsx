import React from 'react'
import Link from 'next/link'

/**
 * Bouts Leaderboard Table Component
 * Production pattern per react_implementation_plan.html
 * Uses Kinetic Command design tokens (not generic slate colors)
 */

interface LeaderboardEntry {
  rank: number
  id: string
  name: string
  owner: string
  weightClass: 'Frontier' | 'Contender' | 'Scrapper' | 'Underdog' | 'Homebrew' | 'Open'
  elo: number
  glicko: number
  rd: number
  avatarUrl?: string
}

const weightClassStyles: Record<LeaderboardEntry['weightClass'], string> = {
  Frontier: 'bg-[#adc6ff]/10 text-[#adc6ff] border-[#adc6ff]/20',
  Contender: 'bg-[#7dffa2]/10 text-[#7dffa2] border-[#7dffa2]/20',
  Scrapper: 'bg-[#ffb780]/10 text-[#ffb780] border-[#ffb780]/20',
  Underdog: 'bg-[#ffb4ab]/10 text-[#ffb4ab] border-[#ffb4ab]/20',
  Homebrew: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  Open: 'bg-[#8c909f]/10 text-[#8c909f] border-[#8c909f]/20',
}

const LeaderboardTable: React.FC<{ data: LeaderboardEntry[] }> = ({ data }) => {
  return (
    <div className="w-full overflow-hidden rounded-2xl border border-white/5 bg-[#0e0e0e]">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-white/5 bg-[#131313]/50">
            <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#8c909f] font-['JetBrains_Mono']">Rank</th>
            <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#8c909f] font-['JetBrains_Mono']">Agent Identity</th>
            <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#8c909f] font-['JetBrains_Mono']">Weight Class</th>
            <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#8c909f] font-['JetBrains_Mono']">ELO Rating</th>
            <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#8c909f] font-['JetBrains_Mono'] text-right">Glicko-2 (RD)</th>
            <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#8c909f] font-['JetBrains_Mono'] text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {data.map((entry) => (
            <tr key={entry.id} className="group hover:bg-white/[0.03] transition-colors">
              <td className="px-6 py-5 font-['JetBrains_Mono'] text-xl font-black text-[#353534] tabular-nums">
                {entry.rank.toString().padStart(2, '0')}
              </td>
              <td className="px-6 py-5">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 overflow-hidden rounded-full bg-[#201f1f] border border-white/5 flex-shrink-0">
                    {entry.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={entry.avatarUrl} alt={entry.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center font-bold text-[#8c909f] font-['JetBrains_Mono'] text-xs">
                        {entry.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-[#e5e2e1] font-['Manrope']">{entry.name}</div>
                    <div className="text-xs text-[#8c909f] font-['JetBrains_Mono'] tracking-wider">@{entry.owner}</div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-5">
                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider font-['JetBrains_Mono'] ${weightClassStyles[entry.weightClass]}`}>
                  {entry.weightClass}
                </span>
              </td>
              <td className="px-6 py-5">
                <div className="font-['JetBrains_Mono'] text-lg font-bold text-[#e5e2e1] tabular-nums">
                  {entry.elo.toLocaleString()}
                </div>
              </td>
              <td className="px-6 py-5 text-right font-['JetBrains_Mono'] tabular-nums">
                <span className="text-[#e5e2e1] font-bold">{entry.glicko}</span>
                <span className="ml-1 text-[10px] text-[#7dffa2] font-bold">±{entry.rd}</span>
              </td>
              <td className="px-6 py-5 text-right">
                <Link
                  href={`/challenges?agent=${entry.id}`}
                  className="rounded-lg bg-gradient-to-br from-[#adc6ff] to-[#4d8efe] px-4 py-2 text-xs font-bold text-[#002e69] transition-all hover:opacity-90 hover:shadow-lg hover:shadow-[#adc6ff]/20 active:scale-95 font-['Manrope']"
                >
                  Challenge
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default LeaderboardTable
