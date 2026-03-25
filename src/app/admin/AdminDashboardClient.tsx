'use client'

import { useState } from 'react'
import {
  LayoutDashboard,
  Swords,
  Terminal,
  Bot,
  Flag,
  HeartPulse,
  TrendingUp,
  Network,
  Zap,
  Gauge,
  PlusCircle,
  Upload,
  Shield,
} from 'lucide-react'

import { ChallengeCreator } from '@/components/admin/challenge-creator'
import { ChallengeList } from '@/components/admin/challenge-list'
import { JobQueueViewer } from '@/components/admin/job-queue-viewer'
import { AgentManager } from '@/components/admin/agent-manager'
import { FeatureFlags } from '@/components/admin/feature-flags'
import { SystemHealth } from '@/components/admin/system-health'

const sidebarItems = [
  { icon: LayoutDashboard, label: 'Dashboard', id: 'dashboard' },
  { icon: Swords, label: 'Challenges', id: 'challenges' },
  { icon: Terminal, label: 'Jobs Queue', id: 'jobs' },
  { icon: Bot, label: 'Agents', id: 'agents' },
  { icon: Flag, label: 'Features', id: 'features' },
  { icon: HeartPulse, label: 'Health', id: 'health' },
] as const

type TabId = (typeof sidebarItems)[number]['id']

/* ------------------------------------------------------------------ */
/*  Mock jobs for the queue viewer                                     */
/* ------------------------------------------------------------------ */
const mockJobs = [
  { id: '#FF921-X', phase: 'Validation Phase', time: '0.4s ago', status: 'COMPUTING...', node: 'Node-Alpha-7', statusColor: 'text-[#adc6ff]', dotColor: 'bg-[#7dffa2] animate-pulse', highlight: false, faded: false },
  { id: '#AA442-B', phase: 'Consensus Reach', time: '1.2s ago', status: 'COMPLETE', node: 'Node-Gamma-2', statusColor: 'text-[#7dffa2]', dotColor: 'bg-[#7dffa2]', highlight: false, faded: false },
  { id: '#TR-99812', phase: 'Telemetry Relay', time: '3.5s ago', status: 'PENDING', node: 'Node-Beta-1', statusColor: 'text-[#adc6ff]', dotColor: 'bg-[#adc6ff]', highlight: true, faded: false },
  { id: '#XP-0021', phase: 'Archive Task', time: '10.1s ago', status: 'ARCHIVED', node: 'Core-Storage', statusColor: 'text-[#c2c6d5]', dotColor: 'bg-[#c2c6d5]', highlight: false, faded: true },
  { id: '#XP-0020', phase: 'Archive Task', time: '12.4s ago', status: 'ARCHIVED', node: 'Core-Storage', statusColor: 'text-[#c2c6d5]', dotColor: 'bg-[#c2c6d5]', highlight: false, faded: true },
]

/* ------------------------------------------------------------------ */
/*  Mock feature flags                                                 */
/* ------------------------------------------------------------------ */
const mockFlags = [
  { label: 'Auto-Scale Nodes', desc: 'Enable dynamic cluster expansion', on: true },
  { label: 'Experimental V3 API', desc: 'Expose edge endpoints to public', on: false },
  { label: 'Telemetry Streaming', desc: 'Real-time logs for all agent bouts', on: true },
  { label: 'Shadow Mode Execution', desc: 'Silent job processing for QA', on: true },
]

/* ------------------------------------------------------------------ */
/*  Mock node-health bars                                              */
/* ------------------------------------------------------------------ */
const mockNodes = [
  { label: 'Compute Cluster A', bars: [true, true, true, false] },
  { label: 'Storage Backend', bars: [true, true, true, true] },
  { label: 'Identity Provider', bars: [true, 'error', false, false] as (boolean | 'error')[] },
]

export function AdminDashboardClient({ operatorName }: { operatorName: string }) {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard')

  /* ---------------------------------------------------------------- */
  /*  Tab-specific content (uses existing admin sub-components)        */
  /* ---------------------------------------------------------------- */
  if (activeTab === 'challenges') return <TabShell activeTab={activeTab} setActiveTab={setActiveTab}><ChallengeCreator /><ChallengeList /></TabShell>
  if (activeTab === 'jobs') return <TabShell activeTab={activeTab} setActiveTab={setActiveTab}><JobQueueViewer /></TabShell>
  if (activeTab === 'agents') return <TabShell activeTab={activeTab} setActiveTab={setActiveTab}><AgentManager /></TabShell>
  if (activeTab === 'features') return <TabShell activeTab={activeTab} setActiveTab={setActiveTab}><FeatureFlags /></TabShell>
  if (activeTab === 'health') return <TabShell activeTab={activeTab} setActiveTab={setActiveTab}><SystemHealth /></TabShell>

  /* ================================================================ */
  /*  Dashboard (default view — pixel-perfect from Stitch)             */
  /* ================================================================ */
  return (
    <div className="grid grid-cols-12 gap-6">
      {/* ---- Sidebar ---- */}
      <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* ---- Main Dashboard Area ---- */}
      <section className="col-span-12 lg:col-span-10 grid grid-cols-12 gap-6">

        {/* ===== Hero Stat Cards ===== */}
        <StatCard
          label="Active Challenges"
          value="1,284"
          delta="+12% from last cycle"
          deltaColor="text-[#7dffa2]"
          DeltaIcon={TrendingUp}
          BgIcon={Swords}
        />
        <StatCard
          label="Total Agents"
          value="42,091"
          delta="8.2k active nodes"
          deltaColor="text-[#adc6ff]"
          DeltaIcon={Network}
          BgIcon={Bot}
        />
        <StatCard
          label="System Latency"
          value="14ms"
          delta="Optimized performance"
          deltaColor="text-[#ffb780]"
          DeltaIcon={Zap}
          BgIcon={Gauge}
        />

        {/* ===== Challenge Creator Form ===== */}
        <div className="col-span-12 lg:col-span-5 bg-[#201f1f] p-6 rounded-xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-[#e5e2e1]">Initialize Challenge</h2>
            <PlusCircle className="w-5 h-5 text-[#adc6ff]" />
          </div>
          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <div>
              <label className="block text-[10px] font-['JetBrains_Mono'] text-[#c2c6d5] uppercase mb-1">Challenge Identifier</label>
              <input
                className="w-full bg-[#0e0e0e] border-none focus:ring-1 focus:ring-[#adc6ff] rounded p-3 text-sm text-[#e5e2e1]"
                placeholder="e.g. CYBER_STRIKE_01"
                type="text"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-['JetBrains_Mono'] text-[#c2c6d5] uppercase mb-1">Compute Tier</label>
                <select className="w-full bg-[#0e0e0e] border-none focus:ring-1 focus:ring-[#adc6ff] rounded p-3 text-sm text-[#e5e2e1]">
                  <option>Ultra-Dense</option>
                  <option>Standard</option>
                  <option>Lean</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-['JetBrains_Mono'] text-[#c2c6d5] uppercase mb-1">Reward Pool</label>
                <input
                  className="w-full bg-[#0e0e0e] border-none focus:ring-1 focus:ring-[#adc6ff] rounded p-3 text-sm text-[#e5e2e1]"
                  placeholder="5,000"
                  type="number"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-['JetBrains_Mono'] text-[#c2c6d5] uppercase mb-1">Deployment Payload</label>
              <div className="bg-[#0e0e0e] rounded p-4 h-32 border border-dashed border-white/5 flex flex-col items-center justify-center cursor-pointer hover:bg-[#1c1b1b] transition-colors">
                <Upload className="w-5 h-5 text-[#c2c6d5] mb-2" />
                <span className="text-xs text-[#c2c6d5]">Drag or upload agent logic (.wasm, .py)</span>
              </div>
            </div>
            <button className="w-full bg-gradient-to-r from-[#adc6ff] to-[#4d8efe] text-[#002e69] font-bold py-3 rounded active:scale-95 transition-transform mt-2">
              DEPLOY PROTOCOL
            </button>
          </form>
        </div>

        {/* ===== Jobs Queue ===== */}
        <div className="col-span-12 lg:col-span-7 bg-[#1c1b1b] p-6 rounded-xl flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-[#e5e2e1]">Active Jobs Queue</h2>
            <div className="flex gap-2">
              <span className="px-2 py-1 bg-[#353534] text-[10px] font-['JetBrains_Mono'] text-[#7dffa2] rounded">PROCESSED: 12.4k</span>
              <span className="px-2 py-1 bg-[#353534] text-[10px] font-['JetBrains_Mono'] text-[#ffb4ab] rounded">FAILED: 02</span>
            </div>
          </div>
          <div className="space-y-3 overflow-y-auto max-h-[400px] pr-2">
            {mockJobs.map((job) => (
              <div
                key={job.id}
                className={`bg-[#201f1f] p-3 rounded-lg flex items-center justify-between hover:bg-[#2a2a2a] transition-colors group ${job.highlight ? 'border-l-2 border-[#adc6ff]' : ''} ${job.faded ? 'opacity-60' : ''}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-2 h-2 rounded-full ${job.dotColor}`} />
                  <div>
                    <div className="text-xs font-bold text-[#e5e2e1]">JOB_ID: {job.id}</div>
                    <div className="text-[10px] font-['JetBrains_Mono'] text-[#c2c6d5]">{job.phase} • {job.time}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-[10px] font-['JetBrains_Mono'] ${job.statusColor}`}>{job.status}</div>
                  <div className="text-[9px] text-[#c2c6d5] uppercase">{job.node}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ===== Feature Flags ===== */}
        <div className="col-span-12 md:col-span-8 bg-[#1c1b1b] p-6 rounded-xl">
          <h2 className="text-lg font-bold text-[#e5e2e1] mb-6">System Feature Control</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {mockFlags.map((flag) => (
              <div
                key={flag.label}
                className={`p-4 bg-[#201f1f] rounded-lg border-l-4 flex justify-between items-center ${flag.on ? 'border-[#7dffa2]' : 'border-[#ffb4ab]'}`}
              >
                <div>
                  <div className="text-sm font-bold text-[#e5e2e1]">{flag.label}</div>
                  <div className="text-[10px] text-[#c2c6d5]">{flag.desc}</div>
                </div>
                {/* Toggle */}
                <div className={`w-10 h-5 rounded-full relative ${flag.on ? 'bg-[#7dffa2]' : 'bg-[#353534]'}`}>
                  <div
                    className={`absolute top-1 w-3 h-3 rounded-full ${
                      flag.on ? 'right-1 bg-[#003918]' : 'left-1 bg-[#c2c6d5]'
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ===== Node Health ===== */}
        <div className="col-span-12 md:col-span-4 bg-[#1c1b1b] p-6 rounded-xl flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#e5e2e1] mb-4">Node Health</h2>
            <div className="space-y-4">
              {mockNodes.map((node) => (
                <div key={node.label} className="flex items-center justify-between">
                  <span className="text-xs text-[#c2c6d5]">{node.label}</span>
                  <div className="flex gap-1">
                    {node.bars.map((bar, i) => (
                      <div
                        key={i}
                        className={`w-1 h-3 rounded-full ${
                          bar === true
                            ? 'bg-[#7dffa2]'
                            : bar === 'error'
                              ? 'bg-[#ffb4ab] animate-pulse'
                              : 'bg-[#7dffa2]/30'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-8 pt-4 border-t border-white/5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#7dffa2]/10 rounded">
                <Shield className="w-4 h-4 text-[#7dffa2]" />
              </div>
              <div>
                <div className="text-xs font-bold text-[#e5e2e1]">Mission Status: NOMINAL</div>
                <div className="text-[9px] font-['JetBrains_Mono'] text-[#c2c6d5] uppercase">All systems within threshold</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

/* ================================================================== */
/*  Admin Sidebar                                                      */
/* ================================================================== */
function AdminSidebar({ activeTab, setActiveTab }: { activeTab: TabId; setActiveTab: (t: TabId) => void }) {
  return (
    <aside className="col-span-12 lg:col-span-2 space-y-2">
      <div className="bg-[#1c1b1b] p-2 rounded-xl">
        <nav className="flex flex-col gap-1">
          {sidebarItems.map(({ icon: Icon, label, id }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeTab === id
                  ? 'bg-[#adc6ff]/10 text-[#adc6ff]'
                  : 'text-[#c2c6d5] hover:bg-[#201f1f]'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-bold text-sm">{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Uptime Mini-Card */}
      <div className="bg-[#1c1b1b] p-4 rounded-xl border-l-2 border-[#7dffa2]/30">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-['JetBrains_Mono'] text-[#c2c6d5] uppercase tracking-widest">Uptime</span>
          <span className="text-[10px] font-['JetBrains_Mono'] text-[#7dffa2]">99.98%</span>
        </div>
        <div className="h-1 w-full bg-[#353534] overflow-hidden rounded-full">
          <div className="h-full bg-[#7dffa2] w-[90%]" />
        </div>
      </div>
    </aside>
  )
}

/* ================================================================== */
/*  Stat Card                                                          */
/* ================================================================== */
function StatCard({
  label,
  value,
  delta,
  deltaColor,
  DeltaIcon,
  BgIcon,
}: {
  label: string
  value: string
  delta: string
  deltaColor: string
  DeltaIcon: React.ComponentType<{ className?: string }>
  BgIcon: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="col-span-12 md:col-span-4 bg-[#1c1b1b] p-6 rounded-xl relative overflow-hidden group">
      <div className="relative z-10">
        <span className="text-xs font-['JetBrains_Mono'] text-[#c2c6d5] uppercase tracking-widest">{label}</span>
        <div className="text-4xl font-black text-[#e5e2e1] mt-2">{value}</div>
        <div className={`flex items-center gap-2 mt-4 text-xs ${deltaColor}`}>
          <DeltaIcon className="w-4 h-4" />
          <span>{delta}</span>
        </div>
      </div>
      <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
        <BgIcon className="w-32 h-32" />
      </div>
    </div>
  )
}

/* ================================================================== */
/*  Tab Shell — wraps sub-component views with sidebar                 */
/* ================================================================== */
function TabShell({
  activeTab,
  setActiveTab,
  children,
}: {
  activeTab: TabId
  setActiveTab: (t: TabId) => void
  children: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-12 gap-6">
      <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <section className="col-span-12 lg:col-span-10 space-y-6">
        {children}
      </section>
    </div>
  )
}
