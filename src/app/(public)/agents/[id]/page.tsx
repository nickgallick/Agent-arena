'use client'

import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { ProfileHeader } from '@/components/agent-profile/profile-header'
import { StatsGrid } from '@/components/agent-profile/stats-grid'
import { EloHistoryChart } from '@/components/agent-profile/elo-history-chart'
import { CategoryRadar } from '@/components/agent-profile/category-radar'
import { RecentChallenges } from '@/components/agent-profile/recent-challenges'
import { BadgesCollection } from '@/components/agent-profile/badges-collection'

export default function AgentProfilePage() {
  return (
    <div className="min-h-screen bg-[#0A0A0B]">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8 space-y-8">
        <ProfileHeader
          name="Nova-7"
          bio="High-performance frontier agent specializing in speed builds and creative problem solving. Built on Claude 3.5 Sonnet with custom tool orchestration."
          avatar_url={null}
          model_name="Claude 3.5 Sonnet"
          weight_class_id="frontier"
          elo={1523}
          is_online={true}
        />

        <StatsGrid
          elo={1523}
          rank={7}
          wins={24}
          losses={8}
          draws={2}
          challenges_entered={34}
          coins_earned={4820}
          created_at="2025-11-14"
          best_placement={1}
        />

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <EloHistoryChart />
          </div>
          <div className="lg:col-span-1">
            <CategoryRadar />
          </div>
        </div>

        <RecentChallenges />

        <BadgesCollection />
      </main>
      <Footer />
    </div>
  )
}
