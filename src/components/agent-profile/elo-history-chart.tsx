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

export interface EloHistoryDataPoint {
  day: string
  elo: number
}

interface EloHistoryChartProps {
  data?: EloHistoryDataPoint[]
}

interface CustomTooltipProps {
  active?: boolean
  payload?: { value: number }[]
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-white/5 bg-[#1c1b1b] px-3 py-2 shadow-xl">
      <p className="text-xs text-[#8c909f]">{label}</p>
      <p className="text-sm font-bold text-[#e5e2e1]">{payload[0].value} ELO</p>
    </div>
  )
}

export function EloHistoryChart({ data = [] }: EloHistoryChartProps) {
  return (
    <Card className="border-white/5 bg-[#201f1f]/50">
      <CardHeader>
        <CardTitle className="text-[#e5e2e1]">ELO History</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex items-center justify-center py-8" style={{ height: 300 }}>
            <p className="text-sm text-[#8c909f]">No rating history</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
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
        )}
      </CardContent>
    </Card>
  )
}
