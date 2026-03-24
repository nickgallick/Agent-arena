'use client'

import { useEffect, useState, useCallback } from 'react'
import { Copy, Check, RotateCcw, Cpu, Bot, Loader2, AlertTriangle, PlusCircle, Rocket, Settings, Trash2 } from 'lucide-react'
import { useUser } from '@/lib/hooks/use-user'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { TierBadge } from '@/components/shared/tier-badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { formatElo, formatDate, formatWinRate } from '@/lib/utils/format'

interface AgentData {
  id: string
  name: string
  bio: string | null
  avatar_url: string | null
  model_name: string | null
  is_active: boolean
  api_key_prefix?: string | null
  created_at: string
  updated_at: string
}

interface RatingData {
  rating: number
  wins: number
  losses: number
  draws: number
}

const MODEL_OPTIONS = [
  { label: 'Claude Opus 4', identifier: 'claude-opus-4', provider: 'anthropic' },
  { label: 'Claude Sonnet 4', identifier: 'claude-sonnet-4', provider: 'anthropic' },
  { label: 'GPT-5', identifier: 'gpt-5', provider: 'openai' },
  { label: 'GPT-4.1', identifier: 'gpt-4.1', provider: 'openai' },
  { label: 'o3', identifier: 'o3', provider: 'openai' },
  { label: 'Gemini 2.5 Pro', identifier: 'gemini-2.5-pro', provider: 'google' },
  { label: 'Gemini 2.5 Flash', identifier: 'gemini-2.5-flash', provider: 'google' },
  { label: 'Llama 4 Maverick', identifier: 'llama-4-maverick', provider: 'meta' },
  { label: 'DeepSeek R1', identifier: 'deepseek-r1', provider: 'deepseek' },
  { label: 'Grok 3', identifier: 'grok-3', provider: 'xai' },
] as const

export default function AgentsPage() {
  const { user, loading: userLoading } = useUser()
  const [agents, setAgents] = useState<AgentData[]>([])
  const [ratings, setRatings] = useState<Record<string, RatingData>>({})
  const [loading, setLoading] = useState(true)

  const [regName, setRegName] = useState('')
  const [regModel, setRegModel] = useState('')
  const [regBio, setRegBio] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  const [apiKey, setApiKey] = useState<string | null>(null)
  const [apiKeyDialogMode, setApiKeyDialogMode] = useState<'created' | 'rotated'>('created')
  const [keyCopied, setKeyCopied] = useState(false)
  const [rotatingAgentId, setRotatingAgentId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/me')
      if (!res.ok) {
        setLoading(false)
        return
      }
      const data = await res.json()
      const nextAgents: AgentData[] = data.agents ?? (data.agent ? [data.agent] : [])
      setAgents(nextAgents)

      if (nextAgents.length > 0) {
        const supabase = createClient()
        const ratingMap: Record<string, RatingData> = {}

        await Promise.all(
          nextAgents.map(async (agent) => {
            const { data: ratingData } = await supabase
              .from('agent_ratings')
              .select('rating, wins, losses, draws')
              .eq('agent_id', agent.id)
              .limit(1)
              .maybeSingle()

            if (ratingData) {
              ratingMap[agent.id] = ratingData
            }
          })
        )

        setRatings(ratingMap)
      } else {
        setRatings({})
      }
    } catch (err) {
      console.error('[AgentsPage] Failed to load:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (userLoading) return
    if (!user) {
      setLoading(false)
      return
    }
    fetchData()
  }, [user, userLoading, fetchData])

  function getSelectedModel() {
    return MODEL_OPTIONS.find((m) => m.identifier === regModel)
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')

    const model = getSelectedModel()
    if (!model) {
      setFormError('Please select a model')
      return
    }

    if (!/^[a-zA-Z0-9_-]{3,32}$/.test(regName)) {
      setFormError('Name must be 3-32 alphanumeric, dash, or underscore characters')
      return
    }

    setSubmitting(true)

    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName,
          model_identifier: model.identifier,
          model_provider: model.provider,
          bio: regBio || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        const msg = data.error ?? 'Failed to register agent'
        toast.error(msg)
        setFormError(msg)
        return
      }

      setApiKeyDialogMode('created')
      setApiKey(data.api_key)
      toast.success('Agent registered!')
    } catch {
      toast.error('Network error — please try again')
      setFormError('Network error — please try again')
    } finally {
      setSubmitting(false)
    }
  }

  function handleCopyApiKey() {
    if (!apiKey) return
    navigator.clipboard.writeText(apiKey)
    setKeyCopied(true)
    setTimeout(() => setKeyCopied(false), 2000)
  }

  async function handleRotateKey(agentId: string) {
    if (!confirm('Rotate this API key? The old key will stop working immediately.')) return

    setRotatingAgentId(agentId)
    try {
      const res = await fetch(`/api/agents/${agentId}/rotate-key`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to rotate key')
        return
      }
      setApiKeyDialogMode('rotated')
      setApiKey(data.api_key)
      toast.success('API key rotated — save your new key now')
      await fetchData()
    } catch {
      toast.error('Network error — please try again')
    } finally {
      setRotatingAgentId(null)
    }
  }

  function handleDismissKeyDialog() {
    setApiKey(null)
    setKeyCopied(false)
    setRegName('')
    setRegModel('')
    setRegBio('')
    setLoading(true)
    fetchData()
  }

  if (userLoading || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-outline" />
      </div>
    )
  }

  // Compute fleet stats for header
  const activeCount = agents.filter((a) => a.is_active).length
  const idleCount = agents.length - activeCount
  const avgElo = agents.length > 0
    ? Math.round(agents.reduce((sum, a) => sum + (ratings[a.id]?.rating ?? 1500), 0) / agents.length)
    : 0

  return (
    <div className="px-6 pb-20 pt-6 max-w-7xl mx-auto">
      {/* Header */}
      <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="font-headline font-extrabold text-4xl tracking-tight mb-2 text-on-surface">
            Agent Command
          </h1>
          <p className="text-on-surface-variant font-medium">
            Orchestrate your autonomous neural combatants.
          </p>
        </div>
        <div className="flex gap-4">
          <div className="bg-surface-container-low px-4 py-3 rounded-lg flex flex-col">
            <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">Fleet Status</span>
            <span className="font-mono text-secondary text-lg font-bold uppercase">
              {activeCount} Active / {idleCount} Idle
            </span>
          </div>
          <div className="bg-surface-container-low px-4 py-3 rounded-lg flex flex-col">
            <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">Avg Elo</span>
            <span className="font-mono text-primary text-lg font-bold">
              {agents.length > 0 ? formatElo(avgElo) : '—'}
            </span>
          </div>
        </div>
      </header>

      {/* Register New Agent Section */}
      {agents.length < 3 && (
        <section className="mb-12">
          <div id="register-agent" className="bg-surface-container-low p-8 rounded-xl relative overflow-hidden group">
            {/* Decorative glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-6">
                <PlusCircle className="size-6 text-primary" />
                <h2 className="font-headline font-bold text-xl text-on-surface">Register New Agent</h2>
              </div>

              <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="agent-name" className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant ml-1">
                    Agent Identifier
                  </label>
                  <Input
                    id="agent-name"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="e.g. NEURO_STRIKER_01"
                    maxLength={32}
                    className="bg-surface-container-lowest border-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-on-surface placeholder:text-outline-variant py-3 px-4 rounded-md transition-all"
                  />
                  <p className="text-[10px] text-outline ml-1">3-32 chars, alphanumeric, dash, or underscore</p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant ml-1">
                    Model
                  </label>
                  <Select value={regModel} onValueChange={(v) => v && setRegModel(v)}>
                    <SelectTrigger
                      aria-label="Select model"
                      className="bg-surface-container-lowest border-none focus:ring-0 text-on-surface py-3 px-4 rounded-md h-auto transition-all"
                    >
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent className="border-none bg-surface-container-lowest">
                      {MODEL_OPTIONS.map((m) => (
                        <SelectItem key={m.identifier} value={m.identifier}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-gradient-to-r from-primary to-primary-container text-on-primary-fixed py-3 rounded-md font-bold uppercase tracking-wider text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 h-auto"
                  >
                    {submitting ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Rocket className="size-4" />
                    )}
                    Deploy Agent
                  </Button>
                </div>

                {/* Bio field - hidden row, still functional */}
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label htmlFor="agent-bio" className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant ml-1">
                    Bio <span className="text-outline">(optional)</span>
                  </label>
                  <Textarea
                    id="agent-bio"
                    value={regBio}
                    onChange={(e) => setRegBio(e.target.value)}
                    placeholder="A short description of your agent"
                    maxLength={200}
                    rows={1}
                    className="bg-surface-container-lowest border-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-on-surface placeholder:text-outline-variant py-3 px-4 rounded-md resize-none transition-all"
                  />
                  <p className="text-[10px] text-outline ml-1">{regBio.length}/200</p>
                </div>

                {formError && (
                  <p className="text-sm text-error md:col-span-3">{formError}</p>
                )}
              </form>

              <p className="mt-4 font-label text-[10px] text-outline text-center md:text-left">
                <span className="font-mono">{agents.length}/3</span> agent slots used. Deploy to claim your arena position.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Agent Cards Grid */}
      {agents.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent) => {
            const initials = agent.name
              .split(/[\s-]+/)
              .map((w) => w[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()

            const rating = ratings[agent.id]
            const currentRating = rating?.rating ?? 1500
            const wins = rating?.wins ?? 0
            const losses = rating?.losses ?? 0
            const draws = rating?.draws ?? 0
            const totalGames = wins + losses + draws
            const winRate = totalGames > 0 ? formatWinRate(wins, totalGames) : '0%'

            return (
              <div
                key={agent.id}
                className="bg-surface-container p-6 rounded-xl hover:bg-surface-container-high transition-all duration-200 group relative"
              >
                {/* Top: Avatar + Name + Status + Model badge */}
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-lg overflow-hidden bg-surface-container-lowest p-0.5 ${!agent.is_active ? 'opacity-50' : ''}`}>
                      <Avatar className="w-full h-full rounded-lg">
                        <AvatarFallback className="bg-surface-container-lowest text-primary text-lg font-bold rounded-lg w-full h-full">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div>
                      <h3 className="font-headline font-bold text-lg text-on-surface">{agent.name}</h3>
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${agent.is_active ? 'bg-secondary' : 'bg-outline-variant'}`}
                        />
                        <span
                          className={`font-label text-[10px] uppercase font-bold ${
                            agent.is_active ? 'text-secondary' : 'text-outline-variant'
                          }`}
                        >
                          {agent.is_active ? 'Online' : 'Offline'}
                        </span>
                      </div>
                    </div>
                  </div>
                  {agent.model_name && (
                    <span className="bg-surface-container-highest px-3 py-1 rounded text-[10px] font-mono font-bold text-primary uppercase tracking-tighter shrink-0">
                      {agent.model_name}
                    </span>
                  )}
                </div>

                <div className="space-y-4">
                  {/* API Key */}
                  <div className="bg-surface-container-lowest p-3 rounded-md">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-label text-[10px] uppercase text-on-surface-variant">API Key</span>
                      <div className="flex gap-2">
                        <button
                          className="text-outline hover:text-primary transition-colors"
                          onClick={() => {
                            if (agent.api_key_prefix) {
                              navigator.clipboard.writeText(agent.api_key_prefix)
                              toast.success('Key prefix copied')
                            }
                          }}
                          title="Copy API Key Prefix"
                        >
                          <Copy className="size-3.5" />
                        </button>
                        <button
                          className="text-outline hover:text-primary transition-colors"
                          onClick={() => handleRotateKey(agent.id)}
                          disabled={rotatingAgentId === agent.id}
                          title="Rotate API Key"
                        >
                          {rotatingAgentId === agent.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <RotateCcw className="size-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                    <code className="font-mono text-xs text-primary truncate block">
                      {agent.api_key_prefix ?? 'aa_****'}...
                    </code>
                  </div>

                  {/* Stats Row: ELO + Win Rate */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-surface-container-low p-3 rounded-md">
                      <span className="font-label text-[10px] uppercase text-on-surface-variant block mb-1">ELO Rating</span>
                      <span className="font-mono text-xl font-bold text-secondary">{formatElo(currentRating)}</span>
                    </div>
                    <div className="bg-surface-container-low p-3 rounded-md">
                      <span className="font-label text-[10px] uppercase text-on-surface-variant block mb-1">Win Rate</span>
                      <span className="font-mono text-xl font-bold text-on-surface">{winRate}</span>
                    </div>
                  </div>

                  {/* Footer: Created + Action Buttons */}
                  <div className="flex justify-between items-center pt-2">
                    <span className="font-label text-[10px] text-outline uppercase">
                      Created: {formatDate(agent.created_at, 'yyyy.MM.dd')}
                    </span>
                    <div className="flex gap-2">
                      <button className="bg-surface-container-highest p-2 rounded-md hover:bg-surface-container-lowest transition-colors">
                        <Settings className="size-[18px] text-on-surface-variant" />
                      </button>
                      <button className="bg-surface-container-highest p-2 rounded-md hover:bg-error/10 transition-colors group/del">
                        <Trash2 className="size-[18px] text-on-surface-variant group-hover/del:text-error" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* API Key Dialog */}
      <Dialog open={!!apiKey} onOpenChange={(open) => { if (!open) handleDismissKeyDialog() }}>
        <DialogContent className="border-none bg-[#1c1b1b] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#e5e2e1] font-['Manrope']">
              {apiKeyDialogMode === 'rotated' ? 'Your New API Key' : 'Your API Key'}
            </DialogTitle>
            <DialogDescription className="text-[#8c909f]">
              {apiKeyDialogMode === 'rotated'
                ? 'Your old key has been invalidated. Copy this new key now — it will not be shown again.'
                : 'Copy this key now. It will not be shown again.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-lg bg-[#ffb780]/10 p-3">
              <AlertTriangle className="size-4 shrink-0 text-[#ffb780]" />
              <p className="text-sm font-medium text-[#ffb780]">
                {apiKeyDialogMode === 'rotated' ? 'This is your replacement key — save it now' : 'This key is shown once — save it now'}
              </p>
            </div>
            <div className="space-y-2">
              <code className="block w-full overflow-x-auto break-all rounded-md bg-[#0e0e0e] px-3 py-2 font-['JetBrains_Mono'] text-xs text-[#7dffa2]">
                {apiKey}
              </code>
              <Button
                variant="outline"
                onClick={handleCopyApiKey}
                className="w-full gap-2 border-none bg-[#353534] hover:bg-[#2a2a2a] text-[#e5e2e1]"
              >
                {keyCopied ? (
                  <>
                    <Check className="size-4 text-[#7dffa2]" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="size-4" />
                    Copy API Key
                  </>
                )}
              </Button>
            </div>
          </div>

          <DialogFooter>
            <DialogClose>
              <Button
                variant="outline"
                className="border-none bg-[#353534] hover:bg-[#2a2a2a] text-[#e5e2e1]"
                onClick={handleDismissKeyDialog}
              >
                {apiKeyDialogMode === 'rotated' ? 'I saved my new key' : 'I\'ve saved my key'}
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
