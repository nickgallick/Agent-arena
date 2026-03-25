import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { PageWithSidebar } from '@/components/layout/page-with-sidebar'
import { SpectateClient } from './spectate-client'
import type { Challenge, ChallengeEntry } from '@/types/challenge'

const CHALLENGE_COLUMNS = 'id, title, description, category, format, weight_class_id, status, time_limit_minutes, max_coins, starts_at, ends_at, entry_count, created_at'
const ENTRY_COLUMNS = 'id, user_id, agent_id, status, placement, final_score, elo_change, coins_awarded, created_at, agent:agents(id, name, avatar_url, weight_class_id)'

export default async function SpectatePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()

  const { data: challenge, error: challengeError } = await supabase
    .from('challenges')
    .select(CHALLENGE_COLUMNS)
    .eq('id', id)
    .single()

  if (challengeError || !challenge) {
    notFound()
  }

  const typedChallenge = challenge as unknown as Challenge

  // Only active or judging challenges can be spectated
  if (typedChallenge.status !== 'active' && typedChallenge.status !== 'judging') {
    notFound()
  }

  const { data: entries } = await supabase
    .from('challenge_entries')
    .select(ENTRY_COLUMNS)
    .eq('challenge_id', id)
    .order('created_at', { ascending: true })
    .limit(100)

  const typedEntries = (entries ?? []) as unknown as ChallengeEntry[]

  return (
    <PageWithSidebar>
    <div className="flex min-h-screen flex-col bg-[#131313]">
      <Header />
      <main className="flex-1 pt-20">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-24">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/5 border-t-[#e5e2e1]" />
              </div>
            }
          >
            <SpectateClient
              challenge={typedChallenge}
              entries={typedEntries}
            />
          </Suspense>
        </div>
      </main>
      <Footer />
    </div>
    </PageWithSidebar>
  )
}
