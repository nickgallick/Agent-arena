'use client'

import { useEffect, useState } from 'react'
import { Bot, Key, RefreshCw, Loader2, Search, Bell, CheckCircle, XCircle } from 'lucide-react'
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
import { AgentDiscoverySettings } from '@/components/settings/agent-discovery-settings'
import { RemoteInvocation } from '@/components/settings/remote-invocation'

interface AgentData {
  id: string
  name: string
  model_name: string | null
  is_active: boolean
  // Discovery fields (self-reported)
  bio?: string | null
  capability_tags?: string[] | null
  domain_tags?: string[] | null
  availability_status?: 'available' | 'unavailable' | 'unknown' | null
  contact_opt_in?: boolean
  website_url?: string | null
  runtime_metadata?: { model_name?: string; framework?: string; version?: string } | null
}

type ActiveTab = 'agent' | 'discovery' | 'interest' | 'remote-invocation'

interface InterestSignal {
  id: string
  requester_user_id: string
  message: string | null
  status: 'pending' | 'acknowledged' | 'declined'
  created_at: string
  updated_at: string
}

export function AgentManagement() {
  const { user, loading: userLoading } = useUser()
  const [agent, setAgent] = useState<AgentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [rotating, setRotating] = useState(false)
  const [activeTab, setActiveTab] = useState<ActiveTab>('agent')
  const [interestSignals, setInterestSignals] = useState<InterestSignal[]>([])
  const [interestLoading, setInterestLoading] = useState(false)
  const [interestLoaded, setInterestLoaded] = useState(false)

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
        const data = await res.json() as { agent?: AgentData }
        if (data.agent) {
          // Fetch full agent data including discovery fields
          const agentRes = await fetch(`/api/agents/${data.agent.id}`)
          if (agentRes.ok) {
            const agentData = await agentRes.json() as { agent?: AgentData }
            setAgent(agentData.agent ?? data.agent)
          } else {
            setAgent(data.agent)
          }
        }
      } catch (err) {
        console.error('[AgentManagement] Failed to load:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchAgent()
  }, [user, userLoading])

  async function fetchInterestSignals() {
    if (!agent || interestLoaded) return
    setInterestLoading(true)
    try {
      const res = await fetch(`/api/v1/agents/${agent.id}/interest`)
      if (res.ok) {
        const data = await res.json() as { signals?: InterestSignal[] }
        setInterestSignals(data.signals ?? [])
        setInterestLoaded(true)
      }
    } catch (err) {
      console.error('[AgentManagement] Failed to load interest signals:', err)
    } finally {
      setInterestLoading(false)
    }
  }

  async function handleSignalAction(signalId: string, status: 'acknowledged' | 'declined') {
    if (!agent) return
    try {
      const res = await fetch(`/api/v1/agents/${agent.id}/interest/${signalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        setInterestSignals(prev =>
          prev.map(s => s.id === signalId ? { ...s, status } : s)
        )
        toast.success(status === 'acknowledged' ? 'Signal acknowledged' : 'Signal declined')
      } else {
        toast.error('Failed to update signal')
      }
    } catch {
      toast.error('Network error — please try again')
    }
  }

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
      <Card className="border-white/5 bg-[#201f1f]/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#e5e2e1]">
            <Bot className="h-5 w-5 text-[#8c909f]" />
            Agent
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-6 animate-spin text-[#8c909f]" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!agent) {
    return (
      <Card className="border-white/5 bg-[#201f1f]/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#e5e2e1]">
            <Bot className="h-5 w-5 text-[#8c909f]" />
            Agent
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <p className="text-sm text-[#8c909f]">No agent registered yet</p>
            <p className="text-xs text-[#8c909f]">Register an agent to manage it here</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-white/5 bg-[#201f1f]/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[#e5e2e1]">
          <Bot className="h-5 w-5 text-[#8c909f]" />
          Agent
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-0 p-0">

        {/* Tab Navigation */}
        <div className="flex border-b border-white/5 px-6">
          <button
            type="button"
            onClick={() => setActiveTab('agent')}
            className={`px-4 py-3 font-['JetBrains_Mono'] text-xs uppercase tracking-widest transition-colors border-b-2 -mb-px ${
              activeTab === 'agent'
                ? 'border-[#adc6ff] text-[#adc6ff]'
                : 'border-transparent text-[#8c909f] hover:text-[#c2c6d5]'
            }`}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('discovery')}
            className={`px-4 py-3 font-['JetBrains_Mono'] text-xs uppercase tracking-widest transition-colors border-b-2 -mb-px flex items-center gap-1.5 ${
              activeTab === 'discovery'
                ? 'border-[#7dffa2] text-[#7dffa2]'
                : 'border-transparent text-[#8c909f] hover:text-[#c2c6d5]'
            }`}
          >
            <Search className="size-3" />
            Discovery
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('interest')
              void fetchInterestSignals()
            }}
            className={`px-4 py-3 font-['JetBrains_Mono'] text-xs uppercase tracking-widest transition-colors border-b-2 -mb-px flex items-center gap-1.5 ${
              activeTab === 'interest'
                ? 'border-[#f9a8d4] text-[#f9a8d4]'
                : 'border-transparent text-[#8c909f] hover:text-[#c2c6d5]'
            }`}
          >
            <Bell className="size-3" />
            Interest
            {interestSignals.filter(s => s.status === 'pending').length > 0 && (
              <span className="ml-1 inline-flex items-center justify-center rounded-full bg-[#f9a8d4] text-[#131313] text-[10px] font-bold w-4 h-4">
                {interestSignals.filter(s => s.status === 'pending').length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('remote-invocation')}
            className={`px-4 py-3 font-['JetBrains_Mono'] text-xs uppercase tracking-widest transition-colors border-b-2 -mb-px flex items-center gap-1.5 ${
              activeTab === 'remote-invocation'
                ? 'border-[#adc6ff] text-[#adc6ff]'
                : 'border-transparent text-[#8c909f] hover:text-[#c2c6d5]'
            }`}
          >
            Endpoint
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'agent' ? (
            <div className="rounded-lg border border-white/5 bg-[#1c1b1b]/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#e5e2e1]">{agent.name}</p>
                  {agent.model_name && (
                    <p className="text-xs text-[#8c909f]">{agent.model_name}</p>
                  )}
                </div>
                <StatusIndicator isOnline={agent.is_active} label={agent.is_active ? 'Active' : 'Inactive'} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#8c909f]">API Key</p>
                  <p className="font-mono text-sm text-[#8c909f]">****-****-****-****</p>
                </div>

                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger
                    render={
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 border-white/5 text-[#c2c6d5]"
                      />
                    }
                  >
                    <Key className="h-3.5 w-3.5" />
                    Rotate API Key
                  </DialogTrigger>
                  <DialogContent className="border-white/5 bg-[#1c1b1b]">
                    <DialogHeader>
                      <DialogTitle className="text-[#e5e2e1]">Rotate API Key</DialogTitle>
                      <DialogDescription className="text-[#8c909f]">
                        Are you sure? This will invalidate your current key. Any active integrations
                        using the old key will stop working immediately.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                      <Button
                        variant="outline"
                        onClick={() => setDialogOpen(false)}
                        className="border-white/5 text-[#c2c6d5]"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleRotate}
                        disabled={rotating}
                        className="bg-[#4d8efe] text-white hover:bg-[#adc6ff]"
                      >
                        {rotating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Rotate
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          ) : activeTab === 'discovery' ? (
            <AgentDiscoverySettings
              agentId={agent.id}
              agentName={agent.name}
              initialSettings={{
                capability_tags: agent.capability_tags ?? [],
                domain_tags: agent.domain_tags ?? [],
                availability_status: agent.availability_status ?? 'unknown',
                contact_opt_in: agent.contact_opt_in ?? false,
                description: agent.bio ?? '',
                website_url: agent.website_url ?? '',
                runtime_metadata: {
                    model_name: agent.runtime_metadata?.model_name ?? '',
                    framework: agent.runtime_metadata?.framework ?? '',
                    version: agent.runtime_metadata?.version ?? '',
                  },
              }}
            />
          ) : activeTab === 'remote-invocation' ? (
            <RemoteInvocation agentId={agent.id} agentName={agent.name} />
          ) : (
            /* Interest Signals — only visible to agent owner */
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-[#8c909f] uppercase tracking-widest font-['JetBrains_Mono']">
                  Interest Signals
                </p>
                {interestSignals.filter(s => s.status === 'pending').length > 0 && (
                  <span className="text-xs text-[#f9a8d4]">
                    {interestSignals.filter(s => s.status === 'pending').length} pending
                  </span>
                )}
              </div>
              {interestLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="size-5 animate-spin text-[#8c909f]" />
                </div>
              ) : interestSignals.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Bell className="size-8 text-[#3a3a3a] mb-2" />
                  <p className="text-sm text-[#8c909f]">No interest signals yet</p>
                  <p className="text-xs text-[#8c909f] mt-1">Enable contact opt-in in Discovery to receive signals</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {interestSignals.map((signal) => (
                    <div
                      key={signal.id}
                      className="rounded-lg border border-white/5 bg-[#1c1b1b]/50 p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-['JetBrains_Mono'] uppercase tracking-wide ${
                          signal.status === 'pending'
                            ? 'bg-[#f9a8d4]/10 text-[#f9a8d4]'
                            : signal.status === 'acknowledged'
                            ? 'bg-[#7dffa2]/10 text-[#7dffa2]'
                            : 'bg-[#8c909f]/10 text-[#8c909f]'
                        }`}>
                          {signal.status}
                        </span>
                        <span className="text-xs text-[#8c909f]">
                          {new Date(signal.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {signal.message && (
                        <p className="text-sm text-[#c2c6d5] line-clamp-2">
                          {signal.message.length > 120 ? signal.message.slice(0, 120) + '…' : signal.message}
                        </p>
                      )}
                      {signal.status === 'pending' && (
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => void handleSignalAction(signal.id, 'acknowledged')}
                            className="flex items-center gap-1 text-xs text-[#7dffa2] hover:text-[#7dffa2]/80 transition-colors"
                          >
                            <CheckCircle className="size-3" />
                            Acknowledge
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleSignalAction(signal.id, 'declined')}
                            className="flex items-center gap-1 text-xs text-[#8c909f] hover:text-[#c2c6d5] transition-colors"
                          >
                            <XCircle className="size-3" />
                            Decline
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
