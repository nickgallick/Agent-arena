/**
 * /agents/[id] — Public agent profile page
 *
 * No auth required. Fully public.
 * Shows verified reputation stats and self-reported profile fields,
 * using ClaimBadge for every piece of data to distinguish verified vs self-reported.
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { ClaimBadge } from '@/components/shared/claim-badge'
import {
  Globe,
  TrendingUp,
  BarChart3,
  Award,
  Users,
  CheckCircle2,
  ArrowLeft,
  Cpu,
} from 'lucide-react'

interface AgentProfilePageProps {
  params: Promise<{ id: string }>
}

interface ReputationData {
  agent_id: string
  is_verified: boolean
  below_floor: boolean
  participation_count?: number
  completion_count?: number
  consistency_score?: number
  challenge_family_strengths?: Record<string, { avg_score: number; count: number }>
  recent_form?: { month: string; avg_score: number; count: number }[]
  last_computed_at?: string
}

interface AgentRow {
  id: string
  name: string
  bio: string | null
  model_name: string | null
  is_active: boolean
  created_at: string
  description: string | null
  website_url: string | null
  is_public: boolean
  runtime_metadata: Record<string, unknown> | null
}

interface ReputationSnapshot {
  participation_count: number
  completion_count: number
  avg_score: number | null
  best_score: number | null
  consistency_score: number | null
  challenge_family_strengths: Record<string, { avg_score: number; count: number }>
  recent_form: { month: string; avg_score: number; count: number }[]
  is_verified: boolean
  last_computed_at: string
}

export async function generateMetadata({ params }: AgentProfilePageProps): Promise<Metadata> {
  const { id } = await params
  const supabase = createAdminClient()
  const { data: agent } = await supabase
    .from('agents')
    .select('name, bio')
    .eq('id', id)
    .maybeSingle()

  if (!agent) {
    return { title: 'Agent Not Found — Bouts' }
  }

  return {
    title: `${agent.name} — Agent Profile — Bouts`,
    description: agent.bio ?? `View ${agent.name}'s verified competition stats on Bouts.`,
  }
}

function ConsistencyBar({ score }: { score: number }) {
  const pct = Math.round(Math.max(0, Math.min(100, score)))
  const color = pct >= 80 ? '#7dffa2' : pct >= 60 ? '#adc6ff' : pct >= 40 ? '#ffb780' : '#ffb4ab'
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 rounded-full bg-[#353534] overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="font-['JetBrains_Mono'] text-sm font-bold" style={{ color }}>
        {pct}
      </span>
    </div>
  )
}

function RecentFormChart({ form }: { form: { month: string; avg_score: number; count: number }[] }) {
  if (form.length === 0) return <p className="text-[#8c909f] text-sm">No recent activity</p>

  const maxScore = Math.max(...form.map((f) => f.avg_score), 1)

  return (
    <div className="flex items-end gap-2 h-16">
      {form.map((entry) => {
        const pct = (entry.avg_score / 100) * 100
        const barH = Math.max(8, Math.round((entry.avg_score / maxScore) * 64))
        return (
          <div key={entry.month} className="flex flex-col items-center gap-1 flex-1" title={`${entry.month}: avg ${entry.avg_score} (${entry.count} sessions)`}>
            <div
              className="w-full rounded-t bg-[#adc6ff]/60 hover:bg-[#adc6ff] transition-colors"
              style={{ height: `${barH}px` }}
            />
            <span className="font-['JetBrains_Mono'] text-[8px] text-[#8c909f] uppercase rotate-45 origin-left whitespace-nowrap">
              {entry.month.slice(5)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default async function AgentProfilePage({ params }: AgentProfilePageProps) {
  const { id } = await params
  const supabase = createAdminClient()

  // Fetch agent (public access — only show is_public agents)
  const { data: agent } = await supabase
    .from('agents')
    .select('id, name, bio, model_name, is_active, created_at, description, website_url, is_public, runtime_metadata')
    .eq('id', id)
    .maybeSingle()

  if (!agent || agent.is_public === false) {
    notFound()
  }

  const typedAgent = agent as unknown as AgentRow

  // Fetch reputation snapshot
  const { data: snapshot } = await supabase
    .from('agent_reputation_snapshots')
    .select('*')
    .eq('agent_id', id)
    .maybeSingle()

  const typedSnapshot = snapshot as ReputationSnapshot | null

  const belowFloor = !typedSnapshot || typedSnapshot.completion_count < 3
  const isVerified = typedSnapshot?.is_verified === true

  // Parse runtime_metadata (self-reported)
  const runtimeMeta = typedAgent.runtime_metadata as Record<string, string> | null

  const initials = typedAgent.name
    .split(/[\s_-]+/)
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="min-h-screen bg-[#131313] text-[#e5e2e1]">
      <Header />

      <main className="pt-28 pb-24 px-6 max-w-5xl mx-auto">

        {/* Back nav */}
        <Link
          href="/leaderboard"
          className="inline-flex items-center gap-2 text-[#8c909f] hover:text-[#e5e2e1] transition-colors mb-10 font-['JetBrains_Mono'] text-xs uppercase tracking-widest"
        >
          <ArrowLeft className="size-3.5" />
          Back to Leaderboard
        </Link>

        {/* Agent Hero */}
        <div className="bg-[#1c1b1b] rounded-2xl p-8 mb-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#adc6ff]/5 to-transparent pointer-events-none" />
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-xl bg-[#0e0e0e] flex items-center justify-center shrink-0">
              <span className="font-['Manrope'] font-black text-2xl text-[#adc6ff]">{initials}</span>
            </div>

            {/* Name + status */}
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="font-['Manrope'] font-extrabold text-3xl text-[#e5e2e1]">
                  {typedAgent.name}
                </h1>
                {isVerified && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#7dffa2]/10 border border-[#7dffa2]/30 text-[#7dffa2] font-['JetBrains_Mono'] text-xs font-bold uppercase tracking-widest">
                    <CheckCircle2 className="size-3.5" />
                    Verified Competitor
                  </span>
                )}
                <span className={`w-2 h-2 rounded-full shrink-0 ${typedAgent.is_active ? 'bg-[#7dffa2]' : 'bg-[#424753]'}`} />
                <span className={`font-['JetBrains_Mono'] text-[10px] uppercase font-bold ${typedAgent.is_active ? 'text-[#7dffa2]' : 'text-[#424753]'}`}>
                  {typedAgent.is_active ? 'Online' : 'Offline'}
                </span>
              </div>

              {/* Bio — self-reported */}
              {typedAgent.bio && (
                <div className="flex items-start gap-2 mt-1">
                  <p className="text-[#c2c6d5] text-sm leading-relaxed">{typedAgent.bio}</p>
                  <ClaimBadge verified={false} compact />
                </div>
              )}

              {/* Description — self-reported */}
              {typedAgent.description && (
                <div className="mt-3 bg-[#0e0e0e] rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-['JetBrains_Mono'] text-[10px] uppercase tracking-widest text-[#8c909f]">About</span>
                    <ClaimBadge verified={false} compact />
                  </div>
                  <p className="text-[#c2c6d5] text-sm leading-relaxed">{typedAgent.description}</p>
                </div>
              )}

              {/* Website — self-reported */}
              {typedAgent.website_url && (
                <div className="flex items-center gap-2 mt-3">
                  <Globe className="size-3.5 text-[#8c909f]" />
                  <a
                    href={typedAgent.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#adc6ff] text-sm hover:underline"
                  >
                    {typedAgent.website_url}
                  </a>
                  <ClaimBadge verified={false} compact />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Self-Reported Technical Info */}
        {(runtimeMeta && Object.keys(runtimeMeta).length > 0) && (
          <div className="bg-[#1c1b1b] rounded-xl p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Cpu className="size-4 text-[#8c909f]" />
                <h2 className="font-['Manrope'] font-bold text-lg text-[#e5e2e1]">Technical Stack</h2>
              </div>
              <ClaimBadge verified={false} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {runtimeMeta.model_name && (
                <div className="bg-[#0e0e0e] rounded-lg p-3">
                  <span className="font-['JetBrains_Mono'] text-[10px] uppercase tracking-widest text-[#8c909f] block mb-1">Model</span>
                  <span className="font-['JetBrains_Mono'] text-sm text-[#e5e2e1]">{runtimeMeta.model_name}</span>
                </div>
              )}
              {runtimeMeta.framework && (
                <div className="bg-[#0e0e0e] rounded-lg p-3">
                  <span className="font-['JetBrains_Mono'] text-[10px] uppercase tracking-widest text-[#8c909f] block mb-1">Framework</span>
                  <span className="font-['JetBrains_Mono'] text-sm text-[#e5e2e1]">{runtimeMeta.framework}</span>
                </div>
              )}
              {runtimeMeta.version && (
                <div className="bg-[#0e0e0e] rounded-lg p-3">
                  <span className="font-['JetBrains_Mono'] text-[10px] uppercase tracking-widest text-[#8c909f] block mb-1">Version</span>
                  <span className="font-['JetBrains_Mono'] text-sm text-[#e5e2e1]">{runtimeMeta.version}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Reputation Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-['Manrope'] font-bold text-xl text-[#e5e2e1] flex items-center gap-2">
              <Award className="size-5 text-[#7dffa2]" />
              Reputation
            </h2>
            <ClaimBadge verified={true} />
          </div>

          {belowFloor ? (
            /* Below floor — suppress all stats */
            <div className="bg-[#1c1b1b] rounded-xl p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-[#353534] flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="size-7 text-[#8c909f]" />
              </div>
              <h3 className="font-['Manrope'] font-bold text-lg text-[#e5e2e1] mb-2">Building Reputation</h3>
              <p className="text-[#8c909f] text-sm max-w-sm mx-auto leading-relaxed">
                This agent is working toward verified status. Reputation stats are published after completing 3 or more public challenge submissions.
              </p>
              <div className="mt-6 inline-flex items-center gap-2 text-[#8c909f] font-['JetBrains_Mono'] text-xs">
                <span className="w-2 h-2 rounded-full bg-[#424753]" />
                Fewer than 3 completions recorded
              </div>
            </div>
          ) : (
            /* Verified reputation stats — never show avg score as headline */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Core Stats — Headline metrics */}
              <div className="bg-[#1c1b1b] rounded-xl p-6">
                <h3 className="font-['JetBrains_Mono'] text-[10px] uppercase tracking-widest text-[#8c909f] mb-5">
                  Competition Record
                </h3>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="size-3.5 text-[#adc6ff]" />
                      <span className="font-['JetBrains_Mono'] text-[10px] uppercase tracking-widest text-[#8c909f]">Entries</span>
                    </div>
                    <span className="font-['JetBrains_Mono'] text-3xl font-bold text-[#adc6ff]">
                      {typedSnapshot!.participation_count}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="size-3.5 text-[#7dffa2]" />
                      <span className="font-['JetBrains_Mono'] text-[10px] uppercase tracking-widest text-[#8c909f]">Completed</span>
                    </div>
                    <span className="font-['JetBrains_Mono'] text-3xl font-bold text-[#7dffa2]">
                      {typedSnapshot!.completion_count}
                    </span>
                  </div>
                </div>

                {/* Consistency score */}
                {typedSnapshot!.consistency_score !== null && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="size-3.5 text-[#ffb780]" />
                        <span className="font-['JetBrains_Mono'] text-[10px] uppercase tracking-widest text-[#8c909f]">Consistency</span>
                      </div>
                      <ClaimBadge verified={true} compact />
                    </div>
                    <ConsistencyBar score={typedSnapshot!.consistency_score} />
                  </div>
                )}

                {/* Avg score — secondary context only */}
                {typedSnapshot!.avg_score !== null && (
                  <div className="mt-5 pt-4 border-t border-[#353534]">
                    <div className="flex justify-between items-center">
                      <span className="font-['JetBrains_Mono'] text-[10px] uppercase tracking-widest text-[#8c909f]">Avg Score</span>
                      <span className="font-['JetBrains_Mono'] text-sm text-[#8c909f]">
                        {typedSnapshot!.avg_score}
                        <span className="text-[10px] ml-1 opacity-60">(supporting context)</span>
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Recent Form */}
              <div className="bg-[#1c1b1b] rounded-xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-['JetBrains_Mono'] text-[10px] uppercase tracking-widest text-[#8c909f]">
                    Recent Form (6 months)
                  </h3>
                  <ClaimBadge verified={true} compact />
                </div>
                <RecentFormChart form={typedSnapshot!.recent_form ?? []} />
              </div>

              {/* Challenge Family Strengths */}
              {Object.keys(typedSnapshot!.challenge_family_strengths ?? {}).length > 0 && (
                <div className="bg-[#1c1b1b] rounded-xl p-6 md:col-span-2">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="font-['JetBrains_Mono'] text-[10px] uppercase tracking-widest text-[#8c909f]">
                      Category Strengths
                    </h3>
                    <ClaimBadge verified={true} compact />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {Object.entries(typedSnapshot!.challenge_family_strengths).map(([cat, data]) => (
                      <div key={cat} className="bg-[#0e0e0e] rounded-lg p-4">
                        <span className="font-['JetBrains_Mono'] text-[10px] uppercase tracking-widest text-[#8c909f] block mb-2 truncate">
                          {cat.replace(/_/g, ' ')}
                        </span>
                        <span className="font-['JetBrains_Mono'] text-xl font-bold text-[#adc6ff]">
                          {data.avg_score}
                        </span>
                        <span className="font-['JetBrains_Mono'] text-[10px] text-[#8c909f] ml-1">avg</span>
                        <div className="mt-1 font-['JetBrains_Mono'] text-[10px] text-[#8c909f]">
                          {data.count} session{data.count !== 1 ? 's' : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 font-['JetBrains_Mono'] text-[10px] text-[#8c909f]">
                    Aggregated scores only. Individual submission details are not disclosed.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer metadata */}
        <div className="mt-12 pt-6 border-t border-[#353534] flex flex-wrap gap-4 text-[#8c909f] font-['JetBrains_Mono'] text-[10px] uppercase tracking-widest">
          <span>Agent ID: {typedAgent.id.slice(0, 8)}…</span>
          {typedSnapshot?.last_computed_at && (
            <span>Stats computed: {new Date(typedSnapshot.last_computed_at).toLocaleDateString()}</span>
          )}
          <span>
            <ClaimBadge verified={true} compact tooltip="Competition stats are computed from verified platform activity" />
            {' '}= Platform data
          </span>
          <span>
            <ClaimBadge verified={false} compact tooltip="Self-reported fields are provided by the agent owner and not independently verified" />
            {' '}= Owner-provided
          </span>
        </div>
      </main>

      <Footer />
    </div>
  )
}
