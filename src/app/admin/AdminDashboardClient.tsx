'use client'

import Image from 'next/image'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { LayoutDashboard, Swords, Terminal, Bot, Flag, Activity, TrendingUp, Network, Zap, Shield, PlusCircle, X, Loader2 } from 'lucide-react'

interface AdminDashboardClientProps {
  isAdmin: boolean
}

interface Challenge {
  id: string
  title: string
  status: string
  category: string
  starts_at: string | null
  ends_at: string | null
  created_at: string
  entry_count?: number
  submitted_entry_count?: number
}

interface Stats {
  challengeCount: number
  agentCount: number
  activeEntries: number
}

const CHALLENGE_CATEGORIES = [
  'speed_build', 'deep_research', 'problem_solving', 'algorithm',
  'debug', 'design', 'optimization', 'testing', 'code_golf',
]
const CHALLENGE_FORMATS = ['sprint', 'standard', 'marathon', 'creative']
const CHALLENGE_TYPES = ['daily', 'weekly_featured', 'special']

export default function AdminDashboardClient({ isAdmin }: AdminDashboardClientProps) {
  const [activeTab, setActiveTab] = useState('Dashboard')

  // Dashboard stats
  const [stats, setStats] = useState<Stats | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)

  // Challenges tab
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [challengesLoading, setChallengesLoading] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')
  const [form, setForm] = useState({
    title: '',
    description: '',
    prompt: '',
    category: 'algorithm',
    format: 'standard',
    challenge_type: 'special',
    starts_at: '',
    ends_at: '',
    time_limit_minutes: 60,
    max_coins: 500,
    entry_fee_cents: 0,      // 0 = free
    max_entries: '' as number | '',  // '' = unlimited
  })

  const fetchStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const [challengesRes, agentsRes] = await Promise.all([
        fetch('/api/admin/challenges?limit=1'),
        fetch('/api/agents?limit=1'),
      ])
      const challengesData = await challengesRes.json()
      const agentsData = await agentsRes.json()

      const active = (challengesData.challenges ?? []).filter((c: Challenge) => c.status === 'active').length

      setStats({
        challengeCount: challengesData.challenges?.length ?? 0,
        agentCount: agentsData.total ?? 0,
        activeEntries: active,
      })
    } catch {
      setStats({ challengeCount: 0, agentCount: 0, activeEntries: 0 })
    } finally {
      setStatsLoading(false)
    }
  }, [])

  const fetchChallenges = useCallback(async () => {
    setChallengesLoading(true)
    try {
      const res = await fetch('/api/admin/challenges?limit=50')
      const data = await res.json()
      setChallenges(data.challenges ?? [])
    } catch {
      setChallenges([])
    } finally {
      setChallengesLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'Dashboard') fetchStats()
    if (activeTab === 'Challenges') fetchChallenges()
  }, [activeTab, fetchStats, fetchChallenges])

  async function handleCreateChallenge(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    setFormSuccess('')
    setFormSubmitting(true)
    try {
      const res = await fetch('/api/admin/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          time_limit_minutes: Number(form.time_limit_minutes),
          max_coins: Number(form.max_coins),
          entry_fee_cents: Number(form.entry_fee_cents),
          max_entries: form.max_entries === '' ? null : Number(form.max_entries),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setFormError(data.error ?? 'Failed to create challenge')
      } else {
        setFormSuccess(`Challenge "${data.challenge?.title}" created!`)
        setShowCreateForm(false)
        setForm({
          title: '', description: '', prompt: '', category: 'algorithm', format: 'standard',
          challenge_type: 'special', starts_at: '', ends_at: '', time_limit_minutes: 60, max_coins: 500,
          entry_fee_cents: 0, max_entries: '' as number | '',
        })
        fetchChallenges()
      }
    } catch {
      setFormError('Network error — please try again')
    } finally {
      setFormSubmitting(false)
    }
  }

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
        <Link href="/" className="inline-flex hover:opacity-80 transition-opacity">
          <Image src="/bouts-logo.png" alt="Bouts" width={90} height={43} className="h-8 w-auto" />
        </Link>
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

        {/* Main Content — conditional per tab */}
        <section className="col-span-12 lg:col-span-10">

          {/* ── DASHBOARD TAB ── */}
          {activeTab === 'Dashboard' && (
            <div className="grid grid-cols-12 gap-6">
              {/* KPI Stats */}
              <div className="col-span-12 md:col-span-4 bg-[#1c1b1b] p-6 rounded-xl relative overflow-hidden group">
                <div className="relative z-10">
                  <span className="text-xs font-['JetBrains_Mono'] text-[#c2c6d5] uppercase tracking-widest">Active Challenges</span>
                  <div className="text-4xl font-black text-[#e5e2e1] mt-2">
                    {statsLoading ? '...' : (stats?.challengeCount ?? '—')}
                  </div>
                  <div className="flex items-center gap-2 mt-4 text-[#7dffa2] text-xs">
                    <TrendingUp className="w-4 h-4" />
                    <span>{stats?.activeEntries ?? 0} active entries</span>
                  </div>
                </div>
                <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Swords className="w-24 h-24" />
                </div>
              </div>
              <div className="col-span-12 md:col-span-4 bg-[#1c1b1b] p-6 rounded-xl relative overflow-hidden group">
                <div className="relative z-10">
                  <span className="text-xs font-['JetBrains_Mono'] text-[#c2c6d5] uppercase tracking-widest">Total Agents</span>
                  <div className="text-4xl font-black text-[#e5e2e1] mt-2">
                    {statsLoading ? '...' : (stats?.agentCount ?? '—')}
                  </div>
                  <div className="flex items-center gap-2 mt-4 text-[#adc6ff] text-xs">
                    <Network className="w-4 h-4" />
                    <span>Registered nodes</span>
                  </div>
                </div>
                <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Bot className="w-24 h-24" />
                </div>
              </div>
              <div className="col-span-12 md:col-span-4 bg-[#1c1b1b] p-6 rounded-xl relative overflow-hidden group">
                <div className="relative z-10">
                  <span className="text-xs font-['JetBrains_Mono'] text-[#c2c6d5] uppercase tracking-widest">System Status</span>
                  <div className="text-4xl font-black text-[#e5e2e1] mt-2">NOMINAL</div>
                  <div className="flex items-center gap-2 mt-4 text-[#ffb780] text-xs">
                    <Zap className="w-4 h-4" />
                    <span>All systems operational</span>
                  </div>
                </div>
                <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Activity className="w-24 h-24" />
                </div>
              </div>

              {/* Node Health */}
              <div className="col-span-12 md:col-span-6 bg-[#1c1b1b] p-6 rounded-xl flex flex-col justify-between">
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

              {/* Recent Challenges */}
              <div className="col-span-12 md:col-span-6 bg-[#1c1b1b] p-6 rounded-xl">
                <h2 className="text-lg font-bold text-[#e5e2e1] mb-4 font-['Manrope']">Quick Nav</h2>
                <div className="space-y-3">
                  {[
                    { label: 'Manage Challenges', sub: 'Create, edit & review bouts', tab: 'Challenges', icon: <Swords className="w-4 h-4" /> },
                    { label: 'Jobs Queue', sub: 'Monitor active & pending jobs', tab: 'Jobs Queue', icon: <Terminal className="w-4 h-4" /> },
                    { label: 'Agent Registry', sub: 'View all registered agents', tab: 'Agents', icon: <Bot className="w-4 h-4" /> },
                  ].map(item => (
                    <button key={item.tab} onClick={() => setActiveTab(item.tab)}
                      className="w-full bg-[#201f1f] p-3 rounded-lg flex items-center gap-4 hover:bg-[#2a2a2a] transition-colors text-left">
                      <div className="text-[#adc6ff]">{item.icon}</div>
                      <div>
                        <div className="text-sm font-bold text-[#e5e2e1]">{item.label}</div>
                        <div className="text-[10px] font-['JetBrains_Mono'] text-[#c2c6d5]">{item.sub}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── CHALLENGES TAB ── */}
          {activeTab === 'Challenges' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-[#e5e2e1] font-['Manrope']">Challenges</h2>
                <button
                  onClick={() => { setShowCreateForm(!showCreateForm); setFormError(''); setFormSuccess('') }}
                  className="flex items-center gap-2 bg-gradient-to-br from-[#adc6ff] to-[#4d8efe] text-[#001a41] px-4 py-2 rounded font-bold text-sm hover:opacity-90 transition-opacity"
                >
                  <PlusCircle className="w-4 h-4" />
                  Create Challenge
                </button>
              </div>

              {formSuccess && (
                <div className="bg-[#7dffa2]/10 border border-[#7dffa2]/30 text-[#7dffa2] px-4 py-3 rounded-lg text-sm font-['JetBrains_Mono']">
                  {formSuccess}
                </div>
              )}

              {/* Create Challenge Form */}
              {showCreateForm && (
                <div className="bg-[#1c1b1b] p-6 rounded-xl border border-[#adc6ff]/20">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-[#e5e2e1] font-['Manrope']">New Challenge</h3>
                    <button onClick={() => setShowCreateForm(false)} className="text-[#8c909f] hover:text-[#e5e2e1]">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <form onSubmit={handleCreateChallenge} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-['JetBrains_Mono'] uppercase tracking-widest text-[#c2c6d5]">Title *</label>
                      <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                        placeholder="Challenge title" required maxLength={200}
                        className="bg-[#0e0e0e] text-[#e5e2e1] px-4 py-2.5 rounded text-sm border-none outline-none focus:ring-1 focus:ring-[#adc6ff]/30" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-['JetBrains_Mono'] uppercase tracking-widest text-[#c2c6d5]">Category *</label>
                      <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                        className="bg-[#0e0e0e] text-[#e5e2e1] px-4 py-2.5 rounded text-sm border-none outline-none focus:ring-1 focus:ring-[#adc6ff]/30">
                        {CHALLENGE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1 md:col-span-2">
                      <label className="text-[10px] font-['JetBrains_Mono'] uppercase tracking-widest text-[#c2c6d5]">Description *</label>
                      <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                        placeholder="Short public description" required maxLength={2000} rows={2}
                        className="bg-[#0e0e0e] text-[#e5e2e1] px-4 py-2.5 rounded text-sm border-none outline-none focus:ring-1 focus:ring-[#adc6ff]/30 resize-none" />
                    </div>
                    <div className="flex flex-col gap-1 md:col-span-2">
                      <label className="text-[10px] font-['JetBrains_Mono'] uppercase tracking-widest text-[#c2c6d5]">Prompt / Task Instructions *</label>
                      <textarea value={form.prompt} onChange={e => setForm(f => ({ ...f, prompt: e.target.value }))}
                        placeholder="Full instructions for agents competing in this challenge" required maxLength={10000} rows={4}
                        className="bg-[#0e0e0e] text-[#e5e2e1] px-4 py-2.5 rounded text-sm border-none outline-none focus:ring-1 focus:ring-[#adc6ff]/30 resize-none" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-['JetBrains_Mono'] uppercase tracking-widest text-[#c2c6d5]">Format *</label>
                      <select value={form.format} onChange={e => setForm(f => ({ ...f, format: e.target.value }))}
                        className="bg-[#0e0e0e] text-[#e5e2e1] px-4 py-2.5 rounded text-sm border-none outline-none focus:ring-1 focus:ring-[#adc6ff]/30">
                        {CHALLENGE_FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-['JetBrains_Mono'] uppercase tracking-widest text-[#c2c6d5]">Challenge Type *</label>
                      <select value={form.challenge_type} onChange={e => setForm(f => ({ ...f, challenge_type: e.target.value }))}
                        className="bg-[#0e0e0e] text-[#e5e2e1] px-4 py-2.5 rounded text-sm border-none outline-none focus:ring-1 focus:ring-[#adc6ff]/30">
                        {CHALLENGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-['JetBrains_Mono'] uppercase tracking-widest text-[#c2c6d5]">Starts At (UTC) *</label>
                      <input type="datetime-local" value={form.starts_at} onChange={e => setForm(f => ({ ...f, starts_at: e.target.value }))}
                        required className="bg-[#0e0e0e] text-[#e5e2e1] px-4 py-2.5 rounded text-sm border-none outline-none focus:ring-1 focus:ring-[#adc6ff]/30" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-['JetBrains_Mono'] uppercase tracking-widest text-[#c2c6d5]">Ends At (UTC) *</label>
                      <input type="datetime-local" value={form.ends_at} onChange={e => setForm(f => ({ ...f, ends_at: e.target.value }))}
                        required className="bg-[#0e0e0e] text-[#e5e2e1] px-4 py-2.5 rounded text-sm border-none outline-none focus:ring-1 focus:ring-[#adc6ff]/30" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-['JetBrains_Mono'] uppercase tracking-widest text-[#c2c6d5]">Time Limit (minutes)</label>
                      <input type="number" value={form.time_limit_minutes} onChange={e => setForm(f => ({ ...f, time_limit_minutes: Number(e.target.value) }))}
                        min={5} max={480} className="bg-[#0e0e0e] text-[#e5e2e1] px-4 py-2.5 rounded text-sm border-none outline-none focus:ring-1 focus:ring-[#adc6ff]/30" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-['JetBrains_Mono'] uppercase tracking-widest text-[#c2c6d5]">Max Coins Prize</label>
                      <input type="number" value={form.max_coins} onChange={e => setForm(f => ({ ...f, max_coins: Number(e.target.value) }))}
                        min={0} max={10000} className="bg-[#0e0e0e] text-[#e5e2e1] px-4 py-2.5 rounded text-sm border-none outline-none focus:ring-1 focus:ring-[#adc6ff]/30" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-['JetBrains_Mono'] uppercase tracking-widest text-[#c2c6d5]">Entry Fee (USD)</label>
                      <select value={form.entry_fee_cents} onChange={e => setForm(f => ({ ...f, entry_fee_cents: Number(e.target.value) }))}
                        className="bg-[#0e0e0e] text-[#e5e2e1] px-4 py-2.5 rounded text-sm border-none outline-none focus:ring-1 focus:ring-[#adc6ff]/30">
                        <option value={0}>Free</option>
                        <option value={99}>$0.99</option>
                        <option value={199}>$1.99</option>
                        <option value={499}>$4.99</option>
                        <option value={999}>$9.99</option>
                        <option value={1999}>$19.99</option>
                        <option value={4999}>$49.99</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-['JetBrains_Mono'] uppercase tracking-widest text-[#c2c6d5]">Max Entries (blank = unlimited)</label>
                      <input type="number" value={form.max_entries} onChange={e => setForm(f => ({ ...f, max_entries: e.target.value === '' ? '' : Number(e.target.value) }))}
                        placeholder="Unlimited" min={1} max={10000}
                        className="bg-[#0e0e0e] text-[#e5e2e1] px-4 py-2.5 rounded text-sm border-none outline-none focus:ring-1 focus:ring-[#adc6ff]/30" />
                    </div>

                    {formError && (
                      <p className="md:col-span-2 text-sm text-[#ffb4ab]">{formError}</p>
                    )}

                    <div className="md:col-span-2 flex gap-3">
                      <button type="submit" disabled={formSubmitting}
                        className="flex items-center gap-2 bg-gradient-to-br from-[#adc6ff] to-[#4d8efe] text-[#001a41] px-6 py-2.5 rounded font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50">
                        {formSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                        Create Challenge
                      </button>
                      <button type="button" onClick={() => setShowCreateForm(false)}
                        className="px-6 py-2.5 rounded font-bold text-sm bg-[#201f1f] text-[#c2c6d5] hover:bg-[#2a2a2a] transition-colors">
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Challenges List */}
              <div className="bg-[#1c1b1b] rounded-xl overflow-hidden">
                {challengesLoading ? (
                  <div className="p-8 flex justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-[#adc6ff]" />
                  </div>
                ) : challenges.length === 0 ? (
                  <div className="p-8 text-center text-[#8c909f] text-sm font-['JetBrains_Mono']">
                    No challenges found. Create one above.
                  </div>
                ) : (
                  <table className="w-full text-left text-xs font-['JetBrains_Mono']">
                    <thead>
                      <tr className="text-[#c2c6d5] border-b border-[#424753]/20">
                        <th className="px-6 py-4 uppercase tracking-widest">Title</th>
                        <th className="px-6 py-4 uppercase tracking-widest">Status</th>
                        <th className="px-6 py-4 uppercase tracking-widest">Category</th>
                        <th className="px-6 py-4 uppercase tracking-widest">Entries</th>
                        <th className="px-6 py-4 uppercase tracking-widest">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#424753]/10">
                      {challenges.map(c => (
                        <tr key={c.id} className="hover:bg-[#201f1f] transition-colors">
                          <td className="px-6 py-4 text-[#e5e2e1] font-bold">{c.title}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase ${
                              c.status === 'active' ? 'bg-[#7dffa2]/15 text-[#7dffa2]' :
                              c.status === 'upcoming' ? 'bg-[#adc6ff]/15 text-[#adc6ff]' :
                              'bg-[#424753]/30 text-[#8c909f]'
                            }`}>{c.status}</span>
                          </td>
                          <td className="px-6 py-4 text-[#c2c6d5]">{c.category}</td>
                          <td className="px-6 py-4 text-[#c2c6d5]">{c.entry_count ?? 0}</td>
                          <td className="px-6 py-4 text-[#8c909f]">{new Date(c.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* ── JOBS QUEUE TAB ── */}
          {activeTab === 'Jobs Queue' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-[#e5e2e1] font-['Manrope']">Jobs Queue</h2>
              <div className="bg-[#1c1b1b] p-8 rounded-xl text-center">
                <Terminal className="w-12 h-12 text-[#424753] mx-auto mb-4" />
                <p className="text-[#c2c6d5] text-sm font-['JetBrains_Mono'] uppercase tracking-widest">Jobs Queue Management</p>
                <p className="text-[#8c909f] text-xs mt-2 font-['JetBrains_Mono']">Coming soon — real-time job monitoring dashboard</p>
              </div>
            </div>
          )}

          {/* ── AGENTS TAB ── */}
          {activeTab === 'Agents' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-[#e5e2e1] font-['Manrope']">Agent Registry</h2>
              <div className="bg-[#1c1b1b] p-8 rounded-xl text-center">
                <Bot className="w-12 h-12 text-[#424753] mx-auto mb-4" />
                <p className="text-[#c2c6d5] text-sm font-['JetBrains_Mono'] uppercase tracking-widest">Agent Management</p>
                <p className="text-[#8c909f] text-xs mt-2 font-['JetBrains_Mono']">Coming soon — agent registry with status, bans, and ELO controls</p>
              </div>
            </div>
          )}

          {/* ── FEATURES TAB ── */}
          {activeTab === 'Features' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-[#e5e2e1] font-['Manrope']">Feature Flags</h2>
              <div className="bg-[#1c1b1b] p-6 rounded-xl">
                <h3 className="text-lg font-bold text-[#e5e2e1] mb-6 font-['Manrope']">System Feature Control</h3>
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
                <p className="text-[#8c909f] text-xs mt-4 font-['JetBrains_Mono']">Dynamic feature flag management coming soon</p>
              </div>
            </div>
          )}

          {/* ── HEALTH TAB ── */}
          {activeTab === 'Health' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-[#e5e2e1] font-['Manrope']">System Health</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[#1c1b1b] p-6 rounded-xl">
                  <h3 className="text-lg font-bold text-[#e5e2e1] mb-4 font-['Manrope']">Node Health</h3>
                  <div className="space-y-4">
                    {[
                      { name: 'Compute Cluster A', bars: [true, true, true, false] },
                      { name: 'Storage Backend', bars: [true, true, true, true] },
                      { name: 'Identity Provider', bars: [true, 'error', false, false] },
                      { name: 'API Gateway', bars: [true, true, true, true] },
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
                <div className="bg-[#1c1b1b] p-6 rounded-xl">
                  <h3 className="text-lg font-bold text-[#e5e2e1] mb-4 font-['Manrope']">API Health</h3>
                  <div className="text-center py-4">
                    <div className="flex items-center justify-center gap-3">
                      <div className="p-3 bg-[#7dffa2]/10 rounded-xl">
                        <Shield className="w-8 h-8 text-[#7dffa2]" />
                      </div>
                      <div className="text-left">
                        <div className="text-lg font-bold text-[#e5e2e1]">All Systems Nominal</div>
                        <div className="text-xs font-['JetBrains_Mono'] text-[#c2c6d5]">Last checked: just now</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </section>
      </main>
    </div>
  )
}
