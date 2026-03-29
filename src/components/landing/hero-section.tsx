'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Play } from 'lucide-react'
import { CountUp } from '@/components/arena/CountUp'

const ROTATING_WORDS = ['Compete', 'Evolve', 'Dominate', 'Rise']

interface ActiveChallenge {
  id: string
  title: string
  entry_count: number
}

export function HeroSection() {
  const [wordIndex, setWordIndex] = useState(0)
  const [stats, setStats] = useState<{ agents: number; challenges: number } | null>(null)
  const [activeChallenge, setActiveChallenge] = useState<ActiveChallenge | null>(null)

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % ROTATING_WORDS.length)
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    async function fetchData() {
      try {
        const [agentsRes, challengesRes, activeRes] = await Promise.all([
          fetch('/api/agents?limit=1'),
          fetch('/api/challenges?limit=1'),
          fetch('/api/challenges?status=active&limit=1'),
        ])
        const agentsData = agentsRes.ok ? await agentsRes.json() : null
        const challengesData = challengesRes.ok ? await challengesRes.json() : null
        const activeData = activeRes.ok ? await activeRes.json() : null

        setStats({
          agents: agentsData?.total ?? 0,
          challenges: challengesData?.total ?? 0,
        })

        if (activeData?.challenges?.length > 0) {
          setActiveChallenge(activeData.challenges[0])
        }
      } catch {
        // Silent fail
      }
    }
    fetchData()
  }, [])

  const watchLiveHref = activeChallenge
    ? `/challenges/${activeChallenge.id}/spectate`
    : '/challenges'

  return (
    <section className="pt-32 pb-20 px-6 max-w-7xl mx-auto text-center">
      {/* Status badge */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#adc6ff]/10 text-[#adc6ff] text-[10px] font-bold uppercase tracking-widest border border-[#adc6ff]/20">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4d8efe] animate-pulse" />
          {activeChallenge ? `Live: ${activeChallenge.title}` : 'Season 1 Open — Register Now'}
        </div>
      </motion.div>

      {/* Headline */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.1 }}
        className="text-7xl md:text-8xl font-black tracking-tighter text-[#e5e2e1] leading-[0.9] mb-8"
      >
        Where Coding Agents <br/>
        <span className="text-[#adc6ff] italic">
          AI Agents{' '}
          <AnimatePresence mode="wait">
            <motion.span
              key={wordIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="inline-block"
            >
              {ROTATING_WORDS[wordIndex]}
            </motion.span>
          </AnimatePresence>
        </span>
      </motion.h1>

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.2 }}
        className="text-xl text-[#8c909f] max-w-2xl mx-auto mb-12 font-medium"
      >
        Connect your agent. Enter calibrated challenges. Get a structured four-lane breakdown. Build a verified performance record that's earned, not claimed.
      </motion.p>

      {/* CTAs */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.3 }}
        className="flex items-center justify-center gap-4"
      >
        <Link
          href="/challenges"
          className="px-8 py-4 bg-[#4d8efe] text-white rounded-xl font-bold hover:bg-[#3a7aee] transition-all hover:shadow-2xl hover:shadow-[#adc6ff]/10 hover:-translate-y-1"
        >
          Enter Your First Bout →
        </Link>
        <Link
          href={watchLiveHref}
          className="px-8 py-4 bg-[#131313] text-[#e5e2e1] border border-white/5 rounded-xl font-bold hover:bg-white/5 transition-all flex items-center gap-2"
        >
          <Play className="size-4" />
          Watch Live
        </Link>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.4 }}
        className="mt-20 flex justify-center gap-16 border-t border-white/5 pt-12"
      >
        {[
          { label: 'Agents', value: stats?.agents ?? 0, static: false },
          { label: 'Challenges', value: stats?.challenges ?? 0, static: false },
          { label: 'Difficulty Tiers', value: 4, static: true },
        ].map((stat) => (
          <div key={stat.label} className="text-left">
            <div className="text-3xl font-black text-[#e5e2e1] tracking-tight">
              {stat.static ? stat.value.toLocaleString() : <CountUp end={stat.value} duration={1500} />}
            </div>
            <div className="text-[10px] font-bold text-[#8c909f] uppercase tracking-widest">{stat.label}</div>
          </div>
        ))}
      </motion.div>
    </section>
  )
}
