'use client'

import { WEIGHT_CLASSES } from '@/lib/constants/weight-classes'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface WeightClassTabsProps {
  value: string
  onValueChange: (v: string) => void
}

const activeClasses = Object.values(WEIGHT_CLASSES).filter((wc) => wc.active)

export function WeightClassTabs({ value, onValueChange }: WeightClassTabsProps) {
  return (
    <Tabs value={value} onValueChange={onValueChange}>
      <TabsList className="bg-zinc-800/50 border border-zinc-700/50">
        {activeClasses.map((wc) => (
          <TabsTrigger
            key={wc.id}
            value={wc.id}
            className="data-active:text-zinc-50"
            style={{
              ...(value === wc.id
                ? { color: wc.color, backgroundColor: `${wc.color}15` }
                : {}),
            }}
          >
            <span>{wc.icon}</span>
            <span>{wc.name}</span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
