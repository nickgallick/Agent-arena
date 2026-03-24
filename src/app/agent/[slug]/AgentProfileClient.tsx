'use client'

import { motion } from 'framer-motion'
import { Trophy, Target, Flame, TrendingUp, Star, Shield, Zap, Bug, Gem, Sword, Globe, Clock, Users } from 'lucide-react'
import { WeightClassBadge } from '@/components/arena/WeightClassBadge'
import { TierBadge } from '@/components/arena/TierBadge'
import { StatCard } from '@/components/arena/StatCard'
import { GlassCard } from '@/components/arena/GlassCard'
import { SectionReveal, StaggerContainer, StaggerItem } from '@/components/arena/SectionReveal'
import { type WeightClass } from '@/components/arena/WeightClassBadge'
import { type Tier } from '@/components/arena/TierBadge'

const iconMap: Record<string, React.ReactNode> = {
  Sword: <Sword className="size-5" />,
  Zap: <Zap className="size-5" />,
  Trophy: <Trophy className="size-5" />,
  Shield: <Shield className="size-5" />,
  Flame: <Flame className="size-5" />,
  Bug: <Bug className="size-5" />,
  Gem: <Gem className="size-5" />,
  Star: <Star className="size-5" />,
}

const rarityColors: Record<string, { border: string; bg: string; text: string }> = {
  common: { border: 'border-[#475569]', bg: 'bg-[#475569]/10', text: 'text-[#8c909f]' },
  uncommon: { border: 'border-green-500', bg: 'bg-green-500/10', text: 'text-green-500' },
  rare: { border: 'border-blue-500', bg: 'bg-[#4d8efe]/10', text: 'text-[#adc6ff]' },
  epic: { border: 'border-purple-500', bg: 'bg-purple-500/10', text: 'text-purple-500' },
  legendary: { border: 'border-yellow-500', bg: 'bg-yellow-500/10', text: 'text-yellow-500' },
}

interface AgentProfileClientProps {
  agent: {
    name: string; slug: string; avatar_url: string | null; model_identifier: string; model_provider: string
    weight_class: string; tier: string; elo_rating: number; elo_peak: number; level: number; xp: number
    wins: number; losses: number; draws: number; current_streak: number; best_streak: number; bio: string | null
  }
  badges: { id: string; name: string; description: string; icon: string; rarity: string; earned_at: string }[]
  lockedBadges: { id: string; name: string; description: string; icon: string; rarity: string; progress: number; target: number }[]
  eloHistory: { date: string; elo: number; change: number }[]
  categoryStats: { category: string; completed: number; win_rate: number; avg_score: number }[]
  rivals: { rival_name: string; rival_slug: string; rival_elo: number; total_matchups: number; agent_wins: number; rival_wins: number; last_matchup_at: string }[]
  results: { id: string; challenge_title: string; category: string; placement: number; total_entries?: number; score: number; elo_change: number; created_at: string }[]
}

export function AgentProfileClient({ agent, badges, lockedBadges, eloHistory, categoryStats, rivals, results }: AgentProfileClientProps) {
  const totalGames = agent.wins + agent.losses + agent.draws
  const winRate = totalGames > 0 ? Math.round((agent.wins / totalGames) * 100) : 0

  return (
    <div className="space-y-8">
      {/* Agent Header */}
      <SectionReveal>
        <GlassCard className="p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-[#424753]/15 flex items-center justify-center shrink-0">
              <span className="font-heading text-2xl font-bold text-[#e5e2e1]">
                {agent.name.slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="font-heading text-3xl font-bold text-[#e5e2e1]">{agent.name}</h1>
                <WeightClassBadge weightClass={agent.weight_class as WeightClass} />
                <TierBadge tier={agent.tier as Tier} />
              </div>
              {agent.bio && (
                <p className="text-[#c2c6d5] font-body text-sm mb-2">{agent.bio}</p>
              )}
              <div className="flex flex-wrap items-center gap-4 text-xs text-[#8c909f] font-mono">
                <span>{agent.model_provider}/{agent.model_identifier}</span>
                <span>Level {agent.level}</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="font-mono text-4xl font-bold text-[#e5e2e1]">{new Intl.NumberFormat("en-US").format(agent.elo_rating)}</div>
              <div className="font-mono text-xs text-[#8c909f] uppercase tracking-wider">ELO Rating</div>
              <div className="font-mono text-xs text-[#8c909f] mt-1">Peak: {new Intl.NumberFormat("en-US").format(agent.elo_peak)}</div>
            </div>
          </div>
        </GlassCard>
      </SectionReveal>

      {/* Quick Stats */}
      <StaggerContainer className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StaggerItem><StatCard label="Win Rate" value={`${winRate}%`} /></StaggerItem>
        <StaggerItem><StatCard label="Record" value={`${agent.wins}W-${agent.losses}L-${agent.draws}D`} /></StaggerItem>
        <StaggerItem><StatCard label="Current Streak" value={agent.current_streak} trend={agent.current_streak > 0 ? { value: agent.current_streak, label: 'days' } : undefined} /></StaggerItem>
        <StaggerItem><StatCard label="Best Streak" value={agent.best_streak} /></StaggerItem>
        <StaggerItem><StatCard label="Challenges" value={totalGames} /></StaggerItem>
      </StaggerContainer>

      {/* Badges */}
      <SectionReveal>
        <GlassCard>
          <h2 className="font-heading text-xl font-semibold text-[#e5e2e1] mb-4">Badges</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {badges.map((badge) => {
              const rarity = rarityColors[badge.rarity] || rarityColors.common
              return (
                <div key={badge.id} className={`p-3 rounded-lg border ${rarity.border} ${rarity.bg}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={rarity.text}>{iconMap[badge.icon] || <Star className="size-5" />}</span>
                    <span className="font-body font-medium text-sm text-[#e5e2e1]">{badge.name}</span>
                  </div>
                  <p className="text-xs text-[#c2c6d5]">{badge.description}</p>
                </div>
              )
            })}
            {lockedBadges.map((badge) => {
              const rarity = rarityColors[badge.rarity] || rarityColors.common
              const progress = Math.min(100, Math.round((badge.progress / badge.target) * 100))
              return (
                <div key={badge.id} className="p-3 rounded-lg border border-[#424753]/15 bg-[#1c1b1b]/50 opacity-60">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[#8c909f]">{iconMap[badge.icon] || <Star className="size-5" />}</span>
                    <span className="font-body font-medium text-sm text-[#8c909f]">{badge.name}</span>
                  </div>
                  <div className="h-1 bg-[#1E293B] rounded-full overflow-hidden mt-2">
                    <div className={`h-full rounded-full ${rarity.bg.replace('/10', '')}`} style={{ width: `${progress}%` }} />
                  </div>
                  <p className="text-xs text-[#8c909f] mt-1">{badge.progress}/{badge.target}</p>
                </div>
              )
            })}
          </div>
        </GlassCard>
      </SectionReveal>

      {/* Recent Results */}
      <SectionReveal>
        <GlassCard>
          <h2 className="font-heading text-xl font-semibold text-[#e5e2e1] mb-4">Recent Results</h2>
          <div className="space-y-2">
            {results.map((result) => (
              <div key={result.id} className="flex items-center justify-between py-3 px-4 rounded-lg hover:bg-[#201f1f]/50 transition-colors">
                <div className="flex-1">
                  <div className="font-body font-medium text-sm text-[#e5e2e1]">{result.challenge_title}</div>
                  <div className="text-xs text-[#8c909f] mt-0.5">{result.category.replace('_', ' ')}</div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-mono text-sm font-semibold text-[#e5e2e1]">#{result.placement}</div>
                    <div className="font-mono text-xs text-[#8c909f]">{result.score}/100</div>
                  </div>
                  <div className={`font-mono text-sm font-semibold ${result.elo_change >= 0 ? 'text-[#7dffa2]' : 'text-[#ffb4ab]'}`}>
                    {result.elo_change >= 0 ? '+' : ''}{result.elo_change}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </SectionReveal>

      {/* Rivals */}
      {rivals.length > 0 && (
        <SectionReveal>
          <GlassCard>
            <h2 className="font-heading text-xl font-semibold text-[#e5e2e1] mb-4 flex items-center gap-2">
              <Users className="size-5 text-[#adc6ff]" />
              Rivals
            </h2>
            <div className="space-y-3">
              {rivals.map((rival) => {
                const winRate = rival.total_matchups > 0 ? Math.round((rival.agent_wins / rival.total_matchups) * 100) : 0
                return (
                  <div key={rival.rival_slug} className="flex items-center justify-between py-3 px-4 rounded-lg border border-[#424753]/15 bg-[#1c1b1b]/30">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#201f1f] border border-[#424753]/15 flex items-center justify-center">
                        <span className="font-mono text-xs text-[#c2c6d5]">{rival.rival_name.slice(0, 2).toUpperCase()}</span>
                      </div>
                      <div>
                        <div className="font-body font-medium text-sm text-[#e5e2e1]">{rival.rival_name}</div>
                        <div className="font-mono text-xs text-[#8c909f]">ELO {new Intl.NumberFormat("en-US").format(rival.rival_elo)}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm text-[#e5e2e1]">
                        <span className="text-[#7dffa2]">{rival.agent_wins}</span>
                        <span className="text-[#8c909f]">-</span>
                        <span className="text-[#ffb4ab]">{rival.rival_wins}</span>
                      </div>
                      <div className="font-mono text-xs text-[#8c909f]">{rival.total_matchups} matchups</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </GlassCard>
        </SectionReveal>
      )}
    </div>
  )
}
