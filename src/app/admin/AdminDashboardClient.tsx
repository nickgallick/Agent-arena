'use client'

import Image from 'next/image'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  LayoutDashboard, Swords, Terminal, Bot, Flag, Activity, TrendingUp,
  Network, Zap, Shield, PlusCircle, X, Loader2, Inbox, FlaskConical,
  Package, BarChart3, ChevronDown, ChevronRight, Key, Tag, Users,
} from 'lucide-react'

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

// ── Intake Queue types ──
interface IntakeBundle {
  id: string
  challenge_id: string | null
  validation_status: string
  validation_results: Record<string, unknown> | null
  raw_bundle: Record<string, unknown> | null
  created_at: string
  challenges: {
    id: string
    title: string
    category: string
    format: string
    pipeline_status: string
  } | null
}

// ── Forge Review types ──
interface ForgeReviewItem {
  id: string
  challenge_id: string
  bundle_id: string | null
  verdict: string | null
  submitted_at: string
  challenges: {
    title: string
    category: string
    format: string
    weight_class_id: string | null
    pipeline_status: string
    validation_status?: string
  } | null
}

// ── Calibration types ──
interface CalibrationItem {
  id: string
  title: string
  category: string
  format: string
  pipeline_status: string
  calibration_status: string | null
  cdi_score: number | null
  calibration_results: {
    tier_spread: number | null
    clustering_risk: number | null
    borderline_triggers: number | null
    verdict: string | null
  } | null
}

// ── Inventory types ──
interface InventoryItem {
  id: string
  challenge_id: string
  recommended_decision: string | null
  advisory_rationale: string | null
  family_active_count: number | null
  challenges: {
    title: string
    category: string
    cdi_score: number | null
    pipeline_status: string
  } | null
}

interface InventorySummary {
  active: number
  reserve: number
  queued: number
}

// ── Health Dashboard types ──
interface HealthItem {
  id: string
  title: string
  family: string
  format: string
  status: string
  pipeline_status: string
  calibration_status: string | null
  cdi_score: number | null
  solve_rate: number | null
  score_mean: number | null
  score_stddev: number | null
  dispute_rate: number | null
  exploit_rate: number | null
  tier_separation: number | null
  entry_count: number
  last_calculated_at: string | null
  health_signal: 'healthy' | 'warning' | 'critical'
  web_submission_supported: boolean
  remote_invocation_supported: boolean
}

interface HealthSummary {
  healthy: number
  warning: number
  critical: number
}

// ── Judging Queue types ──
interface JudgingQueueStats {
  pending: number
  running: number
  dead_letters: number
  avg_latency_ms: number | null
  stuck_jobs: { id: string; submission_id: string; error_stage: string | null }[]
}

const CHALLENGE_CATEGORIES = [
  'speed_build', 'deep_research', 'problem_solving', 'algorithm',
  'debug', 'design', 'optimization', 'testing', 'code_golf',
]
const CHALLENGE_FORMATS = ['sprint', 'standard', 'marathon', 'creative']
const CHALLENGE_TYPES = ['daily', 'weekly_featured', 'special']

// Human-readable label map for internal pipeline/calibration status values.
// Prevents snake_case or machine labels from surfacing directly to operators.
const STATUS_LABELS: Record<string, string> = {
  // Challenge lifecycle
  active:                    'Active',
  upcoming:                  'Upcoming',
  inactive:                  'Inactive',
  draft:                     'Draft',
  archived:                  'Archived',
  // Pipeline statuses
  draft_review:              'Awaiting Review',
  approved_for_calibration:  'In Calibration',
  calibrating:               'Calibrating',
  calibration_complete:      'Cal. Complete',
  reserve:                   'In Reserve',
  queued_for_activation:     'Queued',
  activating:                'Activating',
  activation_failed:         'Activation Failed',
  // Calibration outcomes
  passed:                    'Passed',
  failed:                    'Failed',
  needs_revision:            'Needs Revision',
  quarantined:               'Quarantined',
  retired:                   'Retired',
  // Validation
  pending:                   'Pending',
  valid:                     'Valid',
  invalid:                   'Invalid',
  // Inventory decisions
  publish_now:               'Activate',
  hold_reserve:              'Hold in Reserve',
  queue_for_later:           'Queued',
  quarantine:                'Quarantine',
  // Tags
  approved:                  'Approved',
  rejected:                  'Rejected',
  warning:                   'Warning',
  // Generic
  complete:                  'Complete',
  completed:                 'Complete',
}

function StatusBadge({ status, className }: { status: string; className?: string }) {
  const color =
    status === 'active' || status === 'passed' || status === 'approved_for_calibration' || status === 'valid' || status === 'approved'
      ? 'bg-[#7dffa2]/15 text-[#7dffa2]'
      : status === 'upcoming' || status === 'pending' || status === 'calibrating' || status === 'approved_for_calibration' || status === 'queued_for_activation'
        ? 'bg-[#adc6ff]/15 text-[#adc6ff]'
        : status === 'failed' || status === 'quarantined' || status === 'needs_revision' || status === 'invalid' || status === 'rejected' || status === 'activation_failed'
          ? 'bg-[#ffb4ab]/15 text-[#ffb4ab]'
          : status === 'warning' || status === 'draft_review'
            ? 'bg-[#ffb780]/15 text-[#ffb780]'
            : status === 'reserve' || status === 'hold_reserve'
              ? 'bg-[#adc6ff]/10 text-[#adc6ff]'
              : 'bg-[#424753]/30 text-[#8c909f]'
  const label = STATUS_LABELS[status] ?? status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${color} ${className ?? ''}`} title={status}>
      {label}
    </span>
  )
}

export default function AdminDashboardClient({ isAdmin }: AdminDashboardClientProps) {
  const [activeTab, setActiveTab] = useState('Dashboard')

  // Dashboard stats
  const [stats, setStats] = useState<Stats | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)

  // Judging queue panel
  const [judgingQueue, setJudgingQueue] = useState<JudgingQueueStats | null>(null)

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
    entry_fee_cents: 0,
    max_entries: '' as number | '',
    family_id: '' as string,
    org_id: '' as string,
    is_sandbox: false,
    remote_invocation_supported: true,
    difficulty_profile: {
      reasoning_depth: 5,
      tool_dependence: 5,
      ambiguity: 5,
      deception: 5,
      time_pressure: 5,
      error_recovery_burden: 5,
      non_local_dependency: 5,
      evaluation_strictness: 5,
    } as Record<string, number>,
  })
  const [families, setFamilies] = useState<{ id: string; name: string; prestige: string }[]>([])
  const [adminOrgs, setAdminOrgs] = useState<{ id: string; name: string; slug: string }[]>([])

  // Intake Queue
  const [intakeBundles, setIntakeBundles] = useState<IntakeBundle[]>([])
  const [intakeLoading, setIntakeLoading] = useState(false)
  const [expandedBundle, setExpandedBundle] = useState<string | null>(null)
  const [bundleModal, setBundleModal] = useState<IntakeBundle | null>(null)

  // Forge Review
  const [forgeReviews, setForgeReviews] = useState<ForgeReviewItem[]>([])
  const [forgeLoading, setForgeLoading] = useState(false)
  const [revisionModal, setRevisionModal] = useState<{ challenge_id: string; bundle_id?: string } | null>(null)
  const [revisionNotes, setRevisionNotes] = useState('')
  const [forgeActionLoading, setForgeActionLoading] = useState<string | null>(null)

  // Calibration
  const [calibrationItems, setCalibrationItems] = useState<CalibrationItem[]>([])
  const [calibrationLoading, setCalibrationLoading] = useState(false)
  const [calibrationActionLoading, setCalibrationActionLoading] = useState<string | null>(null)

  // Inventory
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [inventorySummary, setInventorySummary] = useState<InventorySummary | null>(null)
  const [inventoryLoading, setInventoryLoading] = useState(false)
  const [inventoryActionLoading, setInventoryActionLoading] = useState<string | null>(null)

  // Health Dashboard
  const [healthItems, setHealthItems] = useState<HealthItem[]>([])
  const [healthSummary, setHealthSummary] = useState<HealthSummary | null>(null)
  const [healthLoading, setHealthLoading] = useState(false)
  const [healthActionLoading, setHealthActionLoading] = useState<string | null>(null)

  // Developer Metrics
  const [devMetrics, setDevMetrics] = useState<{
    token_creation_by_day: Array<{ day: string; production: number; sandbox: number; total: number }>
    token_env_split: { production: number; sandbox: number; total: number }
    webhook_stats: { total: number; active: number; disabled: number; failing: number; failure_rate: number }
    recent_failures_24h: number
  } | null>(null)
  const [devMetricsLoading, setDevMetricsLoading] = useState(false)

  // Tags Tab
  const [tagQueue, setTagQueue] = useState<Array<{
    id: string; tag: string; category: string; submitted_count: number; status: string; created_at: string
  }>>([])
  const [tagQueueLoading, setTagQueueLoading] = useState(false)
  const [tagPendingCount, setTagPendingCount] = useState(0)
  const [canonicalTags, setCanonicalTags] = useState<Array<{
    id: string; tag: string; category: string; status: string; description: string | null; aliases: string[]
  }>>([])
  const [canonicalTagsLoading, setCanonicalTagsLoading] = useState(false)
  const [canonicalSearch, setCanonicalSearch] = useState('')
  const [tagActionLoading, setTagActionLoading] = useState<string | null>(null)
  const [mergeInput, setMergeInput] = useState<Record<string, string>>({})

  // Retention Tab
  const [retentionData, setRetentionData] = useState<{
    period_days: number
    sandbox_to_production_conversion: {
      users_with_sandbox_only: number
      users_converted_to_production: number
      conversion_rate_pct: number
      median_days_to_convert: number
    }
    first_to_second_submission: {
      agents_with_one_submission: number
      agents_with_two_plus: number
      conversion_rate_pct: number
      median_days_to_second: number
    }
    repeat_usage_by_access_mode: Record<string, { total_users: number; repeat_users: number; repeat_rate_pct: number }>
    webhook_subscription_retention: { created_30d: number; still_active: number; retention_rate_pct: number }
    token_churn: { created_30d: number; revoked_30d: number; churn_rate_pct: number }
  } | null>(null)
  const [retentionLoading, setRetentionLoading] = useState(false)
  const [retentionDays, setRetentionDays] = useState<30 | 60 | 90>(30)

  // Analytics Tab
  const [analyticsData, setAnalyticsData] = useState<{
    access_mode_breakdown: Array<{ mode: string; count: number }>
    friction_hotspots: Array<{ error_code: string; count: number }>
    environment_split: Array<{ environment: string; count: number }>
    recent_errors: Array<{ id: string; event_type: string; error_code: string | null; access_mode: string | null; environment: string; created_at: string }>
  } | null>(null)
  const [analyticsFunnel, setAnalyticsFunnel] = useState<Array<{
    stage: number; label: string; event_type: string; distinct_users: number; total_events: number
    drop_off_pct: number | null; retention_from_prev: number | null
  }> | null>(null)
  const [analyticsAccessModes, setAnalyticsAccessModes] = useState<{
    by_mode: Array<{ mode: string; total: number; success: number; failures: number; failure_rate: number; last_seen: string }>
    daily_breakdown: Array<Record<string, unknown>>
  } | null>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)

  useEffect(() => {
    fetch('/api/admin/challenge-families')
      .then(r => r.ok ? r.json() : { families: [] })
      .then(d => setFamilies(d.families ?? []))
      .catch(() => {})
    // Fetch all orgs for the org_id selector
    fetch('/api/v1/orgs')
      .then(r => r.ok ? r.json() : { data: [] })
      .then(d => setAdminOrgs((d.data ?? []).map((o: { id: string; name: string; slug: string }) => ({ id: o.id, name: o.name, slug: o.slug }))))
      .catch(() => {})
  }, [])

  // Fetch judging queue stats (always on mount + tab change to Dashboard)
  const fetchJudgingQueue = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/judging-queue')
      if (!res.ok) return
      const data = await res.json()
      setJudgingQueue({
        pending: data.queue?.pending ?? 0,
        running: (data.queue?.claimed ?? 0) + (data.queue?.running ?? 0),
        dead_letters: data.queue?.dead_letter ?? 0,
        avg_latency_ms: data.latency?.avg_ms ?? null,
        stuck_jobs: data.stuck_jobs ?? [],
      })
    } catch {
      // non-critical
    }
  }, [])

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

  const fetchIntakeQueue = useCallback(async () => {
    setIntakeLoading(true)
    try {
      const res = await fetch('/api/admin/intake-queue')
      const data = await res.json()
      setIntakeBundles(data.bundles ?? [])
    } catch {
      setIntakeBundles([])
    } finally {
      setIntakeLoading(false)
    }
  }, [])

  const fetchForgeReviews = useCallback(async () => {
    setForgeLoading(true)
    try {
      const res = await fetch('/api/admin/forge-review')
      const data = await res.json()
      setForgeReviews(data.reviews ?? [])
    } catch {
      setForgeReviews([])
    } finally {
      setForgeLoading(false)
    }
  }, [])

  const fetchCalibration = useCallback(async () => {
    setCalibrationLoading(true)
    try {
      const [approvedRes, calibratingRes] = await Promise.all([
        fetch('/api/admin/challenges?pipeline_status=approved_for_calibration&limit=50'),
        fetch('/api/admin/challenges?pipeline_status=calibrating&limit=50'),
      ])
      const approvedData = await approvedRes.json()
      const calibratingData = await calibratingRes.json()
      const combined = [...(approvedData.challenges ?? []), ...(calibratingData.challenges ?? [])]
      // Deduplicate
      const seen = new Set<string>()
      const unique = combined.filter(c => {
        if (seen.has(c.id)) return false
        seen.add(c.id)
        return true
      })
      setCalibrationItems(unique.map(c => ({
        id: c.id,
        title: c.title,
        category: c.category,
        format: c.format ?? '',
        pipeline_status: c.pipeline_status ?? '',
        calibration_status: c.calibration_status ?? null,
        cdi_score: c.cdi_score ?? null,
        calibration_results: null,
      })))
    } catch {
      setCalibrationItems([])
    } finally {
      setCalibrationLoading(false)
    }
  }, [])

  const fetchInventory = useCallback(async () => {
    setInventoryLoading(true)
    try {
      const res = await fetch('/api/admin/inventory')
      const data = await res.json()
      setInventoryItems(data.candidates ?? [])
      setInventorySummary(data.summary ?? null)
    } catch {
      setInventoryItems([])
    } finally {
      setInventoryLoading(false)
    }
  }, [])

  const fetchHealth = useCallback(async () => {
    setHealthLoading(true)
    try {
      const res = await fetch('/api/admin/health-dashboard')
      const data = await res.json()
      setHealthItems(data.challenges ?? [])
      setHealthSummary(data.summary ?? null)
    } catch {
      setHealthItems([])
    } finally {
      setHealthLoading(false)
    }
  }, [])

  const fetchDevMetrics = useCallback(async () => {
    setDevMetricsLoading(true)
    try {
      const res = await fetch('/api/admin/developer-metrics')
      if (!res.ok) return
      const data = await res.json()
      setDevMetrics(data)
    } catch {
      // non-critical
    } finally {
      setDevMetricsLoading(false)
    }
  }, [])

  const fetchTagQueue = useCallback(async () => {
    setTagQueueLoading(true)
    try {
      const res = await fetch('/api/admin/tags?limit=200')
      if (!res.ok) return
      const data = await res.json()
      setTagQueue(data.tags ?? [])
      setTagPendingCount(data.pending_count ?? 0)
    } catch {
      // non-critical
    } finally {
      setTagQueueLoading(false)
    }
  }, [])

  const fetchCanonicalTags = useCallback(async (search?: string) => {
    setCanonicalTagsLoading(true)
    try {
      const params = new URLSearchParams({ limit: '200' })
      if (search) params.set('search', search)
      const res = await fetch(`/api/admin/tags/canonical?${params}`)
      if (!res.ok) return
      const data = await res.json()
      setCanonicalTags(data.tags ?? [])
    } catch {
      // non-critical
    } finally {
      setCanonicalTagsLoading(false)
    }
  }, [])

  const fetchRetention = useCallback(async (days: number = 30) => {
    setRetentionLoading(true)
    try {
      const res = await fetch(`/api/admin/analytics/retention?days=${days}`)
      if (!res.ok) return
      const data = await res.json()
      setRetentionData(data)
    } catch {
      // non-critical
    } finally {
      setRetentionLoading(false)
    }
  }, [])

  const fetchAnalytics = useCallback(async () => {
    setAnalyticsLoading(true)
    try {
      const [mainRes, funnelRes, modesRes] = await Promise.all([
        fetch('/api/admin/analytics?days=30'),
        fetch('/api/admin/analytics/funnel?days=30'),
        fetch('/api/admin/analytics/access-modes?days=30'),
      ])
      if (mainRes.ok) {
        const data = await mainRes.json()
        setAnalyticsData(data)
      }
      if (funnelRes.ok) {
        const data = await funnelRes.json()
        setAnalyticsFunnel(data.funnel ?? [])
      }
      if (modesRes.ok) {
        const data = await modesRes.json()
        setAnalyticsAccessModes(data)
      }
    } catch {
      // non-critical
    } finally {
      setAnalyticsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchJudgingQueue()
    if (activeTab === 'Dashboard') fetchStats()
    if (activeTab === 'Challenges') fetchChallenges()
    if (activeTab === 'Intake Queue') fetchIntakeQueue()
    if (activeTab === 'Forge Review') fetchForgeReviews()
    if (activeTab === 'Calibration') fetchCalibration()
    if (activeTab === 'Inventory') fetchInventory()
    if (activeTab === 'Challenge Health') fetchHealth()
    if (activeTab === 'Developer Metrics') fetchDevMetrics()
    if (activeTab === 'Analytics') fetchAnalytics()
    if (activeTab === 'Tags') { fetchTagQueue(); fetchCanonicalTags() }
    if (activeTab === 'Retention') fetchRetention(retentionDays)
  }, [activeTab, fetchStats, fetchChallenges, fetchIntakeQueue, fetchForgeReviews, fetchCalibration, fetchInventory, fetchHealth, fetchJudgingQueue, fetchDevMetrics, fetchAnalytics, fetchTagQueue, fetchCanonicalTags, fetchRetention, retentionDays])

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
          family_id: form.family_id || null,
          org_id: form.org_id || null,
          difficulty_profile: form.difficulty_profile,
          is_sandbox: form.is_sandbox,
          remote_invocation_supported: form.remote_invocation_supported,
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
          entry_fee_cents: 0, max_entries: '' as number | '', family_id: '', org_id: '',
          is_sandbox: false, remote_invocation_supported: true,
          difficulty_profile: { reasoning_depth: 5, tool_dependence: 5, ambiguity: 5, deception: 5, time_pressure: 5, error_recovery_burden: 5, non_local_dependency: 5, evaluation_strictness: 5 },
        })
        fetchChallenges()
      }
    } catch {
      setFormError('Network error — please try again')
    } finally {
      setFormSubmitting(false)
    }
  }

  async function handleForgeVerdict(challenge_id: string, bundle_id: string | undefined, verdict: 'approved_for_calibration' | 'needs_revision', revision_notes?: string) {
    setForgeActionLoading(challenge_id)
    try {
      const res = await fetch('/api/admin/forge-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challenge_id,
          bundle_id,
          verdict,
          objective_test_completeness: 'pass',
          fairness_assessment: verdict === 'needs_revision' ? (revision_notes ?? 'Needs revision') : 'Approved',
          solvability_verdict: 'Approved',
          exploit_surface_notes: 'None noted',
          hidden_test_quality: 'Acceptable',
          technical_credibility: 'Approved',
          revision_required: revision_notes,
        }),
      })
      if (res.ok) {
        await fetchForgeReviews()
        setRevisionModal(null)
        setRevisionNotes('')
      }
    } catch {
      // silently handle
    } finally {
      setForgeActionLoading(null)
    }
  }

  async function handleCalibrationAction(challenge_id: string, action: string) {
    setCalibrationActionLoading(challenge_id)
    try {
      const res = await fetch('/api/admin/calibration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, challenge_id }),
      })
      if (res.ok) await fetchCalibration()
    } catch {
      // silently handle
    } finally {
      setCalibrationActionLoading(null)
    }
  }

  async function handleInventoryAction(challenge_id: string, decision: string) {
    setInventoryActionLoading(challenge_id)
    try {
      const res = await fetch('/api/admin/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challenge_id, decision }),
      })
      if (res.ok) await fetchInventory()
    } catch {
      // silently handle
    } finally {
      setInventoryActionLoading(null)
    }
  }

  async function handleHealthAction(challenge_id: string, actionType: 'quarantine' | 'retire') {
    const reason = window.prompt(`Reason for ${actionType}:`)
    if (!reason) return
    setHealthActionLoading(`${challenge_id}-${actionType}`)
    try {
      const res = await fetch(`/api/admin/challenges/${challenge_id}/${actionType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })
      if (res.ok) await fetchHealth()
    } catch {
      // silently handle
    } finally {
      setHealthActionLoading(null)
    }
  }

  async function handleWebSubmissionToggle(challenge_id: string, currentValue: boolean) {
    setHealthActionLoading(`${challenge_id}-web`)
    try {
      const res = await fetch(`/api/admin/challenges/${challenge_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ web_submission_supported: !currentValue }),
      })
      if (res.ok) await fetchHealth()
    } catch {
      // silently handle
    } finally {
      setHealthActionLoading(null)
    }
  }

  async function handleRIToggle(challenge_id: string, currentValue: boolean) {
    setHealthActionLoading(`${challenge_id}-ri`)
    try {
      const res = await fetch(`/api/admin/challenges/${challenge_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remote_invocation_supported: !currentValue }),
      })
      if (res.ok) await fetchHealth()
    } catch {
      // silently handle
    } finally {
      setHealthActionLoading(null)
    }
  }

  async function handleTagAction(id: string, action: 'approve' | 'reject' | 'merge', mergeInto?: string) {
    setTagActionLoading(id)
    try {
      const body: Record<string, unknown> = { action }
      if (action === 'merge' && mergeInto) body.merge_into = mergeInto
      const res = await fetch(`/api/admin/tags/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        await fetchTagQueue()
        await fetchCanonicalTags()
        setMergeInput(prev => { const next = { ...prev }; delete next[id]; return next })
      }
    } catch {
      // silently handle
    } finally {
      setTagActionLoading(null)
    }
  }

  async function handleDeleteTag(id: string) {
    setTagActionLoading(id)
    try {
      const res = await fetch(`/api/admin/tags/${id}`, { method: 'DELETE' })
      if (res.ok) await fetchTagQueue()
    } catch {
      // silently handle
    } finally {
      setTagActionLoading(null)
    }
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#131313] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#ffb4ab] font-['JetBrains_Mono'] text-sm uppercase tracking-widest mb-4">ACCESS DENIED</p>
          <Link href="/" className="text-[#adc6ff] hover:underline font-['JetBrains_Mono'] text-xs">Return to Platform</Link>
        </div>
      </div>
    )
  }

  const tabs = [
    { label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { label: 'Challenges', icon: <Swords className="w-5 h-5" /> },
    { label: 'Intake Queue', icon: <Inbox className="w-5 h-5" /> },
    { label: 'Forge Review', icon: <FlaskConical className="w-5 h-5" /> },
    { label: 'Calibration', icon: <BarChart3 className="w-5 h-5" /> },
    { label: 'Inventory', icon: <Package className="w-5 h-5" /> },
    { label: 'Challenge Health', icon: <Activity className="w-5 h-5" /> },
    { label: 'Jobs Queue', icon: <Terminal className="w-5 h-5" /> },
    { label: 'Agents', icon: <Bot className="w-5 h-5" /> },
    { label: 'Features', icon: <Flag className="w-5 h-5" /> },
    { label: 'Health', icon: <Shield className="w-5 h-5" /> },
    { label: 'Developer Metrics', icon: <Key className="w-5 h-5" /> },
    { label: 'Analytics', icon: <TrendingUp className="w-5 h-5" /> },
    {
      label: 'Tags',
      icon: (
        <span className="relative">
          <Tag className="w-5 h-5" />
          {tagPendingCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-[#ffb780] text-[#1a0e00] text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
              {tagPendingCount > 9 ? '9+' : tagPendingCount}
            </span>
          )}
        </span>
      ),
    },
    { label: 'Retention', icon: <Users className="w-5 h-5" /> },
  ]

  return (
    <div className="min-h-screen bg-[#131313] text-[#e5e2e1]">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-[#131313]/80 backdrop-blur-xl flex justify-between items-center h-16 px-8">
        <Link href="/" className="inline-flex hover:opacity-80 transition-opacity">
          <Image src="/bouts-logo.png" alt="Bouts" width={90} height={43} className="h-8 w-auto" />
        </Link>
        <nav className="hidden md:flex gap-8 items-center font-['Manrope'] font-medium tracking-tight">
          <Link href="/challenges" className="text-[#c2c6d5] hover:text-[#adc6ff] transition-colors duration-150">Challenges</Link>
          <Link href="/agents" className="text-[#c2c6d5] hover:text-[#adc6ff] transition-colors duration-150">Agents</Link>
          <Link href="/leaderboard" className="text-[#c2c6d5] hover:text-[#adc6ff] transition-colors duration-150">Leaderboard</Link>
          <Link href="/docs" className="text-[#c2c6d5] hover:text-[#adc6ff] transition-colors duration-150">Docs</Link>
        </nav>
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="bg-gradient-to-br from-[#adc6ff] to-[#4d8efe] text-[#001a41] px-4 py-2 rounded font-bold text-sm active:scale-95 transition-transform">
            Connect Your Agent
          </Link>
        </div>
      </header>

      {/* Judging Queue Status Bar */}
      {judgingQueue && (
        <div className="fixed top-16 w-full z-40 bg-[#0e0e0e]/90 backdrop-blur border-b border-[#424753]/20 px-8 py-2 flex items-center gap-6 text-[10px] font-['JetBrains_Mono']">
          <span className="text-[#8c909f] uppercase tracking-widest">Judging Queue</span>
          <span className="text-[#adc6ff]">Pending: <strong>{judgingQueue.pending}</strong></span>
          <span className="text-[#adc6ff]">Running: <strong>{judgingQueue.running}</strong></span>
          {judgingQueue.dead_letters > 0 ? (
            <span className="text-[#ffb4ab] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ffb4ab] animate-pulse inline-block" />
              Dead Letters: <strong>{judgingQueue.dead_letters}</strong>
            </span>
          ) : (
            <span className="text-[#7dffa2]">Dead Letters: <strong>0</strong></span>
          )}
          {judgingQueue.avg_latency_ms != null && (
            <span className="text-[#c2c6d5]">Avg Latency: <strong>{(judgingQueue.avg_latency_ms / 1000).toFixed(1)}s</strong></span>
          )}
        </div>
      )}

      <main className={`flex-grow ${judgingQueue ? 'pt-32' : 'pt-24'} pb-32 px-4 md:px-8 max-w-[1600px] mx-auto w-full grid grid-cols-12 gap-6`}>

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

        {/* Main Content */}
        <section className="col-span-12 lg:col-span-10">

          {/* ── DASHBOARD TAB ── */}
          {activeTab === 'Dashboard' && (
            <div className="grid grid-cols-12 gap-6">
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
              <div className="col-span-12 md:col-span-6 bg-[#1c1b1b] p-6 rounded-xl flex flex-col justify-between">
                <div>
                  <h2 className="text-lg font-bold text-[#e5e2e1] mb-4 font-['Manrope']">Node Health</h2>
                  <div className="space-y-4">
                    {[
                      { name: 'Compute Cluster A', bars: [true, true, true, false] as (boolean | string)[] },
                      { name: 'Storage Backend', bars: [true, true, true, true] as (boolean | string)[] },
                      { name: 'Identity Provider', bars: [true, 'error', false, false] as (boolean | string)[] },
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
              <div className="col-span-12 md:col-span-6 bg-[#1c1b1b] p-6 rounded-xl">
                <h2 className="text-lg font-bold text-[#e5e2e1] mb-4 font-['Manrope']">Quick Nav</h2>
                <div className="space-y-3">
                  {[
                    { label: 'Manage Challenges', sub: 'Create, edit & review bouts', tab: 'Challenges', icon: <Swords className="w-4 h-4" /> },
                    { label: 'Jobs Queue', sub: 'Monitor active & pending jobs', tab: 'Jobs Queue', icon: <Terminal className="w-4 h-4" /> },
                    { label: 'Agent Registry', sub: 'View all registered agents', tab: 'Agents', icon: <Bot className="w-4 h-4" /> },
                    { label: 'Challenge Health', sub: 'Monitor solve rates & anomalies', tab: 'Challenge Health', icon: <Activity className="w-4 h-4" /> },
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
                        placeholder="Full instructions for agents" required maxLength={10000} rows={4}
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
                      <label className="text-[10px] font-['JetBrains_Mono'] uppercase tracking-widest text-[#c2c6d5]">Challenge Window Opens (UTC) *</label>
                      <input type="datetime-local" value={form.starts_at} onChange={e => setForm(f => ({ ...f, starts_at: e.target.value }))}
                        required className="bg-[#0e0e0e] text-[#e5e2e1] px-4 py-2.5 rounded text-sm border-none outline-none focus:ring-1 focus:ring-[#adc6ff]/30" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-['JetBrains_Mono'] uppercase tracking-widest text-[#c2c6d5]">Challenge Window Closes (UTC) *</label>
                      <input type="datetime-local" value={form.ends_at} onChange={e => setForm(f => ({ ...f, ends_at: e.target.value }))}
                        required className="bg-[#0e0e0e] text-[#e5e2e1] px-4 py-2.5 rounded text-sm border-none outline-none focus:ring-1 focus:ring-[#adc6ff]/30" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-['JetBrains_Mono'] uppercase tracking-widest text-[#c2c6d5]" title="Per-entry session: starts when a competitor opens the workspace. Separate from the challenge window. Default: 60 min.">Per-Entry Session (minutes)</label>
                      <input type="number" value={form.time_limit_minutes} onChange={e => setForm(f => ({ ...f, time_limit_minutes: Number(e.target.value) }))}
                        min={5} max={480} placeholder="60" className="bg-[#0e0e0e] text-[#e5e2e1] px-4 py-2.5 rounded text-sm border-none outline-none focus:ring-1 focus:ring-[#adc6ff]/30" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-['JetBrains_Mono'] uppercase tracking-widest text-[#c2c6d5]">Max Coins Prize</label>
                      <input type="number" value={form.max_coins} onChange={e => setForm(f => ({ ...f, max_coins: Number(e.target.value) }))}
                        min={0} max={10000} className="bg-[#0e0e0e] text-[#e5e2e1] px-4 py-2.5 rounded text-sm border-none outline-none focus:ring-1 focus:ring-[#adc6ff]/30" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-['JetBrains_Mono'] uppercase tracking-widest text-[#c2c6d5]">Entry Fee (USD) — 0 = free</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8c909f] text-sm">$</span>
                        <input
                          type="number"
                          value={form.entry_fee_cents === 0 ? '' : (form.entry_fee_cents / 100).toFixed(2)}
                          onChange={e => {
                            const val = e.target.value
                            const cents = val === '' ? 0 : Math.round(parseFloat(val) * 100)
                            setForm(f => ({ ...f, entry_fee_cents: isNaN(cents) ? 0 : cents }))
                          }}
                          placeholder="0.00" min={0} step={0.01}
                          className="bg-[#0e0e0e] text-[#e5e2e1] pl-7 pr-4 py-2.5 rounded text-sm border-none outline-none focus:ring-1 focus:ring-[#adc6ff]/30 w-full"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-['JetBrains_Mono'] uppercase tracking-widest text-[#c2c6d5]">Max Entries (blank = unlimited)</label>
                      <input type="number" value={form.max_entries} onChange={e => setForm(f => ({ ...f, max_entries: e.target.value === '' ? '' : Number(e.target.value) }))}
                        placeholder="Unlimited" min={1} max={10000}
                        className="bg-[#0e0e0e] text-[#e5e2e1] px-4 py-2.5 rounded text-sm border-none outline-none focus:ring-1 focus:ring-[#adc6ff]/30" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-['JetBrains_Mono'] uppercase tracking-widest text-[#c2c6d5]">Challenge Family</label>
                      <select value={form.family_id} onChange={e => setForm(f => ({ ...f, family_id: e.target.value }))}
                        className="bg-[#0e0e0e] text-[#e5e2e1] px-4 py-2.5 rounded text-sm border-none outline-none focus:ring-1 focus:ring-[#adc6ff]/30">
                        <option value="">— None (standalone) —</option>
                        {families.map(fam => (
                          <option key={fam.id} value={fam.id}>{fam.name} ({fam.prestige})</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-['JetBrains_Mono'] uppercase tracking-widest text-[#c2c6d5]">Organization (private track)</label>
                      <select value={form.org_id} onChange={e => setForm(f => ({ ...f, org_id: e.target.value }))}
                        className="bg-[#0e0e0e] text-[#e5e2e1] px-4 py-2.5 rounded text-sm border-none outline-none focus:ring-1 focus:ring-[#adc6ff]/30">
                        <option value="">— Public (no org) —</option>
                        {adminOrgs.map(org => (
                          <option key={org.id} value={org.id}>{org.name} ({org.slug})</option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-2 space-y-3">
                      <label className="text-[10px] font-['JetBrains_Mono'] uppercase tracking-widest text-[#c2c6d5] flex items-center gap-2">
                        Difficulty Profile <span className="text-[#8c909f] normal-case tracking-normal font-normal">(1–10 per dimension)</span>
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                          { key: 'reasoning_depth', label: 'Reasoning' },
                          { key: 'tool_dependence', label: 'Tool Dep.' },
                          { key: 'ambiguity', label: 'Ambiguity' },
                          { key: 'deception', label: 'Deception' },
                          { key: 'time_pressure', label: 'Time Pressure' },
                          { key: 'error_recovery_burden', label: 'Recovery' },
                          { key: 'non_local_dependency', label: 'Non-Local Dep.' },
                          { key: 'evaluation_strictness', label: 'Strictness' },
                        ].map(dim => (
                          <div key={dim.key} className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-['JetBrains_Mono'] text-[#8c909f]">{dim.label}</span>
                              <span className="text-[10px] font-['JetBrains_Mono'] font-bold text-[#adc6ff]">{form.difficulty_profile[dim.key]}</span>
                            </div>
                            <input type="range" min={1} max={10} step={1}
                              value={form.difficulty_profile[dim.key]}
                              onChange={e => setForm(f => ({
                                ...f,
                                difficulty_profile: { ...f.difficulty_profile, [dim.key]: Number(e.target.value) }
                              }))}
                              className="w-full h-1 accent-[#4d8efe] cursor-pointer"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Submission path + environment controls */}
                    <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-[#424753]/20">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.remote_invocation_supported}
                          onChange={e => setForm(f => ({ ...f, remote_invocation_supported: e.target.checked }))}
                          className="mt-0.5 accent-[#adc6ff]"
                        />
                        <div>
                          <span className="text-[11px] font-['JetBrains_Mono'] font-bold text-[#c2c6d5] block">Remote Agent Invocation</span>
                          <span className="text-[10px] text-[#8c909f] font-['JetBrains_Mono']">Bouts calls the agent's HTTPS endpoint. Production submission path.</span>
                        </div>
                      </label>
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.is_sandbox}
                          onChange={e => setForm(f => ({ ...f, is_sandbox: e.target.checked }))}
                          className="mt-0.5 accent-[#ffb780]"
                        />
                        <div>
                          <span className="text-[11px] font-['JetBrains_Mono'] font-bold text-[#c2c6d5] block">Sandbox Challenge</span>
                          <span className="text-[10px] text-[#8c909f] font-['JetBrains_Mono']">Visible to all for practice. Does not affect public leaderboards. Not included in anon challenge list.</span>
                        </div>
                      </label>
                    </div>

                    {formError && <p className="md:col-span-2 text-sm text-[#ffb4ab]">{formError}</p>}
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

              <div className="bg-[#1c1b1b] rounded-xl overflow-hidden">
                {challengesLoading ? (
                  <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#adc6ff]" /></div>
                ) : challenges.length === 0 ? (
                  <div className="p-8 text-center text-[#8c909f] text-sm font-['JetBrains_Mono']">No challenges found. Create one above.</div>
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
                          <td className="px-6 py-4"><StatusBadge status={c.status} /></td>
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

          {/* ── INTAKE QUEUE TAB ── */}
          {activeTab === 'Intake Queue' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-[#e5e2e1] font-['Manrope']">Intake Queue</h2>
              {intakeLoading ? (
                <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#adc6ff]" /></div>
              ) : intakeBundles.length === 0 ? (
                <div className="bg-[#1c1b1b] p-12 rounded-xl text-center">
                  <Inbox className="w-12 h-12 text-[#424753] mx-auto mb-4" />
                  <p className="text-[#c2c6d5] text-sm font-['JetBrains_Mono'] uppercase tracking-widest">No bundles pending validation</p>
                </div>
              ) : (
                <div className="bg-[#1c1b1b] rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs font-['JetBrains_Mono']">
                    <thead>
                      <tr className="text-[#c2c6d5] border-b border-[#424753]/20">
                        <th className="px-6 py-4 uppercase tracking-widest">Bundle ID</th>
                        <th className="px-6 py-4 uppercase tracking-widest">Title</th>
                        <th className="px-6 py-4 uppercase tracking-widest">Family</th>
                        <th className="px-6 py-4 uppercase tracking-widest">Format</th>
                        <th className="px-6 py-4 uppercase tracking-widest">Status</th>
                        <th className="px-6 py-4 uppercase tracking-widest">Created</th>
                        <th className="px-6 py-4 uppercase tracking-widest">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#424753]/10">
                      {intakeBundles.map(bundle => (
                        <>
                          <tr key={bundle.id} className="hover:bg-[#201f1f] transition-colors">
                            <td className="px-6 py-4 text-[#8c909f]">{bundle.id.slice(0, 8)}…</td>
                            <td className="px-6 py-4 text-[#e5e2e1] font-bold">{bundle.challenges?.title ?? '—'}</td>
                            <td className="px-6 py-4 text-[#c2c6d5]">{bundle.challenges?.category ?? '—'}</td>
                            <td className="px-6 py-4 text-[#c2c6d5]">{bundle.challenges?.format ?? '—'}</td>
                            <td className="px-6 py-4"><StatusBadge status={bundle.validation_status} /></td>
                            <td className="px-6 py-4 text-[#8c909f]">{new Date(bundle.created_at).toLocaleDateString()}</td>
                            <td className="px-6 py-4 flex items-center gap-2">
                              <button
                                onClick={() => setBundleModal(bundle)}
                                className="px-3 py-1.5 bg-[#adc6ff]/10 text-[#adc6ff] rounded text-[10px] font-bold hover:bg-[#adc6ff]/20 transition-colors"
                              >
                                View Bundle
                              </button>
                              {bundle.validation_status === 'failed' && (
                                <button
                                  onClick={() => setExpandedBundle(expandedBundle === bundle.id ? null : bundle.id)}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-[#ffb4ab]/10 text-[#ffb4ab] rounded text-[10px] font-bold hover:bg-[#ffb4ab]/20 transition-colors"
                                >
                                  Failures
                                  {expandedBundle === bundle.id
                                    ? <ChevronDown className="w-3 h-3" />
                                    : <ChevronRight className="w-3 h-3" />}
                                </button>
                              )}
                            </td>
                          </tr>
                          {expandedBundle === bundle.id && bundle.validation_status === 'failed' && (
                            <tr key={`${bundle.id}-failures`} className="bg-[#1a0a0a]">
                              <td colSpan={7} className="px-6 py-4">
                                <div className="space-y-1">
                                  <p className="text-[10px] uppercase tracking-widest text-[#ffb4ab] mb-2">Failure Reasons</p>
                                  {bundle.validation_results
                                    ? Object.entries(bundle.validation_results).map(([k, v]) => (
                                      <div key={k} className="text-xs text-[#e5e2e1]">
                                        <span className="text-[#ffb4ab]">{k}:</span> {String(v)}
                                      </div>
                                    ))
                                    : <p className="text-xs text-[#8c909f]">No validation details available</p>
                                  }
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Bundle JSON Modal */}
              {bundleModal && (
                <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
                  <div className="bg-[#1c1b1b] rounded-xl w-full max-w-3xl max-h-[80vh] flex flex-col border border-white/10">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-[#424753]/20">
                      <h3 className="font-bold text-[#e5e2e1]">Bundle: {bundleModal.id.slice(0, 8)}…</h3>
                      <button onClick={() => setBundleModal(null)} className="text-[#8c909f] hover:text-[#e5e2e1]"><X className="w-5 h-5" /></button>
                    </div>
                    <div className="overflow-auto p-6">
                      <pre className="text-xs text-[#c2c6d5] font-['JetBrains_Mono'] whitespace-pre-wrap">
                        {JSON.stringify(bundleModal.raw_bundle ?? bundleModal, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── FORGE REVIEW TAB ── */}
          {activeTab === 'Forge Review' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-[#e5e2e1] font-['Manrope']">Forge Review Queue</h2>
              {forgeLoading ? (
                <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#adc6ff]" /></div>
              ) : forgeReviews.length === 0 ? (
                <div className="bg-[#1c1b1b] p-12 rounded-xl text-center">
                  <FlaskConical className="w-12 h-12 text-[#424753] mx-auto mb-4" />
                  <p className="text-[#c2c6d5] text-sm font-['JetBrains_Mono'] uppercase tracking-widest">No challenges awaiting Forge review</p>
                </div>
              ) : (
                <div className="bg-[#1c1b1b] rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs font-['JetBrains_Mono']">
                    <thead>
                      <tr className="text-[#c2c6d5] border-b border-[#424753]/20">
                        <th className="px-6 py-4 uppercase tracking-widest">Challenge</th>
                        <th className="px-6 py-4 uppercase tracking-widest">Family</th>
                        <th className="px-6 py-4 uppercase tracking-widest">Format</th>
                        <th className="px-6 py-4 uppercase tracking-widest">Weight</th>
                        <th className="px-6 py-4 uppercase tracking-widest">Validation</th>
                        <th className="px-6 py-4 uppercase tracking-widest">Submitted</th>
                        <th className="px-6 py-4 uppercase tracking-widest">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#424753]/10">
                      {forgeReviews.map(review => (
                        <tr key={review.id} className="hover:bg-[#201f1f] transition-colors">
                          <td className="px-6 py-4 text-[#e5e2e1] font-bold">{review.challenges?.title ?? '—'}</td>
                          <td className="px-6 py-4 text-[#c2c6d5]">{review.challenges?.category ?? '—'}</td>
                          <td className="px-6 py-4 text-[#c2c6d5]">{review.challenges?.format ?? '—'}</td>
                          <td className="px-6 py-4 text-[#c2c6d5]">{review.challenges?.weight_class_id ?? 'open'}</td>
                          <td className="px-6 py-4">
                            <StatusBadge status={review.challenges?.validation_status ?? review.challenges?.pipeline_status ?? 'pending'} />
                          </td>
                          <td className="px-6 py-4 text-[#8c909f]">{new Date(review.submitted_at).toLocaleDateString()}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                disabled={forgeActionLoading === review.challenge_id}
                                onClick={() => handleForgeVerdict(review.challenge_id, review.bundle_id ?? undefined, 'approved_for_calibration')}
                                className="px-3 py-1.5 bg-[#7dffa2]/10 text-[#7dffa2] rounded text-[10px] font-bold hover:bg-[#7dffa2]/20 transition-colors disabled:opacity-50"
                              >
                                {forgeActionLoading === review.challenge_id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Approve'}
                              </button>
                              <button
                                disabled={forgeActionLoading === review.challenge_id}
                                onClick={() => setRevisionModal({ challenge_id: review.challenge_id, bundle_id: review.bundle_id ?? undefined })}
                                className="px-3 py-1.5 bg-[#ffb780]/10 text-[#ffb780] rounded text-[10px] font-bold hover:bg-[#ffb780]/20 transition-colors disabled:opacity-50"
                              >
                                Needs Revision
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Revision Modal */}
              {revisionModal && (
                <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
                  <div className="bg-[#1c1b1b] rounded-xl w-full max-w-lg border border-white/10">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-[#424753]/20">
                      <h3 className="font-bold text-[#e5e2e1]">Request Revision</h3>
                      <button onClick={() => { setRevisionModal(null); setRevisionNotes('') }} className="text-[#8c909f] hover:text-[#e5e2e1]"><X className="w-5 h-5" /></button>
                    </div>
                    <div className="p-6 space-y-4">
                      <label className="text-[10px] font-['JetBrains_Mono'] uppercase tracking-widest text-[#c2c6d5]">Revision Notes *</label>
                      <textarea
                        value={revisionNotes}
                        onChange={e => setRevisionNotes(e.target.value)}
                        rows={5}
                        placeholder="Describe what needs to be fixed..."
                        className="w-full bg-[#0e0e0e] text-[#e5e2e1] px-4 py-2.5 rounded text-sm border-none outline-none focus:ring-1 focus:ring-[#adc6ff]/30 resize-none"
                      />
                      <div className="flex gap-3">
                        <button
                          disabled={!revisionNotes.trim() || forgeActionLoading === revisionModal.challenge_id}
                          onClick={() => handleForgeVerdict(revisionModal.challenge_id, revisionModal.bundle_id, 'needs_revision', revisionNotes)}
                          className="flex items-center gap-2 bg-[#ffb780] text-[#1a0e00] px-5 py-2.5 rounded font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                          {forgeActionLoading === revisionModal.challenge_id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Revision Request'}
                        </button>
                        <button onClick={() => { setRevisionModal(null); setRevisionNotes('') }}
                          className="px-5 py-2.5 rounded font-bold text-sm bg-[#201f1f] text-[#c2c6d5] hover:bg-[#2a2a2a] transition-colors">
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── CALIBRATION TAB ── */}
          {activeTab === 'Calibration' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-[#e5e2e1] font-['Manrope']">Calibration</h2>
              {calibrationLoading ? (
                <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#adc6ff]" /></div>
              ) : calibrationItems.length === 0 ? (
                <div className="bg-[#1c1b1b] p-12 rounded-xl text-center">
                  <BarChart3 className="w-12 h-12 text-[#424753] mx-auto mb-4" />
                  <p className="text-[#c2c6d5] text-sm font-['JetBrains_Mono'] uppercase tracking-widest">No challenges pending calibration</p>
                </div>
              ) : (
                <div className="bg-[#1c1b1b] rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs font-['JetBrains_Mono']">
                    <thead>
                      <tr className="text-[#c2c6d5] border-b border-[#424753]/20">
                        <th className="px-6 py-4 uppercase tracking-widest">Challenge</th>
                        <th className="px-6 py-4 uppercase tracking-widest">CDI</th>
                        <th className="px-6 py-4 uppercase tracking-widest">Tier Spread</th>
                        <th className="px-6 py-4 uppercase tracking-widest">Clustering Risk</th>
                        <th className="px-6 py-4 uppercase tracking-widest">Borderline Triggers</th>
                        <th className="px-6 py-4 uppercase tracking-widest">Status</th>
                        <th className="px-6 py-4 uppercase tracking-widest">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#424753]/10">
                      {calibrationItems.map(item => (
                        <tr key={item.id} className="hover:bg-[#201f1f] transition-colors">
                          <td className="px-6 py-4 text-[#e5e2e1] font-bold">{item.title}</td>
                          <td className="px-6 py-4">
                            {item.cdi_score != null ? (
                              <span className={item.cdi_score >= 60 ? 'text-[#7dffa2] font-bold' : 'text-[#ffb4ab] font-bold'}>
                                {item.cdi_score.toFixed(1)}
                              </span>
                            ) : <span className="text-[#8c909f]">—</span>}
                          </td>
                          <td className="px-6 py-4 text-[#c2c6d5]">{item.calibration_results?.tier_spread?.toFixed(2) ?? '—'}</td>
                          <td className="px-6 py-4 text-[#c2c6d5]">{item.calibration_results?.clustering_risk?.toFixed(2) ?? '—'}</td>
                          <td className="px-6 py-4 text-[#c2c6d5]">{item.calibration_results?.borderline_triggers ?? '—'}</td>
                          <td className="px-6 py-4"><StatusBadge status={item.calibration_status ?? 'draft'} /></td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                disabled={calibrationActionLoading === item.id}
                                onClick={() => handleCalibrationAction(item.id, 'run_synthetic')}
                                className="px-3 py-1.5 bg-[#adc6ff]/10 text-[#adc6ff] rounded text-[10px] font-bold hover:bg-[#adc6ff]/20 transition-colors disabled:opacity-50"
                              >
                                {calibrationActionLoading === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Run Calibration'}
                              </button>
                              {item.calibration_status === 'passed' && (
                                <button
                                  disabled={calibrationActionLoading === item.id}
                                  onClick={() => handleInventoryAction(item.id, 'hold_reserve')}
                                  className="px-3 py-1.5 bg-[#7dffa2]/10 text-[#7dffa2] rounded text-[10px] font-bold hover:bg-[#7dffa2]/20 transition-colors disabled:opacity-50"
                                >
                                  Move to Inventory
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── INVENTORY TAB ── */}
          {activeTab === 'Inventory' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-[#e5e2e1] font-['Manrope']">Inventory</h2>
              {inventorySummary && (
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Active', value: inventorySummary.active, color: 'text-[#7dffa2]' },
                    { label: 'In Reserve', value: inventorySummary.reserve, color: 'text-[#adc6ff]' },
                    { label: 'Queued', value: inventorySummary.queued, color: 'text-[#ffb780]' },
                  ].map(s => (
                    <div key={s.label} className="bg-[#1c1b1b] p-5 rounded-xl text-center">
                      <div className={`text-3xl font-black ${s.color}`}>{s.value}</div>
                      <div className="text-[10px] font-['JetBrains_Mono'] text-[#c2c6d5] uppercase tracking-widest mt-1">{s.label}</div>
                    </div>
                  ))}
                </div>
              )}
              {inventoryLoading ? (
                <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#adc6ff]" /></div>
              ) : inventoryItems.length === 0 ? (
                <div className="bg-[#1c1b1b] p-12 rounded-xl text-center">
                  <Package className="w-12 h-12 text-[#424753] mx-auto mb-4" />
                  <p className="text-[#c2c6d5] text-sm font-['JetBrains_Mono'] uppercase tracking-widest">No candidates in inventory</p>
                </div>
              ) : (
                <div className="bg-[#1c1b1b] rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs font-['JetBrains_Mono']">
                    <thead>
                      <tr className="text-[#c2c6d5] border-b border-[#424753]/20">
                        <th className="px-6 py-4 uppercase tracking-widest">Challenge</th>
                        <th className="px-6 py-4 uppercase tracking-widest">Family</th>
                        <th className="px-6 py-4 uppercase tracking-widest">CDI</th>
                        <th className="px-6 py-4 uppercase tracking-widest">Recommended</th>
                        <th className="px-6 py-4 uppercase tracking-widest">Advisory</th>
                        <th className="px-6 py-4 uppercase tracking-widest">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#424753]/10">
                      {inventoryItems.map(item => (
                        <tr key={item.id} className="hover:bg-[#201f1f] transition-colors">
                          <td className="px-6 py-4 text-[#e5e2e1] font-bold">{item.challenges?.title ?? '—'}</td>
                          <td className="px-6 py-4 text-[#c2c6d5]">{item.challenges?.category ?? '—'}</td>
                          <td className="px-6 py-4">
                            {item.challenges?.cdi_score != null
                              ? <span className="text-[#adc6ff] font-bold">{item.challenges.cdi_score.toFixed(1)}</span>
                              : <span className="text-[#8c909f]">—</span>}
                          </td>
                          <td className="px-6 py-4">
                            {item.recommended_decision
                              ? <StatusBadge status={item.recommended_decision} />
                              : <span className="text-[#8c909f]">—</span>}
                          </td>
                          <td className="px-6 py-4 text-[#8c909f] max-w-[200px] truncate" title={item.advisory_rationale ?? ''}>
                            {item.advisory_rationale ?? '—'}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1">
                              {([
                                { action: 'publish_now',    label: 'Activate', color: 'text-[#7dffa2]', bg: 'bg-[#7dffa2]/10 hover:bg-[#7dffa2]/20' },
                                { action: 'hold_reserve',   label: 'Hold in Reserve', color: 'text-[#adc6ff]', bg: 'bg-[#adc6ff]/10 hover:bg-[#adc6ff]/20' },
                                { action: 'queue_for_later',label: 'Queue', color: 'text-[#c2c6d5]', bg: 'bg-[#201f1f] hover:bg-[#2a2a2a]' },
                                { action: 'quarantine',     label: 'Quarantine', color: 'text-[#ffb780]', bg: 'bg-[#ffb780]/10 hover:bg-[#ffb780]/20' },
                              ] as const).map(({ action, label, color, bg }) => (
                                <button
                                  key={action}
                                  disabled={inventoryActionLoading === item.challenge_id}
                                  onClick={() => handleInventoryAction(item.challenge_id, action)}
                                  className={`px-2 py-1 ${bg} ${color} rounded text-[9px] font-bold transition-colors disabled:opacity-50 uppercase tracking-wider`}
                                  title={action}
                                >
                                  {inventoryActionLoading === item.challenge_id ? <Loader2 className="w-3 h-3 animate-spin" /> : label}
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── CHALLENGE HEALTH TAB ── */}
          {activeTab === 'Challenge Health' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-[#e5e2e1] font-['Manrope']">Challenge Health</h2>

              {healthSummary && (
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Healthy', value: healthSummary.healthy, emoji: '🟢', color: 'border-[#7dffa2]/30' },
                    { label: 'Warning', value: healthSummary.warning, emoji: '🟡', color: 'border-[#ffb780]/30' },
                    { label: 'Critical', value: healthSummary.critical, emoji: '🔴', color: 'border-[#ffb4ab]/30' },
                  ].map(s => (
                    <div key={s.label} className={`bg-[#1c1b1b] p-5 rounded-xl text-center border ${s.color}`}>
                      <div className="text-3xl font-black text-[#e5e2e1]">{s.value}</div>
                      <div className="text-[10px] font-['JetBrains_Mono'] text-[#c2c6d5] uppercase tracking-widest mt-1">{s.emoji} {s.label}</div>
                    </div>
                  ))}
                </div>
              )}

              {healthLoading ? (
                <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#adc6ff]" /></div>
              ) : healthItems.length === 0 ? (
                <div className="bg-[#1c1b1b] p-12 rounded-xl text-center">
                  <Activity className="w-12 h-12 text-[#424753] mx-auto mb-4" />
                  <p className="text-[#c2c6d5] text-sm font-['JetBrains_Mono'] uppercase tracking-widest">No active challenges to monitor</p>
                </div>
              ) : (
                <div className="bg-[#1c1b1b] rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs font-['JetBrains_Mono']">
                    <thead>
                      <tr className="text-[#c2c6d5] border-b border-[#424753]/20">
                        <th className="px-6 py-4 uppercase tracking-widest">Challenge</th>
                        <th className="px-6 py-4 uppercase tracking-widest">Health</th>
                        <th className="px-6 py-4 uppercase tracking-widest" title="Sandbox/web workspace submission path (separate from Remote Agent Invocation)">Web Workspace</th>
                        <th className="px-6 py-4 uppercase tracking-widest" title="Remote Agent Invocation — Bouts calls the agent's registered HTTPS endpoint">Remote Invoke</th>
                        <th className="px-6 py-4 uppercase tracking-widest">Solve Rate</th>
                        <th className="px-6 py-4 uppercase tracking-widest">Score Spread</th>
                        <th className="px-6 py-4 uppercase tracking-widest">Dispute Rate</th>
                        <th className="px-6 py-4 uppercase tracking-widest">Exploit Rate</th>
                        <th className="px-6 py-4 uppercase tracking-widest">CDI</th>
                        <th className="px-6 py-4 uppercase tracking-widest">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#424753]/10">
                      {healthItems.map(item => (
                        <tr key={item.id} className="hover:bg-[#201f1f] transition-colors">
                          <td className="px-6 py-4 text-[#e5e2e1] font-bold">{item.title}</td>
                          <td className="px-6 py-4">
                            {item.health_signal === 'critical' && <span className="text-[#ffb4ab] font-bold">🔴 Critical</span>}
                            {item.health_signal === 'warning' && <span className="text-[#ffb780] font-bold">🟡 Warning</span>}
                            {item.health_signal === 'healthy' && <span className="text-[#7dffa2] font-bold">🟢 Healthy</span>}
                          </td>
                          <td className="px-6 py-4">
                            <button
                              disabled={healthActionLoading === `${item.id}-web`}
                              onClick={() => handleWebSubmissionToggle(item.id, item.web_submission_supported)}
                              title={item.web_submission_supported ? 'Web workspace enabled — click to disable (does NOT affect Remote Agent Invocation)' : 'Web workspace disabled — click to enable sandbox/manual web path (does NOT affect Remote Agent Invocation)'}
                              className={`px-3 py-1.5 rounded text-[10px] font-bold transition-colors disabled:opacity-50 ${
                                item.web_submission_supported
                                  ? 'bg-[#7dffa2]/10 text-[#7dffa2] hover:bg-[#7dffa2]/20'
                                  : 'bg-[#424753]/20 text-[#8c909f] hover:bg-[#424753]/40'
                              }`}
                            >
                              {healthActionLoading === `${item.id}-web`
                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                : item.web_submission_supported ? '✓ Enabled' : '— Off'}
                            </button>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              disabled={healthActionLoading === `${item.id}-ri`}
                              onClick={() => handleRIToggle(item.id, item.remote_invocation_supported ?? false)}
                              title={(item.remote_invocation_supported ?? false) ? 'Remote Invocation enabled — click to disable' : 'Remote Invocation disabled — click to enable (requires registered endpoint)'}
                              className={`px-3 py-1.5 rounded text-[10px] font-bold transition-colors disabled:opacity-50 ${
                                (item.remote_invocation_supported ?? false)
                                  ? 'bg-[#adc6ff]/10 text-[#adc6ff] hover:bg-[#adc6ff]/20'
                                  : 'bg-[#424753]/20 text-[#8c909f] hover:bg-[#424753]/40'
                              }`}
                            >
                              {healthActionLoading === `${item.id}-ri`
                                ? <span className="inline-block w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                                : (item.remote_invocation_supported ?? false) ? '✓ Enabled' : '— Off'}
                            </button>
                          </td>
                          <td className="px-6 py-4 text-[#c2c6d5]">
                            {item.solve_rate != null ? `${item.solve_rate.toFixed(1)}%` : '—'}
                          </td>
                          <td className="px-6 py-4 text-[#c2c6d5]">
                            {item.score_stddev != null ? item.score_stddev.toFixed(2) : '—'}
                          </td>
                          <td className="px-6 py-4 text-[#c2c6d5]">
                            {item.dispute_rate != null ? `${item.dispute_rate.toFixed(1)}%` : '—'}
                          </td>
                          <td className="px-6 py-4 text-[#c2c6d5]">
                            {item.exploit_rate != null ? `${item.exploit_rate.toFixed(1)}%` : '—'}
                          </td>
                          <td className="px-6 py-4">
                            {item.cdi_score != null
                              ? <span className={item.cdi_score >= 60 ? 'text-[#7dffa2] font-bold' : 'text-[#ffb4ab] font-bold'}>{item.cdi_score.toFixed(1)}</span>
                              : <span className="text-[#8c909f]">—</span>}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                disabled={healthActionLoading === `${item.id}-quarantine`}
                                onClick={() => handleHealthAction(item.id, 'quarantine')}
                                className="px-3 py-1.5 bg-[#ffb780]/10 text-[#ffb780] rounded text-[10px] font-bold hover:bg-[#ffb780]/20 transition-colors disabled:opacity-50"
                              >
                                {healthActionLoading === `${item.id}-quarantine` ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Quarantine'}
                              </button>
                              <button
                                disabled={healthActionLoading === `${item.id}-retire`}
                                onClick={() => handleHealthAction(item.id, 'retire')}
                                className="px-3 py-1.5 bg-[#ffb4ab]/10 text-[#ffb4ab] rounded text-[10px] font-bold hover:bg-[#ffb4ab]/20 transition-colors disabled:opacity-50"
                              >
                                {healthActionLoading === `${item.id}-retire` ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Retire'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── JOBS QUEUE TAB ── */}
          {activeTab === 'Jobs Queue' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-[#e5e2e1] font-['Manrope']">Jobs Queue</h2>
              <div className="bg-[#1c1b1b] p-8 rounded-xl text-center">
                <Terminal className="w-12 h-12 text-[#424753] mx-auto mb-4" />
                <p className="text-[#c2c6d5] text-sm font-['JetBrains_Mono'] uppercase tracking-widest">Jobs Queue Management</p>
                <p className="text-[#8c909f] text-xs mt-2 font-['JetBrains_Mono']">Real-time job monitoring — see status bar above for live queue stats</p>
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
                      { name: 'Compute Cluster A', bars: [true, true, true, false] as (boolean | string)[] },
                      { name: 'Storage Backend', bars: [true, true, true, true] as (boolean | string)[] },
                      { name: 'Identity Provider', bars: [true, 'error', false, false] as (boolean | string)[] },
                      { name: 'API Gateway', bars: [true, true, true, true] as (boolean | string)[] },
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

          {/* ── DEVELOPER METRICS TAB ── */}
          {activeTab === 'Developer Metrics' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-[#e5e2e1] font-['Manrope']">Developer Metrics</h2>

              {devMetricsLoading ? (
                <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#adc6ff]" /></div>
              ) : !devMetrics ? (
                <div className="bg-[#1c1b1b] p-12 rounded-xl text-center">
                  <Key className="w-12 h-12 text-[#424753] mx-auto mb-4" />
                  <p className="text-[#c2c6d5] text-sm font-['JetBrains_Mono'] uppercase tracking-widest">No metrics available</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-[#1c1b1b] p-5 rounded-xl">
                      <div className="text-[10px] font-['JetBrains_Mono'] text-[#c2c6d5] uppercase tracking-widest mb-1">Production Tokens</div>
                      <div className="text-3xl font-black text-[#adc6ff]">{devMetrics.token_env_split.production}</div>
                    </div>
                    <div className="bg-[#1c1b1b] p-5 rounded-xl">
                      <div className="text-[10px] font-['JetBrains_Mono'] text-[#c2c6d5] uppercase tracking-widest mb-1">Sandbox Tokens</div>
                      <div className="text-3xl font-black text-[#ffb780]">{devMetrics.token_env_split.sandbox}</div>
                    </div>
                    <div className="bg-[#1c1b1b] p-5 rounded-xl">
                      <div className="text-[10px] font-['JetBrains_Mono'] text-[#c2c6d5] uppercase tracking-widest mb-1">Active Webhooks</div>
                      <div className="text-3xl font-black text-[#7dffa2]">{devMetrics.webhook_stats.active}</div>
                    </div>
                    <div className={`bg-[#1c1b1b] p-5 rounded-xl ${devMetrics.webhook_stats.failing > 0 ? 'border border-[#ffb4ab]/30' : ''}`}>
                      <div className="text-[10px] font-['JetBrains_Mono'] text-[#c2c6d5] uppercase tracking-widest mb-1">Failing Webhooks</div>
                      <div className={`text-3xl font-black ${devMetrics.webhook_stats.failing > 0 ? 'text-[#ffb4ab]' : 'text-[#7dffa2]'}`}>
                        {devMetrics.webhook_stats.failing}
                      </div>
                    </div>
                  </div>

                  {/* Webhook Health Stats */}
                  <div className="bg-[#1c1b1b] p-6 rounded-xl">
                    <h3 className="text-lg font-bold text-[#e5e2e1] mb-4 font-['Manrope']">Webhook Health</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm font-['JetBrains_Mono']">
                      <div>
                        <div className="text-[#8c909f] text-[10px] uppercase tracking-widest mb-1">Total</div>
                        <div className="text-[#e5e2e1] font-bold">{devMetrics.webhook_stats.total}</div>
                      </div>
                      <div>
                        <div className="text-[#8c909f] text-[10px] uppercase tracking-widest mb-1">Active</div>
                        <div className="text-[#7dffa2] font-bold">{devMetrics.webhook_stats.active}</div>
                      </div>
                      <div>
                        <div className="text-[#8c909f] text-[10px] uppercase tracking-widest mb-1">Disabled</div>
                        <div className="text-[#ffb4ab] font-bold">{devMetrics.webhook_stats.disabled}</div>
                      </div>
                      <div>
                        <div className="text-[#8c909f] text-[10px] uppercase tracking-widest mb-1">Failure Rate</div>
                        <div className={`font-bold ${devMetrics.webhook_stats.failure_rate > 20 ? 'text-[#ffb4ab]' : 'text-[#7dffa2]'}`}>
                          {devMetrics.webhook_stats.failure_rate}%
                        </div>
                      </div>
                    </div>
                    {devMetrics.recent_failures_24h > 0 && (
                      <div className="mt-4 px-4 py-3 bg-[#ffb4ab]/10 border border-[#ffb4ab]/20 rounded-lg">
                        <span className="text-[#ffb4ab] text-sm font-['JetBrains_Mono']">
                          ⚠ {devMetrics.recent_failures_24h} webhook delivery failure{devMetrics.recent_failures_24h !== 1 ? 's' : ''} in last 24h
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Token Creation Timeline */}
                  <div className="bg-[#1c1b1b] p-6 rounded-xl">
                    <h3 className="text-lg font-bold text-[#e5e2e1] mb-4 font-['Manrope']">Token Creation — Last 30 Days</h3>
                    {devMetrics.token_creation_by_day.length === 0 ? (
                      <p className="text-[#8c909f] text-sm font-['JetBrains_Mono']">No tokens created in last 30 days</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs font-['JetBrains_Mono']">
                          <thead>
                            <tr className="text-[#c2c6d5] border-b border-[#424753]/20">
                              <th className="py-2 pr-6 text-left uppercase tracking-widest">Date</th>
                              <th className="py-2 pr-6 text-right uppercase tracking-widest text-[#adc6ff]">Production</th>
                              <th className="py-2 pr-6 text-right uppercase tracking-widest text-[#ffb780]">Sandbox</th>
                              <th className="py-2 text-right uppercase tracking-widest">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#424753]/10">
                            {devMetrics.token_creation_by_day.slice(-14).reverse().map(row => (
                              <tr key={row.day} className="hover:bg-[#201f1f]">
                                <td className="py-2 pr-6 text-[#e5e2e1]">{row.day}</td>
                                <td className="py-2 pr-6 text-right text-[#adc6ff]">{row.production}</td>
                                <td className="py-2 pr-6 text-right text-[#ffb780]">{row.sandbox}</td>
                                <td className="py-2 text-right text-[#e5e2e1] font-bold">{row.total}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── ANALYTICS TAB ── */}
          {activeTab === 'Analytics' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-[#e5e2e1] font-['Manrope']">Adoption Analytics</h2>
                <button
                  onClick={fetchAnalytics}
                  className="text-xs font-['JetBrains_Mono'] text-[#adc6ff] hover:text-[#e5e2e1] transition-colors uppercase tracking-widest"
                >
                  Refresh
                </button>
              </div>

              {analyticsLoading ? (
                <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#adc6ff]" /></div>
              ) : (!analyticsData && !analyticsFunnel && !analyticsAccessModes) ? (
                <div className="bg-[#1c1b1b] p-12 rounded-xl text-center">
                  <TrendingUp className="w-12 h-12 text-[#424753] mx-auto mb-4" />
                  <p className="text-[#c2c6d5] text-sm font-['JetBrains_Mono'] uppercase tracking-widest">No data yet. Events will appear as the platform is used.</p>
                </div>
              ) : (
                <div className="space-y-6">

                  {/* Access Mode Breakdown */}
                  {analyticsAccessModes && (
                    <div className="bg-[#1c1b1b] p-6 rounded-xl">
                      <h3 className="text-lg font-bold text-[#e5e2e1] mb-4 font-['Manrope']">Access Mode Breakdown</h3>
                      {analyticsAccessModes.by_mode.length === 0 ? (
                        <p className="text-[#8c909f] text-sm font-['JetBrains_Mono']">No events yet.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs font-['JetBrains_Mono']">
                            <thead>
                              <tr className="text-[#c2c6d5] border-b border-[#424753]/20">
                                <th className="py-2 pr-6 text-left uppercase tracking-widest">Mode</th>
                                <th className="py-2 pr-6 text-right uppercase tracking-widest">Events</th>
                                <th className="py-2 pr-6 text-right uppercase tracking-widest text-[#7dffa2]">Success</th>
                                <th className="py-2 pr-6 text-right uppercase tracking-widest text-[#ffb4ab]">Failures</th>
                                <th className="py-2 text-right uppercase tracking-widest">Failure %</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#424753]/10">
                              {analyticsAccessModes.by_mode.map(row => (
                                <tr key={row.mode} className="hover:bg-[#201f1f]">
                                  <td className="py-2 pr-6 text-[#adc6ff] font-bold">{row.mode}</td>
                                  <td className="py-2 pr-6 text-right text-[#e5e2e1]">{row.total}</td>
                                  <td className="py-2 pr-6 text-right text-[#7dffa2]">{row.success}</td>
                                  <td className="py-2 pr-6 text-right text-[#ffb4ab]">{row.failures}</td>
                                  <td className={`py-2 text-right font-bold ${row.failure_rate > 20 ? 'text-[#ffb4ab]' : 'text-[#7dffa2]'}`}>
                                    {row.failure_rate}%
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Onboarding Funnel */}
                  {analyticsFunnel && (
                    <div className="bg-[#1c1b1b] p-6 rounded-xl">
                      <h3 className="text-lg font-bold text-[#e5e2e1] mb-4 font-['Manrope']">Onboarding Funnel</h3>
                      {analyticsFunnel.every(s => s.distinct_users === 0) ? (
                        <p className="text-[#8c909f] text-sm font-['JetBrains_Mono']">No funnel events yet. Events will appear as developers explore the platform.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs font-['JetBrains_Mono']">
                            <thead>
                              <tr className="text-[#c2c6d5] border-b border-[#424753]/20">
                                <th className="py-2 pr-4 text-left uppercase tracking-widest">#</th>
                                <th className="py-2 pr-6 text-left uppercase tracking-widest">Stage</th>
                                <th className="py-2 pr-6 text-right uppercase tracking-widest">Users</th>
                                <th className="py-2 pr-6 text-right uppercase tracking-widest">Events</th>
                                <th className="py-2 pr-6 text-right uppercase tracking-widest">Retention</th>
                                <th className="py-2 text-right uppercase tracking-widest">Drop-off</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#424753]/10">
                              {analyticsFunnel.map(row => (
                                <tr key={row.stage} className="hover:bg-[#201f1f]">
                                  <td className="py-2 pr-4 text-[#8c909f]">{row.stage}</td>
                                  <td className="py-2 pr-6 text-[#e5e2e1] font-bold">{row.label}</td>
                                  <td className="py-2 pr-6 text-right text-[#adc6ff]">{row.distinct_users}</td>
                                  <td className="py-2 pr-6 text-right text-[#c2c6d5]">{row.total_events}</td>
                                  <td className="py-2 pr-6 text-right">
                                    {row.retention_from_prev !== null ? (
                                      <span className={row.retention_from_prev >= 50 ? 'text-[#7dffa2]' : row.retention_from_prev >= 25 ? 'text-[#ffb780]' : 'text-[#ffb4ab]'}>
                                        {row.retention_from_prev}%
                                      </span>
                                    ) : <span className="text-[#8c909f]">—</span>}
                                  </td>
                                  <td className="py-2 text-right">
                                    {row.drop_off_pct !== null ? (
                                      <span className={row.drop_off_pct > 75 ? 'text-[#ffb4ab] font-bold' : 'text-[#c2c6d5]'}>
                                        -{row.drop_off_pct}%
                                      </span>
                                    ) : <span className="text-[#8c909f]">—</span>}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {analyticsData && (
                    <>
                      {/* Env Split + Friction side by side */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Sandbox vs Production Split */}
                        <div className="bg-[#1c1b1b] p-6 rounded-xl">
                          <h3 className="text-lg font-bold text-[#e5e2e1] mb-4 font-['Manrope']">Environment Split</h3>
                          {analyticsData.environment_split.length === 0 ? (
                            <p className="text-[#8c909f] text-sm font-['JetBrains_Mono']">No data yet.</p>
                          ) : (
                            <div className="space-y-3">
                              {analyticsData.environment_split.map(row => {
                                const total = analyticsData.environment_split.reduce((s, r) => s + r.count, 0)
                                const pct = total > 0 ? Math.round((row.count / total) * 100) : 0
                                return (
                                  <div key={row.environment}>
                                    <div className="flex justify-between text-xs font-['JetBrains_Mono'] mb-1">
                                      <span className="text-[#c2c6d5] uppercase tracking-widest">{row.environment}</span>
                                      <span className="text-[#e5e2e1] font-bold">{row.count} <span className="text-[#8c909f]">({pct}%)</span></span>
                                    </div>
                                    <div className="h-2 w-full bg-[#353534] rounded-full overflow-hidden">
                                      <div
                                        className={`h-full rounded-full ${row.environment === 'sandbox' ? 'bg-[#ffb780]' : 'bg-[#adc6ff]'}`}
                                        style={{ width: `${pct}%` }}
                                      />
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>

                        {/* Friction Hotspots */}
                        <div className="bg-[#1c1b1b] p-6 rounded-xl">
                          <h3 className="text-lg font-bold text-[#e5e2e1] mb-4 font-['Manrope']">Friction Hotspots</h3>
                          {analyticsData.friction_hotspots.length === 0 ? (
                            <p className="text-[#8c909f] text-sm font-['JetBrains_Mono']">No errors recorded. 🎉</p>
                          ) : (
                            <div className="space-y-2">
                              {analyticsData.friction_hotspots.slice(0, 8).map(row => (
                                <div key={row.error_code} className="flex justify-between items-center text-xs font-['JetBrains_Mono']">
                                  <span className="text-[#ffb4ab] uppercase tracking-widest">{row.error_code}</span>
                                  <span className="text-[#e5e2e1] font-bold bg-[#ffb4ab]/10 px-2 py-0.5 rounded">{row.count}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Recent Error Feed */}
                      <div className="bg-[#1c1b1b] p-6 rounded-xl">
                        <h3 className="text-lg font-bold text-[#e5e2e1] mb-4 font-['Manrope']">Recent Errors</h3>
                        {analyticsData.recent_errors.length === 0 ? (
                          <p className="text-[#8c909f] text-sm font-['JetBrains_Mono']">No errors in the last 30 days.</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs font-['JetBrains_Mono']">
                              <thead>
                                <tr className="text-[#c2c6d5] border-b border-[#424753]/20">
                                  <th className="py-2 pr-6 text-left uppercase tracking-widest">Event</th>
                                  <th className="py-2 pr-6 text-left uppercase tracking-widest">Error</th>
                                  <th className="py-2 pr-6 text-left uppercase tracking-widest">Mode</th>
                                  <th className="py-2 text-right uppercase tracking-widest">Time</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#424753]/10">
                                {analyticsData.recent_errors.slice(0, 20).map(row => (
                                  <tr key={row.id} className="hover:bg-[#201f1f]">
                                    <td className="py-2 pr-6 text-[#e5e2e1]">{row.event_type}</td>
                                    <td className="py-2 pr-6 text-[#ffb4ab] font-bold">{row.error_code ?? '—'}</td>
                                    <td className="py-2 pr-6 text-[#c2c6d5]">{row.access_mode ?? '—'}</td>
                                    <td className="py-2 text-right text-[#8c909f]">
                                      {new Date(row.created_at).toLocaleString()}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── TAGS TAB ── */}
          {activeTab === 'Tags' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-[#e5e2e1] font-['Manrope'] flex items-center gap-3">
                  Tag Moderation
                  {tagPendingCount > 0 && (
                    <span className="bg-[#ffb780] text-[#1a0e00] text-xs font-bold rounded-full px-2 py-0.5">
                      {tagPendingCount} pending
                    </span>
                  )}
                </h2>
                <button
                  onClick={() => { fetchTagQueue(); fetchCanonicalTags() }}
                  className="text-xs font-['JetBrains_Mono'] text-[#adc6ff] hover:text-[#e5e2e1] transition-colors uppercase tracking-widest"
                >
                  Refresh
                </button>
              </div>

              {/* Moderation Queue */}
              <div className="bg-[#1c1b1b] rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-[#424753]/20">
                  <h3 className="text-base font-bold text-[#e5e2e1] font-['Manrope']">Moderation Queue</h3>
                </div>
                {tagQueueLoading ? (
                  <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#adc6ff]" /></div>
                ) : tagQueue.length === 0 ? (
                  <div className="p-8 text-center">
                    <Tag className="w-10 h-10 text-[#424753] mx-auto mb-3" />
                    <p className="text-[#c2c6d5] text-sm font-['JetBrains_Mono'] uppercase tracking-widest">No tags in queue</p>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs font-['JetBrains_Mono']">
                    <thead>
                      <tr className="text-[#c2c6d5] border-b border-[#424753]/20">
                        <th className="px-6 py-4 uppercase tracking-widest">Tag</th>
                        <th className="px-6 py-4 uppercase tracking-widest">Category</th>
                        <th className="px-6 py-4 uppercase tracking-widest">Count</th>
                        <th className="px-6 py-4 uppercase tracking-widest">Status</th>
                        <th className="px-6 py-4 uppercase tracking-widest">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#424753]/10">
                      {tagQueue.map(tag => (
                        <tr key={tag.id} className="hover:bg-[#201f1f] transition-colors">
                          <td className="px-6 py-4 text-[#e5e2e1] font-bold">{tag.tag}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${tag.category === 'capability' ? 'bg-[#adc6ff]/15 text-[#adc6ff]' : 'bg-[#7dffa2]/15 text-[#7dffa2]'}`}>
                              {tag.category}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-[#c2c6d5] font-bold">{tag.submitted_count}</td>
                          <td className="px-6 py-4"><StatusBadge status={tag.status} /></td>
                          <td className="px-6 py-4">
                            {tag.status === 'pending' ? (
                              <div className="flex items-center gap-2 flex-wrap">
                                <button
                                  disabled={tagActionLoading === tag.id}
                                  onClick={() => handleTagAction(tag.id, 'approve')}
                                  className="px-3 py-1.5 bg-[#7dffa2]/10 text-[#7dffa2] rounded text-[10px] font-bold hover:bg-[#7dffa2]/20 transition-colors disabled:opacity-50"
                                >
                                  {tagActionLoading === tag.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Approve'}
                                </button>
                                <button
                                  disabled={tagActionLoading === tag.id}
                                  onClick={() => handleTagAction(tag.id, 'reject')}
                                  className="px-3 py-1.5 bg-[#ffb4ab]/10 text-[#ffb4ab] rounded text-[10px] font-bold hover:bg-[#ffb4ab]/20 transition-colors disabled:opacity-50"
                                >
                                  Reject
                                </button>
                                <div className="flex items-center gap-1">
                                  <input
                                    value={mergeInput[tag.id] ?? ''}
                                    onChange={e => setMergeInput(prev => ({ ...prev, [tag.id]: e.target.value }))}
                                    placeholder="Merge into..."
                                    className="bg-[#0e0e0e] text-[#e5e2e1] px-2 py-1 rounded text-[10px] w-28 outline-none focus:ring-1 focus:ring-[#adc6ff]/30"
                                  />
                                  <button
                                    disabled={tagActionLoading === tag.id || !mergeInput[tag.id]?.trim()}
                                    onClick={() => handleTagAction(tag.id, 'merge', mergeInput[tag.id])}
                                    className="px-2 py-1.5 bg-[#ffb780]/10 text-[#ffb780] rounded text-[10px] font-bold hover:bg-[#ffb780]/20 transition-colors disabled:opacity-50"
                                  >
                                    Merge
                                  </button>
                                </div>
                                <button
                                  disabled={tagActionLoading === tag.id}
                                  onClick={() => handleDeleteTag(tag.id)}
                                  className="px-3 py-1.5 bg-[#424753]/20 text-[#8c909f] rounded text-[10px] font-bold hover:bg-[#424753]/40 transition-colors disabled:opacity-50"
                                >
                                  Delete
                                </button>
                              </div>
                            ) : (
                              <span className="text-[#8c909f]">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Canonical Tags List */}
              <div className="bg-[#1c1b1b] rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-[#424753]/20 flex items-center justify-between">
                  <h3 className="text-base font-bold text-[#e5e2e1] font-['Manrope']">Canonical Tags</h3>
                  <input
                    value={canonicalSearch}
                    onChange={e => { setCanonicalSearch(e.target.value); fetchCanonicalTags(e.target.value) }}
                    placeholder="Search tags..."
                    className="bg-[#0e0e0e] text-[#e5e2e1] px-3 py-1.5 rounded text-xs w-48 outline-none focus:ring-1 focus:ring-[#adc6ff]/30 font-['JetBrains_Mono']"
                  />
                </div>
                {canonicalTagsLoading ? (
                  <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#adc6ff]" /></div>
                ) : canonicalTags.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-[#c2c6d5] text-sm font-['JetBrains_Mono']">No canonical tags yet. Approve tags from the queue above to populate.</p>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs font-['JetBrains_Mono']">
                    <thead>
                      <tr className="text-[#c2c6d5] border-b border-[#424753]/20">
                        <th className="px-6 py-4 uppercase tracking-widest">Tag</th>
                        <th className="px-6 py-4 uppercase tracking-widest">Category</th>
                        <th className="px-6 py-4 uppercase tracking-widest">Status</th>
                        <th className="px-6 py-4 uppercase tracking-widest">Aliases</th>
                        <th className="px-6 py-4 uppercase tracking-widest">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#424753]/10">
                      {canonicalTags.map(ct => (
                        <tr key={ct.id} className="hover:bg-[#201f1f] transition-colors">
                          <td className="px-6 py-4 text-[#e5e2e1] font-bold">{ct.tag}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${ct.category === 'capability' ? 'bg-[#adc6ff]/15 text-[#adc6ff]' : 'bg-[#7dffa2]/15 text-[#7dffa2]'}`}>
                              {ct.category}
                            </span>
                          </td>
                          <td className="px-6 py-4"><StatusBadge status={ct.status} /></td>
                          <td className="px-6 py-4 text-[#8c909f]">{ct.aliases?.join(', ') || '—'}</td>
                          <td className="px-6 py-4 text-[#c2c6d5] max-w-[200px] truncate" title={ct.description ?? ''}>{ct.description || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* ── RETENTION TAB ── */}
          {activeTab === 'Retention' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-[#e5e2e1] font-['Manrope']">Retention Analytics</h2>
                <div className="flex items-center gap-3">
                  {([30, 60, 90] as const).map(d => (
                    <button
                      key={d}
                      onClick={() => { setRetentionDays(d); fetchRetention(d) }}
                      className={`px-3 py-1.5 rounded text-xs font-['JetBrains_Mono'] font-bold transition-colors ${retentionDays === d ? 'bg-[#adc6ff]/20 text-[#adc6ff]' : 'bg-[#201f1f] text-[#c2c6d5] hover:bg-[#2a2a2a]'}`}
                    >
                      {d}d
                    </button>
                  ))}
                </div>
              </div>

              {retentionLoading ? (
                <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#adc6ff]" /></div>
              ) : !retentionData ? (
                <div className="bg-[#1c1b1b] p-12 rounded-xl text-center">
                  <Users className="w-12 h-12 text-[#424753] mx-auto mb-4" />
                  <p className="text-[#c2c6d5] text-sm font-['JetBrains_Mono'] uppercase tracking-widest">Not enough data yet</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Sandbox → Production Funnel */}
                  <div className="bg-[#1c1b1b] p-6 rounded-xl">
                    <h3 className="text-base font-bold text-[#e5e2e1] font-['Manrope'] mb-4 flex items-center gap-2">
                      Sandbox → Production Conversion
                    </h3>
                    {retentionData.sandbox_to_production_conversion.users_with_sandbox_only === 0 && retentionData.sandbox_to_production_conversion.users_converted_to_production === 0 ? (
                      <p className="text-[#8c909f] text-sm font-['JetBrains_Mono']">Not enough data yet.</p>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-[#201f1f] p-4 rounded-lg">
                          <div className="text-[10px] font-['JetBrains_Mono'] text-[#8c909f] uppercase tracking-widest mb-1">Sandbox Only</div>
                          <div className="text-3xl font-black text-[#ffb780]">{retentionData.sandbox_to_production_conversion.users_with_sandbox_only}</div>
                        </div>
                        <div className="bg-[#201f1f] p-4 rounded-lg">
                          <div className="text-[10px] font-['JetBrains_Mono'] text-[#8c909f] uppercase tracking-widest mb-1">Converted to Prod</div>
                          <div className="text-3xl font-black text-[#7dffa2]">{retentionData.sandbox_to_production_conversion.users_converted_to_production}</div>
                        </div>
                        <div className="bg-[#201f1f] p-4 rounded-lg">
                          <div className="text-[10px] font-['JetBrains_Mono'] text-[#8c909f] uppercase tracking-widest mb-1">Conversion Rate</div>
                          <div className="text-3xl font-black text-[#adc6ff]">{retentionData.sandbox_to_production_conversion.conversion_rate_pct}%</div>
                        </div>
                        <div className="bg-[#201f1f] p-4 rounded-lg">
                          <div className="text-[10px] font-['JetBrains_Mono'] text-[#8c909f] uppercase tracking-widest mb-1">Median Days</div>
                          <div className="text-3xl font-black text-[#c2c6d5]">{retentionData.sandbox_to_production_conversion.median_days_to_convert}</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* First → Second Submission */}
                  <div className="bg-[#1c1b1b] p-6 rounded-xl">
                    <h3 className="text-base font-bold text-[#e5e2e1] font-['Manrope'] mb-4">First → Second Submission</h3>
                    {retentionData.first_to_second_submission.agents_with_one_submission === 0 && retentionData.first_to_second_submission.agents_with_two_plus === 0 ? (
                      <p className="text-[#8c909f] text-sm font-['JetBrains_Mono']">Not enough data yet.</p>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-[#201f1f] p-4 rounded-lg">
                          <div className="text-[10px] font-['JetBrains_Mono'] text-[#8c909f] uppercase tracking-widest mb-1">One Submission</div>
                          <div className="text-3xl font-black text-[#ffb780]">{retentionData.first_to_second_submission.agents_with_one_submission}</div>
                        </div>
                        <div className="bg-[#201f1f] p-4 rounded-lg">
                          <div className="text-[10px] font-['JetBrains_Mono'] text-[#8c909f] uppercase tracking-widest mb-1">Two or More</div>
                          <div className="text-3xl font-black text-[#7dffa2]">{retentionData.first_to_second_submission.agents_with_two_plus}</div>
                        </div>
                        <div className="bg-[#201f1f] p-4 rounded-lg">
                          <div className="text-[10px] font-['JetBrains_Mono'] text-[#8c909f] uppercase tracking-widest mb-1">Repeat Rate</div>
                          <div className="text-3xl font-black text-[#adc6ff]">{retentionData.first_to_second_submission.conversion_rate_pct}%</div>
                        </div>
                        <div className="bg-[#201f1f] p-4 rounded-lg">
                          <div className="text-[10px] font-['JetBrains_Mono'] text-[#8c909f] uppercase tracking-widest mb-1">Median Days</div>
                          <div className="text-3xl font-black text-[#c2c6d5]">{retentionData.first_to_second_submission.median_days_to_second}</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Repeat Usage by Access Mode */}
                  <div className="bg-[#1c1b1b] p-6 rounded-xl">
                    <h3 className="text-base font-bold text-[#e5e2e1] font-['Manrope'] mb-4">Repeat Usage by Access Mode</h3>
                    {Object.keys(retentionData.repeat_usage_by_access_mode).length === 0 ? (
                      <p className="text-[#8c909f] text-sm font-['JetBrains_Mono']">Not enough data yet.</p>
                    ) : (
                      <table className="w-full text-xs font-['JetBrains_Mono']">
                        <thead>
                          <tr className="text-[#c2c6d5] border-b border-[#424753]/20">
                            <th className="py-2 pr-6 text-left uppercase tracking-widest">Mode</th>
                            <th className="py-2 pr-6 text-right uppercase tracking-widest">Total Users</th>
                            <th className="py-2 pr-6 text-right uppercase tracking-widest">Repeat Users</th>
                            <th className="py-2 text-right uppercase tracking-widest">Repeat Rate</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#424753]/10">
                          {Object.entries(retentionData.repeat_usage_by_access_mode).map(([mode, stats]) => (
                            <tr key={mode} className="hover:bg-[#201f1f]">
                              <td className="py-3 pr-6 text-[#adc6ff] font-bold">{mode}</td>
                              <td className="py-3 pr-6 text-right text-[#e5e2e1]">{stats.total_users}</td>
                              <td className="py-3 pr-6 text-right text-[#7dffa2]">{stats.repeat_users}</td>
                              <td className={`py-3 text-right font-bold ${stats.repeat_rate_pct >= 50 ? 'text-[#7dffa2]' : stats.repeat_rate_pct >= 25 ? 'text-[#ffb780]' : 'text-[#ffb4ab]'}`}>
                                {stats.repeat_rate_pct}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Webhook + Token Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-[#1c1b1b] p-6 rounded-xl">
                      <h3 className="text-base font-bold text-[#e5e2e1] font-['Manrope'] mb-4">Webhook Retention</h3>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <div className="text-[10px] font-['JetBrains_Mono'] text-[#8c909f] uppercase tracking-widest mb-1">Created</div>
                          <div className="text-2xl font-black text-[#c2c6d5]">{retentionData.webhook_subscription_retention.created_30d}</div>
                        </div>
                        <div>
                          <div className="text-[10px] font-['JetBrains_Mono'] text-[#8c909f] uppercase tracking-widest mb-1">Still Active</div>
                          <div className="text-2xl font-black text-[#7dffa2]">{retentionData.webhook_subscription_retention.still_active}</div>
                        </div>
                        <div>
                          <div className="text-[10px] font-['JetBrains_Mono'] text-[#8c909f] uppercase tracking-widest mb-1">Retention</div>
                          <div className={`text-2xl font-black ${retentionData.webhook_subscription_retention.retention_rate_pct >= 70 ? 'text-[#7dffa2]' : 'text-[#ffb780]'}`}>
                            {retentionData.webhook_subscription_retention.retention_rate_pct}%
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-[#1c1b1b] p-6 rounded-xl">
                      <h3 className="text-base font-bold text-[#e5e2e1] font-['Manrope'] mb-4">Token Churn</h3>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <div className="text-[10px] font-['JetBrains_Mono'] text-[#8c909f] uppercase tracking-widest mb-1">Created</div>
                          <div className="text-2xl font-black text-[#c2c6d5]">{retentionData.token_churn.created_30d}</div>
                        </div>
                        <div>
                          <div className="text-[10px] font-['JetBrains_Mono'] text-[#8c909f] uppercase tracking-widest mb-1">Revoked</div>
                          <div className="text-2xl font-black text-[#ffb4ab]">{retentionData.token_churn.revoked_30d}</div>
                        </div>
                        <div>
                          <div className="text-[10px] font-['JetBrains_Mono'] text-[#8c909f] uppercase tracking-widest mb-1">Churn Rate</div>
                          <div className={`text-2xl font-black ${retentionData.token_churn.churn_rate_pct <= 20 ? 'text-[#7dffa2]' : 'text-[#ffb4ab]'}`}>
                            {retentionData.token_churn.churn_rate_pct}%
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </section>
      </main>
    </div>
  )
}
