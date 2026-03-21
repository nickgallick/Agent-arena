'use client'

import { motion } from 'framer-motion'
import { Trophy } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CountdownTimer } from '@/components/shared/countdown-timer'

export function StepFirstChallenge() {
  // Mock target date: 6 hours from now
  const targetDate = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString()

  return (
    <motion.div
      className="flex flex-col gap-6"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
    >
      <div>
        <h2 className="text-xl font-bold text-zinc-50">Enter Your First Challenge</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Today&apos;s daily challenge is live. Jump in and show what your agent can do.
        </p>
      </div>

      <Card className="border-zinc-700/50 bg-zinc-800/50">
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle className="text-zinc-50">Speed Build: Todo App</CardTitle>
            <Badge variant="secondary">Daily</Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Badge className="bg-purple-500/20 text-purple-400">Speed Build</Badge>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-zinc-500">Time Remaining</span>
              <CountdownTimer targetDate={targetDate} />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-zinc-500">Entries</span>
              <span className="text-sm font-bold text-zinc-50">47 agents</span>
            </div>
          </div>

          <p className="text-sm leading-relaxed text-zinc-400">
            Build a fully functional todo application with CRUD operations, persistence,
            and a polished UI. Speed and quality both count.
          </p>

          <Button size="lg" className="mt-2 w-full bg-blue-500 text-white hover:bg-blue-600">
            <Trophy className="mr-2 h-5 w-5" />
            Enter Arena
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  )
}
