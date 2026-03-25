'use client'

import { useState } from 'react'
import { Shield } from 'lucide-react'

import { ChallengeCreator } from '@/components/admin/challenge-creator'
import { ChallengeList } from '@/components/admin/challenge-list'
import { JobQueueViewer } from '@/components/admin/job-queue-viewer'
import { AgentManager } from '@/components/admin/agent-manager'
import { FeatureFlags } from '@/components/admin/feature-flags'
import { SystemHealth } from '@/components/admin/system-health'

const tabs = ['Challenges', 'Jobs', 'Agents', 'Feature Flags', 'System Health'] as const
type TabId = (typeof tabs)[number]

export function AdminDashboardClient({ operatorName }: { operatorName: string }) {
  const [activeTab, setActiveTab] = useState<TabId>('Challenges')

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-manrope">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 h-screen border-r border-white/5 flex flex-col p-6 fixed">
          <div className="text-xl font-black tracking-tighter mb-12 flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-500" />
            ADMIN_CORE
          </div>

          <nav className="flex-1 space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`w-full text-left px-4 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-colors ${
                  activeTab === tab ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 pl-64 p-12">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h1 className="text-4xl font-black tracking-tighter italic">Mission Control</h1>
              <p className="text-slate-500 font-medium">Root administrative access for global arena parameters.</p>
            </div>
            <div className="px-4 py-2 bg-blue-600/10 border border-blue-500/20 rounded-lg flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400">Authenticated: ROOT</span>
            </div>
          </div>

          {activeTab === 'Challenges' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Create Challenge */}
              <div className="p-8 rounded-3xl border border-white/5 bg-white/5">
                <h3 className="text-xs font-bold uppercase tracking-widest mb-6 text-slate-400">Initialize New Challenge</h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2">Title</label>
                    <input className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2">Category</label>
                      <select className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white appearance-none focus:outline-none focus:border-blue-500">
                        <option>Algorithm</option>
                        <option>Optimization</option>
                        <option>Security</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2">Weight Class</label>
                      <select className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white appearance-none focus:outline-none focus:border-blue-500">
                        <option>Frontier</option>
                        <option>Contender</option>
                      </select>
                    </div>
                  </div>
                  <button className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all">Create Challenge</button>
                </div>
              </div>

              {/* System Health */}
              <div className="space-y-6">
                <div className="p-6 rounded-2xl border border-white/5 bg-white/5 flex items-center justify-between">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Judge Pipeline</div>
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-widest">
                    Operational <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  </div>
                </div>
                <div className="p-6 rounded-2xl border border-white/5 bg-white/5 flex items-center justify-between">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Supabase DB Cluster</div>
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-widest">
                    Healthy <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  </div>
                </div>
                <div className="p-6 rounded-2xl border border-white/5 bg-white/5 flex items-center justify-between">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Active Job Queue</div>
                  <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-widest">
                    High Load (12) <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Jobs' && <JobQueueViewer />}
          {activeTab === 'Agents' && <AgentManager />}
          {activeTab === 'Feature Flags' && <FeatureFlags />}
          {activeTab === 'System Health' && <SystemHealth />}
        </main>
      </div>
    </div>
  )
}
