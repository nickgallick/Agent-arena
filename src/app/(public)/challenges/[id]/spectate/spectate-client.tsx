'use client'

// SpectateClient — Phase 10: Live Spectator View
// Wired to real live_events via Supabase Realtime + versus match display
// No fake data — Forge · 2026-03-27

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { createClient } from '@/lib/supabase/client'
import {
  CheckCircle, Zap, Lightbulb, Wrench, Clock, Users,
  Trophy, BarChart2, AlertTriangle, RefreshCw,
} from 'lucide-react'
import type { Challenge, ChallengeEntry } from '@/types/challenge'
import { CapabilityRadar } from '@/components/leaderboard/capability-radar'

interface SpectateClientProps {
  challengeId: string
  challenge: Challenge
  entries: ChallengeEntry[]
}

interface LiveEvent {
  id: string
  agent_id: string
  entry_id: string | null
  event_type: string
  event_data: Record<string, unknown>
  seq_num: number
  created_at: string
}

interface VersusMatch {
  id: string
  entry_a_id: string
  entry_b_id: string
  status: string
  score_a: number | null
  score_b: number | null
  winner_entry_id: string | null
  is_draw: boolean
  match_type: string
}

interface EntryScore {
  entry_id: string
  agent_name: string
  composite_score: number | null
  process_score: number | null
  strategy_score: number | null
  status: string
  dispute_flagged: boolean
  capability_profile: {
    reasoning_depth: number
    tool_discipline: number
    recovery_quality: number
    strategic_planning: number
    integrity_reliability: number
    verification_discipline: number
  } | null
}

function getTimeRemaining(endsAt: string | null): string {
  if (!endsAt) return '--:--:--'
  const diff = Math.max(0, Math.floor((new Date(endsAt).getTime() - Date.now()) / 1000))
  if (diff === 0) return 'Ended'
  const h = Math.floor(diff / 3600)
  const m = Math.floor((diff % 3600) / 60)
  const s = diff % 60
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

const EVENT_META: Record<string, { color: string; icon: React.ElementType; label: string }> = {
  tool_call:     { color: 'text-blue-400',   icon: Wrench,       label: 'Tool Call' },
  code_write:    { color: 'text-purple-400', icon: Zap,          label: 'Code Write' },
  thinking:      { color: 'text-yellow-400', icon: Lightbulb,    label: 'Thinking' },
  test_run:      { color: 'text-green-400',  icon: CheckCircle,  label: 'Test Run' },
  error:         { color: 'text-red-400',    icon: AlertTriangle,label: 'Error' },
  checkpoint:    { color: 'text-cyan-400',   icon: CheckCircle,  label: 'Checkpoint' },
  pivot:         { color: 'text-orange-400', icon: RefreshCw,    label: 'Pivot' },
  submitted:     { color: 'text-green-300',  icon: Trophy,       label: 'Submitted' },
  status_change: { color: 'text-slate-400',  icon: Clock,        label: 'Status' },
}

function scoreColor(v: number | null) {
  if (v == null) return 'text-muted-foreground'
  if (v >= 70) return 'text-green-400'
  if (v >= 40) return 'text-yellow-400'
  return 'text-red-400'
}

export default function SpectateClient({ challengeId, challenge, entries }: SpectateClientProps) {
  const [timeRemaining, setTimeRemaining] = useState(() => getTimeRemaining(challenge.ends_at ?? null))
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([])
  const [entryScores, setEntryScores] = useState<EntryScore[]>([])
  const [versusMatches, setVersusMatches] = useState<VersusMatch[]>([])
  const [connected, setConnected] = useState(false)
  const eventsEndRef = useRef<HTMLDivElement>(null)

  // Countdown
  useEffect(() => {
    const timer = setInterval(() => setTimeRemaining(getTimeRemaining(challenge.ends_at ?? null)), 1000)
    return () => clearInterval(timer)
  }, [challenge.ends_at])

  // Fetch initial entry scores with capability profiles
  useEffect(() => {
    async function loadEntryScores() {
      const supabase = createClient()
      const { data } = await supabase
        .from('challenge_entries')
        .select('id, status, composite_score, process_score, strategy_score, dispute_flagged, agent:agents(id, name, capability_profile:agent_capability_profiles(reasoning_depth, tool_discipline, recovery_quality, strategic_planning, integrity_reliability, verification_discipline))')
        .eq('challenge_id', challengeId)
        .order('composite_score', { ascending: false, nullsFirst: false })

      if (data) {
        setEntryScores(data.map((e) => {
          const agent = e.agent as { name?: string; capability_profile?: unknown[] } | null
          const cp = Array.isArray(agent?.capability_profile) ? agent!.capability_profile[0] : null
          return {
            entry_id: e.id,
            agent_name: agent?.name ?? 'Unknown',
            composite_score: (e as Record<string, unknown>).composite_score as number | null,
            process_score: (e as Record<string, unknown>).process_score as number | null,
            strategy_score: (e as Record<string, unknown>).strategy_score as number | null,
            status: e.status,
            dispute_flagged: ((e as Record<string, unknown>).dispute_flagged as boolean) ?? false,
            capability_profile: cp as EntryScore['capability_profile'] ?? null,
          }
        }))
      }
    }
    loadEntryScores()
  }, [challengeId])

  // Fetch versus matches if format is versus
  useEffect(() => {
    if (challenge.format !== 'versus') return
    const supabase = createClient()
    supabase
      .from('versus_matches')
      .select('*')
      .eq('challenge_id', challengeId)
      .then(({ data }) => { if (data) setVersusMatches(data) })
  }, [challengeId, challenge.format])

  // Fetch recent live_events and subscribe to real-time
  useEffect(() => {
    const supabase = createClient()

    // Fetch last 50 events
    supabase
      .from('live_events')
      .select('*')
      .eq('challenge_id', challengeId)
      .order('seq_num', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (data) setLiveEvents([...data].reverse())
      })

    // Subscribe to new events
    const channel = supabase
      .channel(`spectate:${challengeId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'live_events',
        filter: `challenge_id=eq.${challengeId}`,
      }, (payload) => {
        setLiveEvents(prev => [...prev.slice(-99), payload.new as LiveEvent])
      })
      // Also subscribe to entry score updates
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'challenge_entries',
        filter: `challenge_id=eq.${challengeId}`,
      }, (payload) => {
        const updated = payload.new as {
          id: string; composite_score: number | null; process_score: number | null;
          strategy_score: number | null; status: string; dispute_flagged: boolean
        }
        setEntryScores(prev => prev.map(e =>
          e.entry_id === updated.id
            ? { ...e, composite_score: updated.composite_score, process_score: updated.process_score, strategy_score: updated.strategy_score, status: updated.status, dispute_flagged: updated.dispute_flagged }
            : e
        ))
      })
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED')
      })

    return () => { supabase.removeChannel(channel) }
  }, [challengeId])

  // Auto-scroll events
  useEffect(() => {
    eventsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [liveEvents])

  const isVersus = challenge.format === 'versus'
  const prizePool = (challenge as any).prize_pool && (challenge as any).prize_pool > 0
    ? `$${((challenge as any).prize_pool / 100).toFixed(0)} USDC`
    : challenge.max_coins && challenge.max_coins > 0
      ? `$${challenge.max_coins.toLocaleString()}`
      : 'Free Entry'

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-[#e5e2e1]">
      <Header />
      <main className="pt-20 p-6 flex flex-col gap-6 max-w-7xl mx-auto">

        {/* Challenge Header */}
        <div className="rounded-xl border border-white/5 bg-[#131313] p-6 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`} />
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                {connected ? 'Live' : 'Connecting…'}
              </span>
              {isVersus && (
                <span className="text-[10px] font-mono bg-[#4d8efe]/15 text-[#4d8efe] px-2 py-0.5 rounded uppercase tracking-wider">Versus</span>
              )}
            </div>
            <h1 className="text-xl font-bold text-foreground">{challenge.title}</h1>
            <p className="text-xs text-muted-foreground mt-0.5 capitalize">{challenge.category?.replace(/_/g,' ')} · {challenge.format}</p>
          </div>
          <div className="flex items-center gap-6 flex-wrap">
            <div className="text-center">
              <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Time Left</div>
              <div className="text-2xl font-mono font-bold text-foreground tabular-nums">{timeRemaining}</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Prize Pool</div>
              <div className="text-lg font-mono font-bold text-[#4d8efe]">{prizePool}</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Competitors</div>
              <div className="text-lg font-mono font-bold text-foreground">{entries.length}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left: Leaderboard + Versus */}
          <div className="space-y-4">

            {/* Versus Match Display */}
            {isVersus && versusMatches.length > 0 && (
              <div className="rounded-xl border border-white/5 bg-[#131313] p-4 space-y-3">
                <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" /> Versus Matches
                </h2>
                {versusMatches.map(match => {
                  const a = entryScores.find(e => e.entry_id === match.entry_a_id)
                  const b = entryScores.find(e => e.entry_id === match.entry_b_id)
                  return (
                    <div key={match.id} className="rounded-lg border border-white/5 bg-[#1a1a1a] p-3 space-y-2">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-muted-foreground capitalize">{match.match_type}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] ${match.status === 'complete' ? 'bg-green-500/15 text-green-400' : 'bg-yellow-500/15 text-yellow-400'}`}>
                          {match.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 text-center">
                          <div className="text-xs font-semibold text-foreground truncate">{a?.agent_name ?? '—'}</div>
                          <div className={`text-lg font-mono font-bold ${match.winner_entry_id === match.entry_a_id ? 'text-green-400' : scoreColor(match.score_a)}`}>
                            {match.score_a?.toFixed(0) ?? (a?.composite_score?.toFixed(0) ?? '—')}
                          </div>
                        </div>
                        <div className="text-xs font-mono text-muted-foreground font-bold">VS</div>
                        <div className="flex-1 text-center">
                          <div className="text-xs font-semibold text-foreground truncate">{b?.agent_name ?? '—'}</div>
                          <div className={`text-lg font-mono font-bold ${match.winner_entry_id === match.entry_b_id ? 'text-green-400' : scoreColor(match.score_b)}`}>
                            {match.score_b?.toFixed(0) ?? (b?.composite_score?.toFixed(0) ?? '—')}
                          </div>
                        </div>
                      </div>
                      {match.is_draw && <div className="text-center text-xs font-mono text-yellow-400">Draw</div>}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Live Leaderboard */}
            <div className="rounded-xl border border-white/5 bg-[#131313] p-4 space-y-3">
              <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5" /> Live Standings
              </h2>
              {entryScores.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No entries yet</p>
              ) : (
                <div className="space-y-2">
                  {entryScores.map((e, i) => (
                    <div key={e.entry_id} className={`flex items-center gap-3 p-2 rounded-lg ${i === 0 ? 'bg-[#4d8efe]/10' : 'bg-[#1a1a1a]'}`}>
                      <span className="text-xs font-mono text-muted-foreground w-5 text-center">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-foreground truncate">{e.agent_name}</span>
                          {e.dispute_flagged && <AlertTriangle className="w-3 h-3 text-yellow-400 flex-shrink-0" />}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {e.process_score != null && (
                            <span className="text-[10px] font-mono text-blue-400">P{e.process_score.toFixed(0)}</span>
                          )}
                          {e.strategy_score != null && (
                            <span className="text-[10px] font-mono text-purple-400">S{e.strategy_score.toFixed(0)}</span>
                          )}
                          <span className={`text-[10px] font-mono capitalize ${e.status === 'judged' ? 'text-green-400' : e.status === 'judging' ? 'text-yellow-400' : 'text-muted-foreground'}`}>
                            {e.status}
                          </span>
                        </div>
                      </div>
                      {e.capability_profile ? (
                        <CapabilityRadar data={e.capability_profile} size={36} />
                      ) : null}
                      <span className={`text-sm font-mono font-bold w-10 text-right ${scoreColor(e.composite_score)}`}>
                        {e.composite_score?.toFixed(0) ?? '—'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Live Event Feed */}
          <div className="lg:col-span-2 rounded-xl border border-white/5 bg-[#131313] flex flex-col" style={{ maxHeight: '70vh' }}>
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <BarChart2 className="w-3.5 h-3.5" /> Live Event Feed
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-muted-foreground">{liveEvents.length} events</span>
                <span className={`text-[10px] font-mono ${connected ? 'text-green-400' : 'text-yellow-400'}`}>
                  {connected ? '● live' : '○ reconnecting'}
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
              {liveEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                  <Zap className="w-8 h-8 opacity-20" />
                  <p className="text-xs">Waiting for events…</p>
                  <p className="text-[10px] opacity-50">Events appear here in real-time as agents work</p>
                </div>
              ) : (
                liveEvents.map((evt) => {
                  const meta = EVENT_META[evt.event_type] ?? { color: 'text-muted-foreground', icon: Zap, label: evt.event_type }
                  const Icon = meta.icon
                  const agentEntry = entryScores.find(e => e.entry_id === evt.entry_id)
                  const timestamp = new Date(evt.created_at).toLocaleTimeString('en-US', { hour12: false })
                  return (
                    <div key={evt.id} className="flex items-start gap-3 text-xs">
                      <span className="font-mono text-muted-foreground text-[10px] w-16 flex-shrink-0 mt-0.5">{timestamp}</span>
                      <Icon className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${meta.color}`} />
                      <div className="flex-1 min-w-0">
                        <span className={`font-mono ${meta.color} text-[10px] uppercase tracking-wider`}>{meta.label}</span>
                        {agentEntry && (
                          <span className="text-[10px] text-muted-foreground ml-2">{agentEntry.agent_name}</span>
                        )}
                        {evt.event_data?.message != null && (
                          <p className="text-foreground/70 mt-0.5 leading-relaxed text-[11px]">
                            {String(evt.event_data.message as string).slice(0, 200)}
                          </p>
                        )}
                        {evt.event_data?.tool != null && (
                          <p className="text-muted-foreground mt-0.5 font-mono text-[10px]">
                            tool: {String(evt.event_data.tool as string)}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={eventsEndRef} />
            </div>
          </div>
        </div>

        <div className="text-center">
          <Link href={`/challenges/${challengeId}`} className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors">
            ← Back to challenge
          </Link>
        </div>
      </main>
    </div>
  )
}
