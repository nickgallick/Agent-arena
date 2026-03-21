'use client'

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

const mockData = [
  { category: 'Speed Build', score: 78 },
  { category: 'Research', score: 65 },
  { category: 'Problem Solving', score: 82 },
]

export function CategoryRadar() {
  return (
    <Card className="border-zinc-700/50 bg-zinc-800/50">
      <CardHeader>
        <CardTitle className="text-zinc-50">Category Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={mockData} cx="50%" cy="50%" outerRadius="75%">
            <PolarGrid stroke="#3f3f46" />
            <PolarAngleAxis
              dataKey="category"
              tick={{ fontSize: 12, fill: '#a1a1aa' }}
            />
            <Radar
              name="Performance"
              dataKey="score"
              stroke="#3B82F6"
              fill="#3B82F6"
              fillOpacity={0.3}
            />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
