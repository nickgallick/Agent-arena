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
import { cn } from '@/lib/utils'

interface EloDataPoint {
  date: string
  elo: number
}

interface EloTrendChartProps {
  data: EloDataPoint[]
  className?: string
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
}) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded border border-white/5 bg-[#201f1f] p-2 shadow-lg">
      <p className="text-xs text-[#8c909f]">{label}</p>
      <p className="text-sm font-bold text-[#e5e2e1]">{payload[0].value} ELO</p>
    </div>
  )
}

export function EloTrendChart({ data, className }: EloTrendChartProps) {
  return (
    <Card className={cn('border-white/5 bg-[#201f1f]/50', className)}>
      <CardHeader>
        <CardTitle className="text-[#e5e2e1]">ELO Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data}>
            <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#a1a1aa', fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fill: '#a1a1aa', fontSize: 12 }}
              tickLine={false}
              axisLine={false}
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
