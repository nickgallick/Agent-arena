'use client'

// Admin Challenges Page — Phase 7
// CDI scores, calibration status, quarantine management, difficulty profile editor
// All wired to real API endpoints — Forge · 2026-03-27

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle, CheckCircle, XCircle, Clock, BarChart2,
  Sliders, RefreshCw, Shield, ChevronDown, ChevronUp, Save,
} from 'lucide-react'

interface Challenge {
  id: string
  title: string
  status: string
  category: string
  format: string
  starts_at: string
  ends_at: string
  created_at: string
  cdi_score: number | null
  cdi_grade: string | null
  calibration_status: string
  freshness_score: number
  difficulty_profile: Record<string, number> | null
  quarantine_reason: string | null
  family_id: string | null
  entry_count?: number
  submitted_entry_count?: number
}

const DIFFICULTY_DIMENSIONS = [
  { key: 'reasoning_depth',       label: 'Reasoning Depth' },
  { key: 'tool_dependence',       label: 'Tool Dependence' },
  { key: 'ambiguity',             label: 'Ambiguity' },
  { key: 'deception',             label: 'Deception' },
  { key: 'time_pressure',         label: 'Time Pressure' },
  { key: 'error_recovery_burden', label: 'Error Recovery Burden' },
  { key: 'non_local_dependency',  label: 'Non-Local Dependency' },
  { key: 'evaluation_strictness', label: 'Evaluation Strictness' },
]

function CalibrationBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; label: string; icon: React.ElementType }> = {
    calibrated:   { color: 'bg-green-500/15 text-green-400',  label: 'Calibrated',   icon: CheckCircle },
    calibrating:  { color: 'bg-blue-500/15 text-blue-400',    label: 'Calibrating',  icon: RefreshCw },
    uncalibrated: { color: 'bg-yellow-500/15 text-yellow-400',label: 'Uncalibrated', icon: Clock },
    quarantined:  { color: 'bg-red-500/15 text-red-400',      label: 'Quarantined',  icon: XCircle },
  }
  const m = map[status] ?? map.uncalibrated
  const Icon = m.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono ${m.color}`}>
      <Icon className="w-3 h-3" />{m.label}
    </span>
  )
}

function CDIBadge({ grade, score }: { grade: string | null; score: number | null }) {
  if (!grade) return <span className="text-[10px] font-mono text-muted-foreground">—</span>
  const colors: Record<string, string> = {
    S: 'text-yellow-300', A: 'text-green-400', B: 'text-blue-400',
    C: 'text-orange-400', reject: 'text-red-400',
  }
  return (
    <span className={`text-sm font-mono font-bold ${colors[grade] ?? 'text-muted-foreground'}`}>
      {grade} <span className="text-xs font-normal text-muted-foreground">({score?.toFixed(0)})</span>
    </span>
  )
}

function DifficultyEditor({
  challengeId,
  initial,
  onSaved,
}: {
  challengeId: string
  initial: Record<string, number> | null
  onSaved: () => void
}) {
  const [profile, setProfile] = useState<Record<string, number>>(
    DIFFICULTY_DIMENSIONS.reduce((acc, d) => ({ ...acc, [d.key]: initial?.[d.key] ?? 5 }), {})
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/challenges/${challengeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ difficulty_profile: profile }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? 'Save failed')
      }
      onSaved()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4 pt-4 border-t border-border">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Sliders className="w-3.5 h-3.5" /> Difficulty Profile
        </span>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#4d8efe] text-white text-xs font-semibold disabled:opacity-50"
        >
          <Save className="w-3 h-3" />{saving ? 'Saving…' : 'Save Profile'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {DIFFICULTY_DIMENSIONS.map(d => (
          <div key={d.key} className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-mono text-muted-foreground">{d.label}</label>
              <span className="text-[10px] font-mono font-bold text-foreground">{profile[d.key]}</span>
            </div>
            <input
              type="range" min={1} max={10} step={1}
              value={profile[d.key]}
              onChange={e => setProfile(p => ({ ...p, [d.key]: Number(e.target.value) }))}
              className="w-full h-1 accent-[#4d8efe] cursor-pointer"
            />
          </div>
        ))}
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}

export default function AdminChallengesPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [quarantining, setQuarantining] = useState<string | null>(null)
  const router = useRouter()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/challenges?limit=100')
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) { router.push('/login'); return }
        throw new Error('Failed to load')
      }
      const d = await res.json()
      setChallenges(d.challenges ?? [])
    } catch {
      // handled
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => { load() }, [load])

  async function quarantine(id: string) {
    const reason = prompt('Quarantine reason:')
    if (!reason) return
    setQuarantining(id)
    try {
      await fetch(`/api/admin/challenges/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })
      await load()
    } finally {
      setQuarantining(null)
    }
  }

  async function recomputeCDI(id: string) {
    await fetch(`/api/admin/challenges/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ calibration_status: 'calibrating' }),
    })
    // Trigger CDI recompute via DB function
    await fetch('/api/internal/judge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_INTERNAL_SECRET ?? ''}` },
      body: JSON.stringify({ challenge_id: id, action: 'recompute_cdi' }),
    }).catch(() => {})
    await load()
  }

  const calibrationOrder = ['quarantined', 'uncalibrated', 'calibrating', 'calibrated']
  const sorted = [...challenges].sort((a, b) =>
    calibrationOrder.indexOf(a.calibration_status) - calibrationOrder.indexOf(b.calibration_status)
  )

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-foreground p-8">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Challenge Intelligence</h1>
            <p className="text-sm text-muted-foreground mt-1">CDI scores, calibration status, difficulty profiles, quarantine management</p>
          </div>
          <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors">
            <RefreshCw className="w-4 h-4" />Refresh
          </button>
        </div>

        {/* Summary stats */}
        {!loading && (
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Total',        val: challenges.length,                                           color: 'text-foreground' },
              { label: 'Calibrated',   val: challenges.filter(c => c.calibration_status === 'calibrated').length,   color: 'text-green-400' },
              { label: 'Uncalibrated', val: challenges.filter(c => c.calibration_status === 'uncalibrated').length, color: 'text-yellow-400' },
              { label: 'Quarantined',  val: challenges.filter(c => c.calibration_status === 'quarantined').length,  color: 'text-red-400' },
            ].map(s => (
              <div key={s.label} className="rounded-xl border border-border bg-[#131313] p-4">
                <div className={`text-2xl font-mono font-bold ${s.color}`}>{s.val}</div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Challenge table */}
        <div className="rounded-xl border border-border bg-[#131313] overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Loading…</div>
          ) : sorted.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No challenges found</div>
          ) : (
            <div className="divide-y divide-border">
              {sorted.map(c => (
                <div key={c.id}>
                  <div
                    className="flex items-center gap-4 px-6 py-4 hover:bg-white/[0.02] cursor-pointer"
                    onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                  >
                    {/* Title + status */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {c.calibration_status === 'quarantined' && <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />}
                        <span className="text-sm font-semibold text-foreground truncate">{c.title}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-mono text-muted-foreground">{c.format}</span>
                        <span className="text-[10px] font-mono text-muted-foreground">·</span>
                        <span className="text-[10px] font-mono text-muted-foreground capitalize">{c.category.replace(/_/g, ' ')}</span>
                        {c.family_id && (
                          <>
                            <span className="text-[10px] font-mono text-muted-foreground">·</span>
                            <span className="text-[10px] font-mono text-[#4d8efe]">{c.family_id}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* CDI */}
                    <div className="w-24 text-center">
                      <div className="text-[10px] font-mono text-muted-foreground mb-0.5">CDI</div>
                      <CDIBadge grade={c.cdi_grade} score={c.cdi_score} />
                    </div>

                    {/* Freshness */}
                    <div className="w-24 text-center">
                      <div className="text-[10px] font-mono text-muted-foreground mb-0.5">Freshness</div>
                      <span className={`text-sm font-mono font-bold ${c.freshness_score > 60 ? 'text-green-400' : c.freshness_score > 30 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {c.freshness_score?.toFixed(0)}%
                      </span>
                    </div>

                    {/* Calibration */}
                    <div className="w-32 text-center">
                      <CalibrationBadge status={c.calibration_status} />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      {c.calibration_status !== 'quarantined' && (
                        <button
                          onClick={() => quarantine(c.id)}
                          disabled={quarantining === c.id}
                          className="p-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Quarantine"
                        >
                          <Shield className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => recomputeCDI(c.id)}
                        className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
                        title="Recompute CDI"
                      >
                        <BarChart2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {expanded === c.id ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                  </div>

                  {/* Expanded: difficulty profile editor */}
                  {expanded === c.id && (
                    <div className="px-6 pb-6 bg-[#0f0f0f]">
                      {c.quarantine_reason && (
                        <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 flex items-start gap-2">
                          <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="text-xs font-semibold text-red-300">Quarantined</span>
                            <p className="text-xs text-red-400/80 mt-0.5">{c.quarantine_reason}</p>
                          </div>
                        </div>
                      )}
                      <DifficultyEditor
                        challengeId={c.id}
                        initial={c.difficulty_profile}
                        onSaved={load}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
