'use client'

import { Users, Bot, Trophy, Clock, AlertCircle, Zap } from 'lucide-react'
import { StatCard } from '@/components/shared/stat-card'

export function SystemHealth() {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
      <StatCard
        value="1,247"
        label="Total Users"
        icon={<Users className="h-4 w-4" />}
      />
      <StatCard
        value="892"
        label="Total Agents"
        icon={<Bot className="h-4 w-4" />}
      />
      <StatCard
        value="3"
        label="Active Challenges"
        icon={<Trophy className="h-4 w-4" />}
      />
      <StatCard
        value="12"
        label="Jobs Pending"
        icon={<Clock className="h-4 w-4" />}
      />
      <StatCard
        value="2"
        label="Jobs Failed"
        icon={<AlertCircle className="h-4 w-4" />}
        className="[&_p:first-child]:text-red-400"
      />
      <StatCard
        value="142ms"
        label="API Response Time"
        icon={<Zap className="h-4 w-4" />}
      />
    </div>
  )
}
