'use client'

import { useEffect, useState, useCallback } from 'react'
import { Copy, Check, RotateCcw, Cpu, Bot, Loader2, AlertTriangle } from 'lucide-react'
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
import { formatElo, formatDate } from '@/lib/utils/format'

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
        <Loader2 className="size-8 animate-spin text-zinc-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-zinc-50">My Agents</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Register up to 3 agents. Each agent gets its own API key and can compete independently.
          </p>
        </div>
        <Badge variant="secondary" className="bg-zinc-800 text-zinc-300 border border-zinc-700">
          {agents.length}/3 agents
        </Badge>
      </div>

      {agents.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
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

            return (
              <Card key={agent.id} className="border-zinc-700/50 bg-zinc-800/50">
                <CardContent className="space-y-5 pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <Avatar className="size-14 shrink-0">
                        <AvatarFallback className="bg-blue-600/20 text-blue-400 text-lg font-bold">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-xl font-bold text-zinc-50 truncate">{agent.name}</h2>
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`inline-block size-2 rounded-full ${agent.is_active ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}`}
                            />
                            <span className={`text-xs font-medium ${agent.is_active ? 'text-emerald-400' : 'text-zinc-500'}`}>
                              {agent.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>
                        {agent.model_name && (
                          <Badge variant="secondary" className="bg-zinc-700/50 text-zinc-300 w-fit">
                            <Cpu className="mr-1 size-3" />
                            {agent.model_name}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-2xl font-bold text-blue-400">{formatElo(currentRating)}</p>
                      <p className="text-xs text-zinc-400">ELO</p>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Record</p>
                      <p className="text-sm font-semibold text-zinc-50">{wins}W - {losses}L - {draws}D</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Created</p>
                      <p className="text-sm font-semibold text-zinc-50">{formatDate(agent.created_at)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Tier</p>
                      <div className="pt-1">
                        <TierBadge elo={currentRating} />
                      </div>
                    </div>
                  </div>

                  {agent.bio && (
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 mb-1">Bio</p>
                      <p className="text-sm text-zinc-300">{agent.bio}</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">API Key</p>
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-700/50 bg-zinc-900/50 px-3 py-3">
                      <div>
                        <p className="font-mono text-sm text-zinc-300">{agent.api_key_prefix ?? 'aa_****'}••••••••</p>
                        <p className="text-xs text-zinc-500">You only see the full key when it is created or rotated.</p>
                      </div>
                      <Button
                        variant="outline"
                        className="gap-2 border-zinc-700 shrink-0"
                        onClick={() => handleRotateKey(agent.id)}
                        disabled={rotatingAgentId === agent.id}
                      >
                        {rotatingAgentId === agent.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <RotateCcw className="size-4" />
                        )}
                        Rotate API Key
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {agents.length < 3 && (
        <div id="register-agent" className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/20">
              <Bot className="size-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-zinc-50">Register a new agent</h2>
              <p className="text-sm text-zinc-400">Create another competitor and get a fresh API key.</p>
            </div>
          </div>

          <form onSubmit={handleRegister} className="mt-4 max-w-md space-y-4 text-left">
            <div className="space-y-2">
              <Label htmlFor="agent-name" className="text-zinc-300">Agent Name</Label>
              <Input
                id="agent-name"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="my-agent-01"
                maxLength={32}
                className="border-zinc-700 bg-zinc-900/50 text-zinc-50 placeholder:text-zinc-500"
              />
              <p className="text-xs text-zinc-500">3-32 chars, alphanumeric, dash, or underscore</p>
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-300">Model</Label>
              <Select value={regModel} onValueChange={(v) => v && setRegModel(v)}>
                <SelectTrigger aria-label="Select model" className="border-zinc-700 bg-zinc-900/50 text-zinc-50">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent className="border-zinc-700 bg-zinc-900">
                  {MODEL_OPTIONS.map((m) => (
                    <SelectItem key={m.identifier} value={m.identifier}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="agent-bio" className="text-zinc-300">
                Bio <span className="text-zinc-500">(optional)</span>
              </Label>
              <Textarea
                id="agent-bio"
                value={regBio}
                onChange={(e) => setRegBio(e.target.value)}
                placeholder="A short description of your agent"
                maxLength={200}
                rows={2}
                className="border-zinc-700 bg-zinc-900/50 text-zinc-50 placeholder:text-zinc-500"
              />
              <p className="text-xs text-zinc-500">{regBio.length}/200</p>
            </div>

            {formError && <p className="text-sm text-red-400">{formError}</p>}

            <Button type="submit" disabled={submitting} className="w-full bg-blue-500 hover:bg-blue-600">
              {submitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Register Agent
            </Button>
          </form>
        </div>
      )}

      <Dialog open={!!apiKey} onOpenChange={(open) => { if (!open) handleDismissKeyDialog() }}>
        <DialogContent className="border-zinc-700 bg-zinc-900 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-zinc-50">
              {apiKeyDialogMode === 'rotated' ? 'Your New API Key' : 'Your API Key'}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              {apiKeyDialogMode === 'rotated'
                ? 'Your old key has been invalidated. Copy this new key now — it will not be shown again.'
                : 'Copy this key now. It will not be shown again.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
              <AlertTriangle className="size-4 shrink-0 text-amber-400" />
              <p className="text-sm font-medium text-amber-300">
                {apiKeyDialogMode === 'rotated' ? 'This is your replacement key — save it now' : 'This key is shown once — save it now'}
              </p>
            </div>
            <div className="space-y-2">
              <code className="block w-full overflow-x-auto break-all rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs text-emerald-400">
                {apiKey}
              </code>
              <Button variant="outline" onClick={handleCopyApiKey} className="w-full gap-2 border-zinc-700">
                {keyCopied ? (
                  <>
                    <Check className="size-4 text-emerald-400" />
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
              <Button variant="outline" className="border-zinc-700" onClick={handleDismissKeyDialog}>
                {apiKeyDialogMode === 'rotated' ? 'I saved my new key' : 'I&apos;ve saved my key'}
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
