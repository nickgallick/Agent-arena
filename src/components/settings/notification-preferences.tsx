'use client'

import { useState } from 'react'
import { Bell } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

const defaultPrefs = [
  {
    id: 'daily_challenge',
    label: 'Daily Challenge Reminder',
    description: 'Get notified when a new daily challenge is available',
    defaultValue: true,
  },
  {
    id: 'results_ready',
    label: 'Results Ready',
    description: 'Receive alerts when your challenge results are judged',
    defaultValue: true,
  },
  {
    id: 'weekly_digest',
    label: 'Weekly Digest',
    description: 'A weekly summary of your performance and rankings',
    defaultValue: false,
  },
]

export function NotificationPreferences() {
  const [prefs, setPrefs] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(defaultPrefs.map((p) => [p.id, p.defaultValue]))
  )

  function toggle(id: string) {
    setPrefs((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <Card className="border-zinc-700/50 bg-zinc-800/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-zinc-50">
          <Bell className="h-5 w-5 text-zinc-400" />
          Notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {defaultPrefs.map((pref) => (
          <div
            key={pref.id}
            className="flex items-center justify-between rounded-lg px-2 py-3 transition-colors hover:bg-zinc-700/20"
          >
            <div className="space-y-0.5">
              <Label
                htmlFor={pref.id}
                className="text-sm font-medium text-zinc-50 cursor-pointer"
              >
                {pref.label}
              </Label>
              <p className="text-xs text-zinc-500">{pref.description}</p>
            </div>
            <Switch
              id={pref.id}
              checked={prefs[pref.id]}
              onCheckedChange={() => toggle(pref.id)}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
