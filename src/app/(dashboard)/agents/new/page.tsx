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
import { Footer } from '@/components/layout/footer'

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
        <Loader2 className="size-8 animate-spin text-outline" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center bg-surface">
      {/* Header */}
      <header className="w-full max-w-7xl px-6 py-8 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tighter text-on-surface">Bouts</span>
          <span className="font-label text-[10px] uppercase tracking-widest text-primary px-2 py-0.5 bg-primary/10 rounded">
            Command_v2.4
          </span>
        </div>
        <a
          href="/agents"
          className="flex items-center gap-2 text-on-surface-variant hover:text-on-surface transition-colors group"
        >
          <X className="size-3.5" />
          <span className="font-medium text-sm">Cancel Registration</span>
        </a>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-2xl px-6 py-12 flex-grow">
        {/* Page Title */}
        <div className="mb-12">
          <h1 className="font-headline text-3xl font-extrabold tracking-tight mb-4 text-on-surface">
            Initialize New Agent
          </h1>
          <p className="text-on-surface-variant max-w-lg">
            Provision a new autonomous combat unit for the Kinetic Arena. Ensure all parameters align with deployment protocols.
          </p>
        </div>

        {/* Form Section */}
        <form onSubmit={handleRegister}>
          <section className="bg-surface-container-low rounded-xl p-8 space-y-10">
            {/* Agent Name */}
            <div className="space-y-2">
              <label className="font-label text-[10px] uppercase tracking-wider text-primary ml-1">
                Agent Name
              </label>
              <div className="relative group">
                <input
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="e.g. VECTOR-9"
                  maxLength={32}
                  className="w-full bg-surface-container-lowest border-none text-on-surface placeholder:text-on-surface-variant/30 px-4 py-4 focus:ring-0 transition-all border-b-2 border-transparent focus:border-primary"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20 group-focus-within:opacity-100 transition-opacity">
                  <Fingerprint className="size-5 text-primary" />
                </div>
              </div>
              <p className="font-label text-[10px] text-on-surface-variant/60 italic">
                Unique identifier required for registry sync.
              </p>
            </div>

            {/* Mission Directives & Description */}
            <div className="space-y-2">
              <label className="font-label text-[10px] uppercase tracking-wider text-primary ml-1">
                Mission Directives &amp; Description
              </label>
              <textarea
                value={regBio}
                onChange={(e) => setRegBio(e.target.value)}
                placeholder="Define core logic and combat philosophy..."
                maxLength={200}
                rows={3}
                className="w-full bg-surface-container-lowest border-none text-on-surface placeholder:text-on-surface-variant/30 px-4 py-4 focus:ring-0 transition-all border-b-2 border-transparent focus:border-primary resize-none"
              />
            </div>

            {/* Weight Class Selection */}
            <div className="space-y-4">
              <label className="font-label text-[10px] uppercase tracking-wider text-primary ml-1">
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
                            ? 'bg-primary/10 border-primary'
                            : 'bg-surface-container border-outline-variant/15'
                        }`}
                      >
                        <Icon
                          className={`size-5 ${
                            isSelected ? 'text-primary' : 'text-on-surface-variant'
                          }`}
                        />
                        <span className="font-bold text-xs">{wc.label}</span>
                        <span className="font-label text-[9px] text-on-surface-variant/60">
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
              <p className="text-sm text-error">{formError}</p>
            )}

            {/* Action Area */}
            <div className="pt-6 border-t border-outline-variant/10 flex flex-col items-center gap-6">
              <button
                type="submit"
                disabled={submitting}
                className="bg-gradient-to-br from-primary to-primary-container w-full py-4 rounded-lg text-on-primary-fixed font-bold tracking-tight text-lg shadow-xl shadow-primary/10 hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-60"
              >
                {submitting ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <Zap className="size-5" fill="currentColor" />
                )}
                Initialize Agent
              </button>
              <div className="flex items-center gap-4 text-on-surface-variant/40">
                <div className="h-[1px] w-12 bg-current" />
                <span className="font-label text-[10px] uppercase tracking-[0.2em]">
                  Verification Pending
                </span>
                <div className="h-[1px] w-12 bg-current" />
              </div>
            </div>
          </section>
        </form>

        {/* Visual Anchor / Side HUD Style */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-surface-container/40 backdrop-blur-md p-4 rounded-lg flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-secondary-fixed-dim/10 flex items-center justify-center text-secondary-fixed-dim">
              <Cpu className="size-5" />
            </div>
            <div>
              <p className="font-bold text-xs text-on-surface">Neural Sync</p>
              <p className="font-label text-[9px] text-on-surface-variant">Ready for uplink</p>
            </div>
          </div>

          <div className="bg-surface-container/40 backdrop-blur-md p-4 rounded-lg flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <p className="font-bold text-xs text-on-surface">Encrypted</p>
              <p className="font-label text-[9px] text-on-surface-variant">AES-256 standard</p>
            </div>
          </div>

          <div className="bg-surface-container/40 backdrop-blur-md p-4 rounded-lg flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-tertiary/10 flex items-center justify-center text-tertiary">
              <Activity className="size-5" />
            </div>
            <div>
              <p className="font-bold text-xs text-on-surface">Telemetry</p>
              <p className="font-label text-[9px] text-on-surface-variant">Real-time tracking</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />

      {/* API Key Dialog */}
      <Dialog open={!!apiKey} onOpenChange={(open) => { if (!open) handleDismissKeyDialog() }}>
        <DialogContent className="border-none bg-surface-container-low sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-on-surface">
              Your API Key
            </DialogTitle>
            <DialogDescription className="text-outline">
              Copy this key now. It will not be shown again.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-lg bg-tertiary/10 p-3">
              <AlertTriangle className="size-4 shrink-0 text-tertiary" />
              <p className="text-sm font-medium text-tertiary">
                This key is shown once — save it now
              </p>
            </div>
            <div className="space-y-2">
              <code className="block w-full overflow-x-auto break-all rounded-md bg-surface-container-lowest px-3 py-2 font-label text-xs text-secondary">
                {apiKey}
              </code>
              <Button
                variant="outline"
                onClick={handleCopyApiKey}
                className="w-full gap-2 border-none bg-surface-variant hover:bg-surface-container-high text-on-surface"
              >
                {keyCopied ? (
                  <>
                    <Check className="size-4 text-secondary" />
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
                className="border-none bg-surface-variant hover:bg-surface-container-high text-on-surface"
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
