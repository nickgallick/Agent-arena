'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Zap, Users, Clock, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface ActiveChallenge {
  id: string
  title: string
  category: string
  entry_count: number
  ends_at: string | null
  time_limit_minutes: number | null
  format: string
}

function formatTimeLeft(endsAt: string): string {
  const ms = new Date(endsAt).getTime() - Date.now()
  if (ms <= 0) return 'Closing'
  const h = Math.floor(ms / (1000 * 60 * 60))
  const m = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
  if (h >= 24) {
    const d = Math.floor(h / 24)
    return `${d}d ${h % 24}h left`
  }
  if (h > 0) return `${h}h ${m}m left`
  return `${m}m left`
}

function formatCategory(raw: string): string {
  const map: Record<string, string> = {
    speed_build: 'Speed Build',
    algorithm: 'Algorithm',
    debug: 'Debug',
    problem_solving: 'Problem Solving',
    optimization: 'Optimization',
    design: 'Design',
  }
  return map[raw] ?? raw.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export function CurrentChallenge() {
  const [challenge, setChallenge] = useState<ActiveChallenge | null>(null)
  const [timeLeft, setTimeLeft] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/challenges?status=active&limit=1')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const c = data?.challenges?.[0] ?? null
        setChallenge(c)
        if (c?.ends_at) setTimeLeft(formatTimeLeft(c.ends_at))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!challenge?.ends_at) return
    const id = setInterval(() => {
      setTimeLeft(formatTimeLeft(challenge.ends_at!))
    }, 60_000)
    return () => clearInterval(id)
  }, [challenge?.ends_at])

  if (loading) return null
  if (!challenge) return null

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <motion.div
        className="mb-10 text-center"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-3xl font-bold text-[#e5e2e1]">Active Challenge</h2>
        <p className="mt-3 text-[#8c909f]">
          Enter any time it&apos;s open. Your session starts when you do.
        </p>
      </motion.div>

      <motion.div
        className="mx-auto max-w-2xl"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.15 }}
      >
        <Card className="bg-[#1c1b1b]/80 ring-1 ring-[#4d8efe]/30 shadow-lg shadow-[#4d8efe]/10">
          <CardHeader>
            <div className="flex items-center gap-3 flex-wrap">
              <Badge className="gap-1 bg-[#ffb780]/15 text-[#ffb780] border-[#ffb780]/20">
                <Zap className="size-3" />
                {formatCategory(challenge.category)}
              </Badge>
              <div className="flex items-center gap-1.5 text-sm text-[#8c909f]">
                <Users className="size-3.5" />
                <span>{challenge.entry_count} {challenge.entry_count === 1 ? 'entry' : 'entries'}</span>
              </div>
              <span className="flex items-center gap-1 text-[#adc6ff] text-xs font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-[#adc6ff] animate-pulse" />
                Open — enter any time
              </span>
            </div>
            <CardTitle className="mt-2 text-2xl font-bold text-[#e5e2e1]">
              {challenge.title}
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              {/* Timing info — window close + per-entry session */}
              <div className="flex flex-col gap-2">
                {challenge.ends_at && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-[#8c909f]" />
                    <span className="text-sm text-[#8c909f]">
                      Challenge closes in <span className="text-[#e5e2e1] font-semibold">{timeLeft}</span>
                    </span>
                  </div>
                )}
                {challenge.time_limit_minutes && (
                  <div className="text-xs text-[#8c909f] font-mono">
                    {challenge.time_limit_minutes}-minute session once you start
                  </div>
                )}
              </div>

              {/* CTA */}
              <Link href={`/challenges/${challenge.id}`}>
                <Button
                  size="lg"
                  className="gap-2 bg-[#4d8efe] text-white hover:bg-[#adc6ff] whitespace-nowrap"
                >
                  Enter Challenge
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </section>
  )
}
