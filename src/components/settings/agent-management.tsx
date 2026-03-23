'use client'

import { useEffect, useState } from 'react'
import { Bot, Key, RefreshCw, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useUser } from '@/lib/hooks/use-user'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { StatusIndicator } from '@/components/shared/status-indicator'

interface AgentData {
  id: string
  name: string
  model_name: string | null
  is_active: boolean
}

export function AgentManagement() {
  const { user, loading: userLoading } = useUser()
  const [agent, setAgent] = useState<AgentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [rotating, setRotating] = useState(false)

  useEffect(() => {
    if (userLoading) return
    if (!user) {
      setLoading(false)
      return
    }

    async function fetchAgent() {
      try {
        const res = await fetch('/api/me')
        if (!res.ok) {
          setLoading(false)
          return
        }
        const data = await res.json()
        if (data.agent) {
          setAgent(data.agent)
        }
      } catch (err) {
        console.error('[AgentManagement] Failed to load:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchAgent()
  }, [user, userLoading])

  async function handleRotate() {
    if (!agent) return
    setRotating(true)
    try {
      const res = await fetch(`/api/agents/${agent.id}/rotate-key`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to rotate key')
        return
      }
      toast.success('API key rotated — save your new key', {
        description: `New key: ${data.api_key?.substring(0, 12)}...`,
        duration: 10000,
      })
      setDialogOpen(false)
    } catch {
      toast.error('Network error — please try again')
    } finally {
      setRotating(false)
    }
  }

  if (userLoading || loading) {
    return (
      <Card className="border-zinc-700/50 bg-zinc-800/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-zinc-50">
            <Bot className="h-5 w-5 text-zinc-400" />
            Agent
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-6 animate-spin text-zinc-400" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!agent) {
    return (
      <Card className="border-zinc-700/50 bg-zinc-800/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-zinc-50">
            <Bot className="h-5 w-5 text-zinc-400" />
            Agent
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <p className="text-sm text-zinc-400">No agent registered yet</p>
            <p className="text-xs text-zinc-500">Register an agent to manage it here</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-zinc-700/50 bg-zinc-800/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-zinc-50">
          <Bot className="h-5 w-5 text-zinc-400" />
          Agent
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-zinc-700/50 bg-zinc-900/50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-zinc-50">{agent.name}</p>
              {agent.model_name && (
                <p className="text-xs text-zinc-400">{agent.model_name}</p>
              )}
            </div>
            <StatusIndicator isOnline={agent.is_active} label={agent.is_active ? 'Active' : 'Inactive'} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-500">API Key</p>
              <p className="font-mono text-sm text-zinc-400">****-****-****-****</p>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 border-zinc-700 text-zinc-300"
                  />
                }
              >
                <Key className="h-3.5 w-3.5" />
                Rotate API Key
              </DialogTrigger>
              <DialogContent className="border-zinc-700 bg-zinc-900">
                <DialogHeader>
                  <DialogTitle className="text-zinc-50">Rotate API Key</DialogTitle>
                  <DialogDescription className="text-zinc-400">
                    Are you sure? This will invalidate your current key. Any active integrations
                    using the old key will stop working immediately.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                    className="border-zinc-700 text-zinc-300"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleRotate}
                    disabled={rotating}
                    className="bg-blue-500 text-white hover:bg-blue-600"
                  >
                    {rotating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Rotate
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
