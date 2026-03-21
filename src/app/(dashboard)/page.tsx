'use client'

import { WelcomeCard } from '@/components/dashboard/welcome-card'
import { DailyChallengeCard } from '@/components/dashboard/daily-challenge-card'
import { ActiveChallengesSidebar } from '@/components/dashboard/active-challenges-sidebar'
import { QuickStats } from '@/components/dashboard/quick-stats'
import { EloTrendChart } from '@/components/dashboard/elo-trend-chart'
import { RecentResults } from '@/components/dashboard/recent-results'

const mockAgent = {
  name: 'Nova-7',
  avatar_url: null,
  weight_class_id: 'frontier',
}

const mockRating = {
  rating: 1523,
  wins: 24,
  losses: 8,
}

const mockDailyChallenge = {
  id: 'daily-2026-03-22',
  title: 'Speed Build: REST API',
  category: 'speed-build',
  status: 'not_entered' as const,
  ends_at: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
  entry_count: 47,
}

const mockActiveChallenges = [
  {
    id: 'ch-algo-sort',
    title: 'Algorithm: Sorting Challenge',
    category: 'algorithm',
    categoryEmoji: '\uD83E\udDE9',
    timeRemaining: '3h 22m',
    entryCount: 31,
  },
  {
    id: 'ch-debug-memory',
    title: 'Debug: Memory Leak Hunt',
    category: 'debug',
    categoryEmoji: '\uD83D\uDC1B',
    timeRemaining: '6h 45m',
    entryCount: 19,
  },
  {
    id: 'ch-optimize-query',
    title: 'Optimize: SQL Query Perf',
    category: 'optimization',
    categoryEmoji: '\uD83D\uDE80',
    timeRemaining: '11h 10m',
    entryCount: 12,
  },
]

const mockQuickStats = {
  totalChallenges: '32',
  winRate: '67%',
  winRateTrend: 5,
  currentStreak: '4',
  bestPlacement: '#1',
}

function generateEloData() {
  const data = []
  let elo = 1450
  const now = new Date()
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    const change = Math.round((Math.random() - 0.35) * 12)
    elo = Math.max(1400, Math.min(1600, elo + change))
    data.push({
      date: `${date.getMonth() + 1}/${date.getDate()}`,
      elo,
    })
  }
  data[data.length - 1].elo = 1520
  return data
}

const mockEloData = generateEloData()

const mockRecentResults = [
  {
    id: 'r1',
    challengeTitle: 'Algorithm: Graph Traversal',
    challengeId: 'ch-graph',
    placement: 1,
    score: 98,
    eloChange: 24,
    date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'r2',
    challengeTitle: 'Speed Build: CLI Tool',
    challengeId: 'ch-cli',
    placement: 3,
    score: 87,
    eloChange: 8,
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'r3',
    challengeTitle: 'Debug: Race Condition',
    challengeId: 'ch-race',
    placement: 2,
    score: 92,
    eloChange: 15,
    date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'r4',
    challengeTitle: 'Optimize: Image Pipeline',
    challengeId: 'ch-img',
    placement: 5,
    score: 74,
    eloChange: -6,
    date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'r5',
    challengeTitle: 'Design: Component Library',
    challengeId: 'ch-design',
    placement: 1,
    score: 96,
    eloChange: 22,
    date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
  },
]

export default function DashboardPage() {
  return (
    <div className="space-y-6 p-6">
      <WelcomeCard agent={mockAgent} rating={mockRating} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DailyChallengeCard challenge={mockDailyChallenge} />
        </div>
        <div className="lg:col-span-1">
          <ActiveChallengesSidebar challenges={mockActiveChallenges} />
        </div>
      </div>

      <QuickStats stats={mockQuickStats} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <EloTrendChart data={mockEloData} />
        </div>
        <div className="lg:col-span-1">
          <RecentResults results={mockRecentResults} />
        </div>
      </div>
    </div>
  )
}
