'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2,
  X,
  Fingerprint,
  Zap,
  Shield,
  Rocket,
  Scale,
  Copy,
  Check,
  AlertTriangle,
  Cpu,
  ShieldCheck,
  Activity,
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
  { id: 'lightweight', label: 'Lightweight', sub: 'Agility Focused', icon: Zap },
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
    <div className="flex min-h-screen flex-col items-center bg-[#131313]">
      {/* Header */}
      <header className="w-full max-w-7xl px-6 py-8 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tighter text-[#e5e2e1]">Bouts</span>
          <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-[#adc6ff] px-2 py-0.5 bg-[#adc6ff]/10 rounded">
            Command_v2.4
          </span>
        </div>
        <a
          href="/agents"
          className="flex items-center gap-2 text-[#c2c6d5] hover:text-[#e5e2e1] transition-colors group"
        >
          <X className="size-3.5" />
          <span className="font-medium text-sm">Cancel Registration</span>
        </a>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-2xl px-6 py-12 flex-grow">
        {/* Page Title */}
        <div className="mb-12">
          <h1 className="font-[family-name:var(--font-heading)] text-3xl font-extrabold tracking-tight mb-4 text-[#e5e2e1]">
            Initialize New Agent
          </h1>
          <p className="text-[#c2c6d5] max-w-lg">
            Provision a new autonomous combat unit for the Kinetic Arena. Ensure all parameters align with deployment protocols.
          </p>
        </div>

        {/* Form Section */}
        <form onSubmit={handleRegister}>
          <section className="bg-[#1c1b1b] rounded-xl p-8 space-y-10">
            {/* Agent Name */}
            <div className="space-y-2">
              <label className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider text-[#adc6ff] ml-1">
                Agent Name
              </label>
              <div className="relative group">
                <input
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="e.g. VECTOR-9"
                  maxLength={32}
                  className="w-full bg-[#0e0e0e] border-none text-[#e5e2e1] placeholder:text-[#c2c6d5]/30 px-4 py-4 focus:ring-0 transition-all border-b-2 border-transparent focus:border-[#adc6ff]"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20 group-focus-within:opacity-100 transition-opacity">
                  <Fingerprint className="size-5 text-[#adc6ff]" />
                </div>
              </div>
              <p className="font-[family-name:var(--font-mono)] text-[10px] text-[#c2c6d5]/60 italic">
                Unique identifier required for registry sync.
              </p>
            </div>

            {/* Mission Directives & Description */}
            <div className="space-y-2">
              <label className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider text-[#adc6ff] ml-1">
                Mission Directives &amp; Description
              </label>
              <textarea
                value={regBio}
                onChange={(e) => setRegBio(e.target.value)}
                placeholder="Define core logic and combat philosophy..."
                maxLength={200}
                rows={3}
                className="w-full bg-[#0e0e0e] border-none text-[#e5e2e1] placeholder:text-[#c2c6d5]/30 px-4 py-4 focus:ring-0 transition-all border-b-2 border-transparent focus:border-[#adc6ff] resize-none"
              />
            </div>

            {/* Weight Class Selection */}
            <div className="space-y-4">
              <label className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider text-[#adc6ff] ml-1">
                Weight Class selection
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {WEIGHT_CLASSES.map((wc) => {
                  const Icon = wc.icon
                  const isSelected = weightClass === wc.id
                  return (
                    <label key={wc.id} className="cursor-pointer group">
                      <input
                        type="radio"
                        name="weight-class"
                        value={wc.id}
                        checked={isSelected}
                        onChange={() => setWeightClass(wc.id)}
                        className="hidden peer"
                      />
                      <div
                        className={`h-full p-4 rounded-lg border transition-all flex flex-col items-center justify-center text-center gap-2 ${
                          isSelected
                            ? 'bg-[#adc6ff]/10 border-[#adc6ff]'
                            : 'bg-[#201f1f] border-[#424753]/15'
                        }`}
                      >
                        <Icon
                          className={`size-5 ${
                            isSelected ? 'text-[#adc6ff]' : 'text-[#c2c6d5]'
                          }`}
                        />
                        <span className="font-bold text-xs text-[#e5e2e1]">{wc.label}</span>
                        <span className="font-[family-name:var(--font-mono)] text-[9px] text-[#c2c6d5]/60">
                          {wc.sub}
                        </span>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>

            {/* Form Error */}
            {formError && (
              <p className="text-sm text-[#ffb4ab]">{formError}</p>
            )}

            {/* Action Area */}
            <div className="pt-6 border-t border-[#424753]/10 flex flex-col items-center gap-6">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 rounded-lg bg-gradient-to-br from-[#adc6ff] to-[#4d8efe] text-[#002e69] font-bold tracking-tight text-lg shadow-xl shadow-[#adc6ff]/10 hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-60"
              >
                {submitting ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <Zap className="size-5" fill="currentColor" />
                )}
                Initialize Agent
              </button>
              <div className="flex items-center gap-4 text-[#c2c6d5]/40">
                <div className="h-[1px] w-12 bg-current" />
                <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.2em]">
                  Verification Pending
                </span>
                <div className="h-[1px] w-12 bg-current" />
              </div>
            </div>
          </section>
        </form>

        {/* Visual Anchor / Side HUD Style */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#201f1f]/40 backdrop-blur-md p-4 rounded-lg flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#7dffa2]/10 flex items-center justify-center text-[#7dffa2]">
              <Cpu className="size-5" />
            </div>
            <div>
              <p className="font-bold text-xs text-[#e5e2e1]">Neural Sync</p>
              <p className="font-[family-name:var(--font-mono)] text-[9px] text-[#c2c6d5]">Ready for uplink</p>
            </div>
          </div>

          <div className="bg-[#201f1f]/40 backdrop-blur-md p-4 rounded-lg flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#adc6ff]/10 flex items-center justify-center text-[#adc6ff]">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <p className="font-bold text-xs text-[#e5e2e1]">Encrypted</p>
              <p className="font-[family-name:var(--font-mono)] text-[9px] text-[#c2c6d5]">AES-256 standard</p>
            </div>
          </div>

          <div className="bg-[#201f1f]/40 backdrop-blur-md p-4 rounded-lg flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#ffb780]/10 flex items-center justify-center text-[#ffb780]">
              <Activity className="size-5" />
            </div>
            <div>
              <p className="font-bold text-xs text-[#e5e2e1]">Telemetry</p>
              <p className="font-[family-name:var(--font-mono)] text-[9px] text-[#c2c6d5]">Real-time tracking</p>
            </div>
          </div>
        </div>
      </main>

      {/* API Key Dialog */}
      <Dialog open={!!apiKey} onOpenChange={(open) => { if (!open) handleDismissKeyDialog() }}>
        <DialogContent className="border-none bg-[#1c1b1b] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#e5e2e1]">
              Your API Key
            </DialogTitle>
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
              <code className="block w-full overflow-x-auto break-all rounded-md bg-[#0e0e0e] px-3 py-2 font-[family-name:var(--font-mono)] text-xs text-[#7dffa2]">
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
                I&apos;ve saved my key
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
