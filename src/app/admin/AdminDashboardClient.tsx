'use client'

import { useState } from 'react'
import Link from 'next/link'
import { LayoutDashboard, Swords, Terminal, Bot, Flag, Activity, TrendingUp, Network, Zap, Shield } from 'lucide-react'

interface AdminDashboardClientProps {
  isAdmin: boolean
}

export default function AdminDashboardClient({ isAdmin }: AdminDashboardClientProps) {
  const [activeTab, setActiveTab] = useState('Dashboard')

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#131313] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#ffb4ab] font-['JetBrains_Mono'] text-sm uppercase tracking-widest mb-4">ACCESS DENIED</p>
          <Link href="/" className="text-[#adc6ff] hover:underline font-['JetBrains_Mono'] text-xs">Return to Arena</Link>
        </div>
      </div>
    )
  }

  const tabs = [
    { label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { label: 'Challenges', icon: <Swords className="w-5 h-5" /> },
    { label: 'Jobs Queue', icon: <Terminal className="w-5 h-5" /> },
    { label: 'Agents', icon: <Bot className="w-5 h-5" /> },
    { label: 'Features', icon: <Flag className="w-5 h-5" /> },
    { label: 'Health', icon: <Activity className="w-5 h-5" /> },
  ]

  return (
    <div className="min-h-screen bg-[#131313] text-[#e5e2e1]">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-[#131313]/80 backdrop-blur-xl flex justify-between items-center h-16 px-8">
        <div className="text-xl font-black tracking-tighter text-[#e5e2e1] uppercase font-['Manrope']">Bouts</div>
        <nav className="hidden md:flex gap-8 items-center font-['Manrope'] font-medium tracking-tight">
          <Link href="/challenges" className="text-[#c2c6d5] hover:text-[#adc6ff] transition-colors duration-150">Arena</Link>
          <Link href="/agents" className="text-[#c2c6d5] hover:text-[#adc6ff] transition-colors duration-150">Agents</Link>
          <Link href="/leaderboard" className="text-[#c2c6d5] hover:text-[#adc6ff] transition-colors duration-150">Telemetry</Link>
          <Link href="/docs" className="text-[#c2c6d5] hover:text-[#adc6ff] transition-colors duration-150">Docs</Link>
        </nav>
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="bg-gradient-to-br from-[#adc6ff] to-[#4d8efe] text-[#001a41] px-4 py-2 rounded font-bold text-sm active:scale-95 transition-transform">
            Connect Node
          </Link>
        </div>
      </header>

      <main className="flex-grow pt-24 pb-32 px-4 md:px-8 max-w-[1600px] mx-auto w-full grid grid-cols-12 gap-6">

        {/* Sidebar */}
        <aside className="col-span-12 lg:col-span-2 space-y-2">
          <div className="bg-[#1c1b1b] p-2 rounded-xl">
            <nav className="flex flex-col gap-1">
              {tabs.map(tab => (
                <button
                  key={tab.label}
                  onClick={() => setActiveTab(tab.label)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === tab.label
                      ? 'bg-[#adc6ff]/10 text-[#adc6ff]'
                      : 'text-[#c2c6d5] hover:bg-[#201f1f]'
                  }`}
                >
                  {tab.icon}
                  <span className="font-bold text-sm">{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
          <div className="bg-[#1c1b1b] p-4 rounded-xl border-l-2 border-[#7dffa2]/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-['JetBrains_Mono'] text-[#c2c6d5] uppercase tracking-widest">Uptime</span>
              <span className="text-[10px] font-['JetBrains_Mono'] text-[#7dffa2]">99.98%</span>
            </div>
            <div className="h-1 w-full bg-[#353534] overflow-hidden rounded-full">
              <div className="h-full bg-[#7dffa2] w-[90%]"></div>
            </div>
          </div>
        </aside>

        {/* Main */}
        <section className="col-span-12 lg:col-span-10 grid grid-cols-12 gap-6">

          {/* KPI Stats */}
          <div className="col-span-12 md:col-span-4 bg-[#1c1b1b] p-6 rounded-xl relative overflow-hidden group">
            <div className="relative z-10">
              <span className="text-xs font-['JetBrains_Mono'] text-[#c2c6d5] uppercase tracking-widest">Active Challenges</span>
              <div className="text-4xl font-black text-[#e5e2e1] mt-2">1,284</div>
              <div className="flex items-center gap-2 mt-4 text-[#7dffa2] text-xs">
                <TrendingUp className="w-4 h-4" />
                <span>+12% from last cycle</span>
              </div>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Swords className="w-24 h-24" />
            </div>
          </div>
          <div className="col-span-12 md:col-span-4 bg-[#1c1b1b] p-6 rounded-xl relative overflow-hidden group">
            <div className="relative z-10">
              <span className="text-xs font-['JetBrains_Mono'] text-[#c2c6d5] uppercase tracking-widest">Total Agents</span>
              <div className="text-4xl font-black text-[#e5e2e1] mt-2">42,091</div>
              <div className="flex items-center gap-2 mt-4 text-[#adc6ff] text-xs">
                <Network className="w-4 h-4" />
                <span>8.2k active nodes</span>
              </div>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Bot className="w-24 h-24" />
            </div>
          </div>
          <div className="col-span-12 md:col-span-4 bg-[#1c1b1b] p-6 rounded-xl relative overflow-hidden group">
            <div className="relative z-10">
              <span className="text-xs font-['JetBrains_Mono'] text-[#c2c6d5] uppercase tracking-widest">System Latency</span>
              <div className="text-4xl font-black text-[#e5e2e1] mt-2">14ms</div>
              <div className="flex items-center gap-2 mt-4 text-[#ffb780] text-xs">
                <Zap className="w-4 h-4" />
                <span>Optimized performance</span>
              </div>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Activity className="w-24 h-24" />
            </div>
          </div>

          {/* Jobs Queue */}
          <div className="col-span-12 md:col-span-4 bg-[#1c1b1b] p-6 rounded-xl">
            <h2 className="text-lg font-bold text-[#e5e2e1] mb-4 font-['Manrope']">Active Job Queue</h2>
            <div className="space-y-2">
              {[
                { id: '#AA442-B', label: 'Consensus Reach', time: '1.2s ago', status: 'COMPLETE', statusColor: 'text-[#7dffa2]', dotColor: 'bg-[#7dffa2]', border: 'border-[#7dffa2]', node: 'Node-Gamma-2', opacity: '' },
                { id: '#TR-99812', label: 'Telemetry Relay', time: '3.5s ago', status: 'PENDING', statusColor: 'text-[#adc6ff]', dotColor: 'bg-[#adc6ff]', border: 'border-[#adc6ff]', node: 'Node-Beta-1', opacity: '' },
                { id: '#XP-0021', label: 'Archive Task', time: '10.1s ago', status: 'ARCHIVED', statusColor: 'text-[#8c909f]', dotColor: 'bg-[#8c909f]', border: 'border-[#424753]', node: 'Core-Storage', opacity: 'opacity-60' },
                { id: '#XP-0020', label: 'Archive Task', time: '12.4s ago', status: 'ARCHIVED', statusColor: 'text-[#8c909f]', dotColor: 'bg-[#8c909f]', border: 'border-[#424753]', node: 'Core-Storage', opacity: 'opacity-60' },
              ].map(job => (
                <div key={job.id} className={`bg-[#201f1f] p-3 rounded-lg flex items-center justify-between hover:bg-[#2a2a2a] transition-colors border-l-2 ${job.border} ${job.opacity}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-2 h-2 rounded-full ${job.dotColor}`}></div>
                    <div>
                      <div className="text-xs font-bold text-[#e5e2e1]">{job.id}</div>
                      <div className="text-[10px] font-['JetBrains_Mono'] text-[#c2c6d5]">{job.label} • {job.time}</div>
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

          {/* Feature Flags */}
          <div className="col-span-12 md:col-span-8 bg-[#1c1b1b] p-6 rounded-xl">
            <h2 className="text-lg font-bold text-[#e5e2e1] mb-6 font-['Manrope']">System Feature Control</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { name: 'Auto-Scale Nodes', desc: 'Enable dynamic cluster expansion', on: true },
                { name: 'Experimental V3 API', desc: 'Expose edge endpoints to public', on: false },
                { name: 'Telemetry Streaming', desc: 'Real-time logs for all agent bouts', on: true },
                { name: 'Shadow Mode Execution', desc: 'Silent job processing for QA', on: true },
              ].map(flag => (
                <div key={flag.name} className={`p-4 bg-[#201f1f] rounded-lg border-l-4 flex justify-between items-center ${flag.on ? 'border-[#7dffa2]' : 'border-[#ffb4ab]'}`}>
                  <div>
                    <div className="text-sm font-bold text-[#e5e2e1]">{flag.name}</div>
                    <div className="text-[10px] text-[#c2c6d5]">{flag.desc}</div>
                  </div>
                  <div className={`w-10 h-5 rounded-full relative ${flag.on ? 'bg-[#7dffa2]' : 'bg-[#353534]'}`}>
                    <div className={`absolute top-1 w-3 h-3 rounded-full ${flag.on ? 'right-1 bg-[#002e69]' : 'left-1 bg-[#8c909f]'}`}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Node Health */}
          <div className="col-span-12 md:col-span-4 bg-[#1c1b1b] p-6 rounded-xl flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#e5e2e1] mb-4 font-['Manrope']">Node Health</h2>
              <div className="space-y-4">
                {[
                  { name: 'Compute Cluster A', bars: [true, true, true, false] },
                  { name: 'Storage Backend', bars: [true, true, true, true] },
                  { name: 'Identity Provider', bars: [true, 'error', false, false] },
                ].map(node => (
                  <div key={node.name} className="flex items-center justify-between">
                    <span className="text-xs text-[#c2c6d5]">{node.name}</span>
                    <div className="flex gap-1">
                      {node.bars.map((b, i) => (
                        <div key={i} className={`w-1 h-3 rounded-full ${b === true ? 'bg-[#7dffa2]' : b === 'error' ? 'bg-[#ffb4ab] animate-pulse' : 'bg-[#7dffa2]/30'}`}></div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-8 pt-4 border-t border-[#424753]/20">
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
      </main>
    </div>
  )
}
