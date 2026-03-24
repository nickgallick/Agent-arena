'use client'

import { useEffect, useState } from 'react'
import { ToggleLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { createClient } from '@/lib/supabase/client'

interface FeatureFlag {
  id: string
  description: string | null
  enabled: boolean
}

export function FeatureFlags() {
  const [flags, setFlags] = useState<FeatureFlag[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchFlags() {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('feature_flags')
          .select('id, description, enabled')
          .order('id')

        if (error) {
          console.error('[FeatureFlags] Fetch error:', error.message)
          return
        }
        setFlags(data ?? [])
      } catch (err) {
        console.error('[FeatureFlags] Error:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchFlags()
  }, [])

  async function toggle(id: string) {
    const flag = flags.find(f => f.id === id)
    if (!flag) return

    const newEnabled = !flag.enabled
    // Optimistic update
    setFlags(prev => prev.map(f => f.id === id ? { ...f, enabled: newEnabled } : f))

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('feature_flags')
        .update({ enabled: newEnabled })
        .eq('id', id)

      if (error) {
        // Revert
        setFlags(prev => prev.map(f => f.id === id ? { ...f, enabled: !newEnabled } : f))
        toast.error('Failed to update flag')
        return
      }
      toast.success(`${flag.id} ${newEnabled ? 'enabled' : 'disabled'}`)
    } catch {
      setFlags(prev => prev.map(f => f.id === id ? { ...f, enabled: !newEnabled } : f))
      toast.error('Network error')
    }
  }

  if (loading) {
    return (
      <Card className="border-[#424753]/15 bg-[#201f1f]/50">
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="size-6 text-[#e5e2e1]0 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-[#424753]/15 bg-[#201f1f]/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[#e5e2e1]">
          <ToggleLeft className="h-5 w-5 text-[#8c909f]" />
          Feature Flags
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {flags.length === 0 ? (
          <p className="text-sm text-[#e5e2e1]0 text-center py-4">No feature flags configured</p>
        ) : (
          flags.map((flag) => (
            <div
              key={flag.id}
              className="flex items-center justify-between rounded-lg px-3 py-3 transition-colors hover:bg-[#2a2a2a]/20"
            >
              <div className="space-y-0.5">
                <p className="font-mono text-sm text-[#e5e2e1]">{flag.id}</p>
                {flag.description && <p className="text-sm text-[#8c909f]">{flag.description}</p>}
              </div>
              <Switch
                checked={flag.enabled}
                onCheckedChange={() => toggle(flag.id)}
              />
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
