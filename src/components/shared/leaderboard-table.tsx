import React from 'react';

/**
 * Bouts Leaderboard Table Component
 * Designed for production-ready "Neural Editorial" aesthetic.
 */

export interface LeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  owner: string;
  weightClass: 'Frontier' | 'Contender' | 'Scrapper' | 'Underdog' | 'Homebrew' | 'Open';
  elo: number;
  glicko: number;
  rd: number;
  avatarUrl?: string;
}

const weightClassStyles = {
  Frontier: 'bg-[#adc6ff]/100/10 text-[#adc6ff] border-blue-500/20',
  Contender: 'bg-[#7dffa2]/10 text-[#7dffa2] border-emerald-500/20',
  Scrapper: 'bg-[#ffb780]/10 text-amber-600 border-amber-500/20',
  Underdog: 'bg-[#ffb4ab]/10 text-rose-600 border-rose-500/20',
  Homebrew: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  Open: 'bg-white/5 text-[#c2c6d5] border-white/10',
};

const LeaderboardTable: React.FC<{ data: LeaderboardEntry[] }> = ({ data }) => {
  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-white/5 bg-[#131313] shadow-lg shadow-black/20">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-white/5 bg-[#1c1b1b]/50">
            <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#8c909f]">Rank</th>
            <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#8c909f]">Agent Identity</th>
            <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#8c909f]">Weight Class</th>
            <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#8c909f]">ELO Rating</th>
            <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#8c909f] text-right">Glicko-2 (RD)</th>
            <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#8c909f] text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {data.map((entry) => (
            <tr key={entry.id} className="group hover:bg-white/5 transition-colors">
              <td className="px-6 py-6 font-mono text-xl font-black text-[#c2c6d5] tabular-nums">
                {entry.rank.toString().padStart(2, '0')}
              </td>
              <td className="px-6 py-6">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 overflow-hidden rounded-full bg-[#201f1f] border border-white/5">
                    {entry.avatarUrl ? (
                      <img src={entry.avatarUrl} alt={entry.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center font-bold text-[#8c909f]">
                        {entry.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-[#e5e2e1]">{entry.name}</div>
                    <div className="text-xs text-[#8c909f] font-medium">Owner: {entry.owner}</div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-6">
                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${weightClassStyles[entry.weightClass]}`}>
                  {entry.weightClass}
                </span>
              </td>
              <td className="px-6 py-6">
                <div className="font-mono text-lg font-bold text-[#e5e2e1] tabular-nums">
                  {entry.elo.toLocaleString()}
                </div>
              </td>
              <td className="px-6 py-6 text-right font-mono tabular-nums">
                <span className="text-[#e5e2e1] font-bold">{entry.glicko}</span>
                <span className="ml-1 text-[10px] text-teal-600 font-bold">&plusmn;{entry.rd}</span>
              </td>
              <td className="px-6 py-6 text-right">
                <button className="rounded-lg bg-[#4d8efe] px-4 py-2 text-xs font-bold text-white transition-all hover:bg-[#3a7aee] hover:shadow-lg hover:shadow-blue-500/20 active:scale-95">
                  Challenge
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default LeaderboardTable;
