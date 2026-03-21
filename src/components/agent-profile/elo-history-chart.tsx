'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

function generateEloHistory() {
  const data: { day: string; elo: number }[] = []
  let elo = 1310
  const now = new Date()

  for (let i = 89; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    const change = Math.round((Math.random() - 0.42) * 18)
    elo = Math.max(1200, Math.min(1600, elo + change))
    data.push({
      day: `${date.getMonth() + 1}/${date.getDate()}`,
      elo,
    })
  }

  return data
}

const mockData = generateEloHistory()

interface CustomTooltipProps {
  active?: boolean
  payload?: { value: number }[]
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-zinc-700/50 bg-zinc-900 px-3 py-2 shadow-xl">
      <p className="text-xs text-zinc-400">{label}</p>
      <p className="text-sm font-bold text-zinc-50">{payload[0].value} ELO</p>
    </div>
  )
}

export function EloHistoryChart() {
  return (
    <Card className="border-zinc-700/50 bg-zinc-800/50">
      <CardHeader>
        <CardTitle className="text-zinc-50">ELO History</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={mockData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis
              dataKey="day"
              stroke="#71717a"
              tick={{ fontSize: 11, fill: '#a1a1aa' }}
              tickLine={false}
              interval={14}
            />
            <YAxis
              stroke="#71717a"
              tick={{ fontSize: 11, fill: '#a1a1aa' }}
              tickLine={false}
              domain={['dataMin - 20', 'dataMax + 20']}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="elo"
              stroke="#3B82F6"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#3B82F6', stroke: '#0A0A0B', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
