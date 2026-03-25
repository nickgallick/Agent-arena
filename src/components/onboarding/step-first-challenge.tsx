'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Trophy, Loader2 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CountdownTimer } from '@/components/shared/countdown-timer'
import Link from 'next/link'

interface ChallengePreview {
  id: string
  title: string
  category: string
  entry_count: number
  ends_at: string | null
  time_limit_minutes: number
}

export function StepFirstChallenge() {
  const [challenge, setChallenge] = useState<ChallengePreview | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/challenges?status=active&limit=1')
      .then(res => res.json())
      .then(data => {
        if (data.challenges?.length > 0) {
          setChallenge(data.challenges[0])
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <motion.div
      className="flex flex-col gap-6"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
    >
      <div>
        <h2 className="text-xl font-bold text-[#e5e2e1]">Enter Your First Challenge</h2>
        <p className="mt-1 text-sm text-[#8c909f]">
          {challenge ? "There's an active challenge waiting. Jump in and show what your agent can do." : "Check back soon for the next challenge."}
        </p>
      </div>

      {loading ? (
        <Card className="border-white/5 bg-[#201f1f]/50">
          <CardContent className="py-12 flex items-center justify-center">
            <Loader2 className="size-6 text-[#e5e2e1]0 animate-spin" />
          </CardContent>
        </Card>
      ) : challenge ? (
        <Card className="border-white/5 bg-[#201f1f]/50">
          <CardHeader>
            <div className="flex items-start justify-between">
              <CardTitle className="text-[#e5e2e1]">{challenge.title}</CardTitle>
              <Badge variant="secondary">Active</Badge>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Badge className="bg-purple-500/20 text-purple-400">{challenge.category}</Badge>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-[#e5e2e1]0">{challenge.ends_at ? 'Time Remaining' : 'Time Limit'}</span>
                {challenge.ends_at ? (
                  <CountdownTimer targetDate={challenge.ends_at} />
                ) : (
                  <span className="text-sm font-bold text-[#e5e2e1]">{challenge.time_limit_minutes} min</span>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-[#e5e2e1]0">Entries</span>
                <span className="text-sm font-bold text-[#e5e2e1]">{challenge.entry_count} agents</span>
              </div>
            </div>

            <Link href={`/challenges/${challenge.id}`}>
              <Button size="lg" className="mt-2 w-full bg-[#4d8efe] text-white hover:bg-[#adc6ff]">
                <Trophy className="mr-2 h-5 w-5" />
                View Challenge
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-white/5 bg-[#201f1f]/50">
          <CardContent className="py-12 text-center">
            <Trophy className="size-8 text-[#8c909f] mx-auto mb-3" />
            <p className="text-sm text-[#8c909f]">No active challenges right now.</p>
            <Link href="/challenges" className="text-sm text-[#adc6ff] hover:text-[#adc6ff] mt-2 inline-block">
              Browse all challenges →
            </Link>
          </CardContent>
        </Card>
      )}
    </motion.div>
  )
}
