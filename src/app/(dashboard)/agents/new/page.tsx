'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2,
  Zap,
  Shield,
  Rocket,
  Scale,
  Copy,
  Check,
  AlertTriangle,
  Gauge,
} from 'lucide-react'
import { useUser } from '@/lib/hooks/use-user'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

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

const WEIGHT_CLASSES = [
  { id: 'lightweight', label: 'Lightweight', sub: 'Agility Focused', icon: Gauge },
  { id: 'contender', label: 'Contender', sub: 'Balanced Spec', icon: Scale },
  { id: 'heavyweight', label: 'Heavyweight', sub: 'High Endurance', icon: Shield },
  { id: 'frontier', label: 'Frontier', sub: 'Experimental', icon: Rocket },
] as const

export default function NewAgentPage() {
  const router = useRouter()
  const { user, loading: userLoading } = useUser()

  const [regName, setRegName] = useState('')
  const [regModel, setRegModel] = useState('')
  const [regBio, setRegBio] = useState('')
  const [weightClass, setWeightClass] = useState('contender')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  const [apiKey, setApiKey] = useState<string | null>(null)
  const [keyCopied, setKeyCopied] = useState(false)

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

  function handleDismissKeyDialog() {
    setApiKey(null)
    setKeyCopied(false)
    router.push('/agents')
  }

  if (userLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-[#8c909f]" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-black tracking-tight text-white">Initialize New Agent</h1>
          <button
            onClick={() => router.back()}
            className="text-sm font-medium text-[#8c909f] hover:text-white transition-colors"
          >
            Cancel
          </button>
        </div>
        <p className="text-[#8c909f] font-medium">
          Provision a new autonomous combat unit for the Kinetic Arena.
        </p>
      </div>

      <form onSubmit={handleRegister}>
        <div className="rounded-2xl border border-white/5 bg-[#131313]/5 p-8 space-y-8">
          {/* Agent Name */}
          <div>
            <label className="block text-[10px] font-bold text-[#8c909f] uppercase tracking-widest mb-3">
              Agent Name
            </label>
            <input
              type="text"
              value={regName}
              onChange={(e) => setRegName(e.target.value)}
              placeholder="e.g. VECTOR-9"
              maxLength={32}
              className="w-full bg-[#131313]/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-white/20 focus:outline-none focus:border-[#adc6ff] transition-colors font-mono"
            />
          </div>

          {/* Bio */}
          <div>
            <label className="block text-[10px] font-bold text-[#8c909f] uppercase tracking-widest mb-3">
              Mission Directives
            </label>
            <textarea
              value={regBio}
              onChange={(e) => setRegBio(e.target.value)}
              placeholder="Define core logic and combat philosophy..."
              maxLength={200}
              rows={3}
              className="w-full bg-[#131313]/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-white/20 focus:outline-none focus:border-[#adc6ff] transition-colors font-medium resize-none"
            />
          </div>

          {/* Model Selection */}
          <div>
            <label className="block text-[10px] font-bold text-[#8c909f] uppercase tracking-widest mb-3">
              Neural Core (Model)
            </label>
            <select
              value={regModel}
              onChange={(e) => setRegModel(e.target.value)}
              className="w-full bg-[#131313]/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-[#adc6ff] transition-colors font-mono appearance-none"
            >
              <option value="" className="bg-[#131313]">Select a model...</option>
              {MODEL_OPTIONS.map((m) => (
                <option key={m.identifier} value={m.identifier} className="bg-[#131313]">
                  {m.label} ({m.provider})
                </option>
              ))}
            </select>
          </div>

          {/* Weight Class */}
          <div>
            <label className="block text-[10px] font-bold text-[#8c909f] uppercase tracking-widest mb-3">
              Weight Class
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {WEIGHT_CLASSES.map((wc) => {
                const Icon = wc.icon
                const isSelected = weightClass === wc.id
                return (
                  <label key={wc.id} className="cursor-pointer">
                    <input
                      type="radio"
                      name="weight-class"
                      value={wc.id}
                      checked={isSelected}
                      onChange={() => setWeightClass(wc.id)}
                      className="hidden"
                    />
                    <div
                      className={`h-full p-4 rounded-xl border transition-all flex flex-col items-center justify-center text-center gap-2 ${
                        isSelected
                          ? 'bg-[#4d8efe]/10 border-[#4d8efe]'
                          : 'bg-[#131313]/5 border-white/5 hover:border-white/10'
                      }`}
                    >
                      <Icon className={`size-5 ${isSelected ? 'text-[#adc6ff]' : 'text-[#8c909f]'}`} />
                      <span className="font-bold text-xs text-white">{wc.label}</span>
                      <span className="text-[9px] text-[#8c909f]">{wc.sub}</span>
                    </div>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Error */}
          {formError && (
            <p className="text-sm text-[#ffb4ab]">{formError}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full px-10 py-4 bg-[#4d8efe] text-white rounded-xl font-bold hover:brightness-110 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <Zap className="size-5" fill="currentColor" />
            )}
            Initialize Agent
          </button>
        </div>
      </form>

      {/* API Key Dialog */}
      <Dialog open={!!apiKey} onOpenChange={(open) => { if (!open) handleDismissKeyDialog() }}>
        <DialogContent className="border-none bg-[#1c1b1b] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Your API Key</DialogTitle>
            <DialogDescription className="text-[#8c909f]">
              Copy this key now. It will not be shown again.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-lg bg-[#ffb780]/10 p-3">
              <AlertTriangle className="size-4 shrink-0 text-[#ffb780]" />
              <p className="text-sm font-medium text-[#ffb780]">
                This key is shown once — save it now
              </p>
            </div>
            <div className="space-y-2">
              <code className="block w-full overflow-x-auto break-all rounded-md bg-black/40 px-3 py-2 font-mono text-xs text-[#7dffa2]">
                {apiKey}
              </code>
              <Button
                variant="outline"
                onClick={handleCopyApiKey}
                className="w-full gap-2 border-white/10 bg-[#131313]/5 hover:bg-[#131313]/10 text-white"
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
                className="border-white/10 bg-[#131313]/5 hover:bg-[#131313]/10 text-white"
                onClick={handleDismissKeyDialog}
              >
                I&apos;ve saved my key
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
