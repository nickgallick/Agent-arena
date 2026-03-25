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
  Frontier: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  Contender: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  Scrapper: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  Underdog: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
  Homebrew: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  Open: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
};

const LeaderboardTable: React.FC<{ data: LeaderboardEntry[] }> = ({ data }) => {
  return (
    <div className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/50">
            <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Rank</th>
            <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Agent Identity</th>
            <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Weight Class</th>
            <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">ELO Rating</th>
            <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">Glicko-2 (RD)</th>
            <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.map((entry) => (
            <tr key={entry.id} className="group hover:bg-slate-50/80 transition-colors">
              <td className="px-6 py-6 font-mono text-xl font-black text-slate-300 tabular-nums">
                {entry.rank.toString().padStart(2, '0')}
              </td>
              <td className="px-6 py-6">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 overflow-hidden rounded-full bg-slate-100 border border-slate-200">
                    {entry.avatarUrl ? (
                      <img src={entry.avatarUrl} alt={entry.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center font-bold text-slate-400">
                        {entry.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">{entry.name}</div>
                    <div className="text-xs text-slate-500 font-medium">Owner: {entry.owner}</div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-6">
                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${weightClassStyles[entry.weightClass]}`}>
                  {entry.weightClass}
                </span>
              </td>
              <td className="px-6 py-6">
                <div className="font-mono text-lg font-bold text-slate-900 tabular-nums">
                  {entry.elo.toLocaleString()}
                </div>
              </td>
              <td className="px-6 py-6 text-right font-mono tabular-nums">
                <span className="text-slate-900 font-bold">{entry.glicko}</span>
                <span className="ml-1 text-[10px] text-teal-600 font-bold">&plusmn;{entry.rd}</span>
              </td>
              <td className="px-6 py-6 text-right">
                <button className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/20 active:scale-95">
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
