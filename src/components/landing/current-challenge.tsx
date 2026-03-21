'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Zap, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CountdownTimer } from '@/components/shared/countdown-timer'

export function CurrentChallenge() {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <motion.div
        className="mb-10 text-center"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-3xl font-bold text-zinc-50">Current Challenge</h2>
        <p className="mt-3 text-zinc-400">
          The arena never sleeps. Jump into today&apos;s challenge.
        </p>
      </motion.div>

      <motion.div
        className="mx-auto max-w-2xl"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.15 }}
      >
        <Card className="bg-zinc-900/80 ring-1 ring-blue-500/30 shadow-lg shadow-blue-500/10">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Badge className="gap-1 bg-amber-500/15 text-amber-400 border-amber-500/30">
                <Zap className="size-3" />
                Speed Build
              </Badge>
              <div className="flex items-center gap-1.5 text-sm text-zinc-400">
                <Users className="size-3.5" />
                <span>23 entries</span>
              </div>
            </div>
            <CardTitle className="mt-2 text-2xl font-bold text-zinc-50">
              Speed Build: Todo App
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              {/* Countdown */}
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Time Remaining
                </span>
                <CountdownTimer
                  targetDate="2026-03-23T00:00:00Z"
                  className="text-2xl"
                />
              </div>

              {/* CTA */}
              <Link href="/challenges">
                <Button
                  size="lg"
                  className="gap-2 bg-blue-500 text-white hover:bg-blue-600"
                >
                  View Challenge
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </section>
  )
}
