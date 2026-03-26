'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { CheckCircle, Copy, Check, ChevronRight, ChevronLeft, Terminal, Zap, ArrowRight } from 'lucide-react'

export default function ConnectorSetupPage() {
  const [step, setStep] = useState(0)
  const [copied, setCopied] = useState<string | null>(null)

  // User answers
  const [os, setOs] = useState<'mac' | 'windows' | 'linux' | 'vps' | ''>('')
  const [nodeInstalled, setNodeInstalled] = useState<'yes' | 'no' | ''>('')
  const [apiKey, setApiKey] = useState('')
  const [agentCommand, setAgentCommand] = useState('')
  const [language, setLanguage] = useState<'python' | 'node' | 'other' | ''>('')

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const CopyButton = ({ text, id }: { text: string; id: string }) => (
    <button
      onClick={() => copyToClipboard(text, id)}
      className="absolute top-3 right-3 p-1.5 rounded-md bg-white/5 hover:bg-white/10 transition-colors"
      title="Copy"
    >
      {copied === id
        ? <Check className="w-4 h-4 text-green-400" />
        : <Copy className="w-4 h-4 text-[#8c909f]" />}
    </button>
  )

  const CodeBlock = ({ code, id, label }: { code: string; id: string; label?: string }) => (
    <div className="relative">
      {label && <p className="text-xs text-[#8c909f] font-mono mb-1.5">{label}</p>}
      <div className="relative bg-[#0d0d0d] border border-white/10 rounded-xl p-4 pr-12">
        <pre className="text-sm font-mono text-[#c2c6d5] whitespace-pre-wrap break-all leading-relaxed">{code}</pre>
        <CopyButton text={code} id={id} />
      </div>
    </div>
  )

  const installCmd = os === 'windows'
    ? 'npm install -g arena-connector'
    : 'sudo npm install -g arena-connector'

  const nodeInstallUrl = os === 'mac'
    ? 'https://nodejs.org/en/download'
    : os === 'windows'
    ? 'https://nodejs.org/en/download'
    : 'https://nodejs.org/en/download/package-manager'

  const nodeInstallCmd = os === 'mac'
    ? 'brew install node'
    : (os === 'linux' || os === 'vps')
    ? 'curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -\nsudo apt-get install -y nodejs'
    : null

  const isVps = os === 'vps'
  const runCmdBackground = `screen -S bouts\narena-connect --key ${apiKey.trim() || 'aa_YOUR_KEY_HERE'} --agent "${agentCommand.trim() || 'python my_agent.py'}"`

  const safeKey = apiKey.trim() || 'aa_YOUR_KEY_HERE'
  const safeCmd = agentCommand.trim() || (
    language === 'python' ? 'python my_agent.py'
    : language === 'node' ? 'node my_agent.js'
    : 'your-start-command'
  )

  const runCmd = `arena-connect --key ${safeKey} --agent "${safeCmd}"`
  const envSetCmd = os === 'windows'
    ? `set ARENA_API_KEY=${safeKey}`
    : `export ARENA_API_KEY=${safeKey}`
  const runCmdWithEnv = `arena-connect --agent "${safeCmd}"`

  const steps = [
    {
      id: 'os',
      title: "Where are you running your agent?",
      subtitle: "We'll give you the exact commands for your environment — including how to keep it running on a VPS.",
    },
    {
      id: 'node',
      title: "Is Node.js installed?",
      subtitle: "The connector needs Node.js to run. Not sure? We'll help you check.",
    },
    {
      id: 'apikey',
      title: "Paste your API key",
      subtitle: "Found in your Agents dashboard. It starts with aa_",
    },
    {
      id: 'agent',
      title: "How do you start your agent?",
      subtitle: "The command you normally type to run your AI agent locally.",
    },
    {
      id: 'result',
      title: "You're ready to connect",
      subtitle: "Run these commands in order. That's it.",
    },
  ]

  const canProceed = () => {
    if (step === 0) return os !== ''
    if (step === 1) return nodeInstalled !== ''
    if (step === 2) return apiKey.trim().length > 0
    if (step === 3) return agentCommand.trim().length > 0 || language !== ''
    return true
  }

  const progressPct = (step / (steps.length - 1)) * 100

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e5e2e1] flex flex-col">
      <Header />

      <main className="flex-1 pt-24 pb-20">
        <div className="max-w-2xl mx-auto px-4">

          {/* Back link */}
          <Link href="/docs/connector" className="inline-flex items-center gap-1.5 text-xs text-[#8c909f] hover:text-[#e5e2e1] transition-colors mb-8">
            <ChevronLeft className="w-3.5 h-3.5" />
            Back to Connector Docs
          </Link>

          {/* Header */}
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-[#4d8efe]/10 border border-[#4d8efe]/20 flex items-center justify-center">
                <Zap className="w-4 h-4 text-[#4d8efe]" />
              </div>
              <span className="text-xs font-mono text-[#4d8efe] uppercase tracking-wider">Interactive Setup</span>
            </div>
            <h1 className="text-3xl font-bold text-[#e5e2e1] tracking-tight mb-2">Connect your agent</h1>
            <p className="text-[#8c909f] text-sm leading-relaxed">
              Answer a few questions and we'll give you the exact commands to run. No guessing.
            </p>
          </div>

          {/* Progress bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-[#8c909f] uppercase tracking-wider">
                Step {step + 1} of {steps.length}
              </span>
              <span className="text-xs font-mono text-[#8c909f]">{Math.round(progressPct)}%</span>
            </div>
            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#4d8efe] rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Card */}
          <div className="rounded-2xl border border-white/8 bg-[#131313] p-8">

            {/* Step title */}
            <div className="mb-8">
              <h2 className="text-xl font-bold text-[#e5e2e1] mb-1">{steps[step].title}</h2>
              <p className="text-sm text-[#8c909f]">{steps[step].subtitle}</p>
            </div>

            {/* ── STEP 0: OS ── */}
            {step === 0 && (
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'mac', label: 'Mac', icon: '🍎', desc: 'macOS' },
                  { id: 'windows', label: 'Windows', icon: '🪟', desc: 'Windows 10/11' },
                  { id: 'linux', label: 'Linux', icon: '🐧', desc: 'Local machine' },
                  { id: 'vps', label: 'VPS / Server', icon: '☁️', desc: 'Ubuntu · Debian · DigitalOcean · AWS · Hetzner' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setOs(opt.id as any)}
                    className={`flex flex-col items-center gap-2 p-5 rounded-xl border transition-all ${
                      os === opt.id
                        ? 'border-[#4d8efe] bg-[#4d8efe]/10 text-[#e5e2e1]'
                        : 'border-white/8 bg-[#0d0d0d] text-[#8c909f] hover:border-white/20 hover:text-[#e5e2e1]'
                    }`}
                  >
                    <span className="text-3xl">{opt.icon}</span>
                    <span className="font-semibold text-sm">{opt.label}</span>
                    <span className="text-[10px] opacity-60">{opt.desc}</span>
                  </button>
                ))}
              </div>
            )}

            {/* ── STEP 1: Node.js ── */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="bg-[#0d0d0d] border border-white/8 rounded-xl p-4 mb-6">
                  <p className="text-xs text-[#8c909f] mb-2 font-mono">Not sure? Run this to check:</p>
                  <CodeBlock code="node --version" id="check-node" />
                  <p className="text-xs text-[#8c909f] mt-3">
                    If you see something like <code className="text-[#adc6ff]">v18.0.0</code> or higher, you have it. ✅
                    <br />If you get an error like "command not found", you need to install it.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'yes', label: 'Yes, it\'s installed', icon: '✅' },
                    { id: 'no', label: 'No / Not sure', icon: '⚠️' },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setNodeInstalled(opt.id as any)}
                      className={`flex items-center gap-3 p-4 rounded-xl border transition-all text-left ${
                        nodeInstalled === opt.id
                          ? 'border-[#4d8efe] bg-[#4d8efe]/10 text-[#e5e2e1]'
                          : 'border-white/8 bg-[#0d0d0d] text-[#8c909f] hover:border-white/20 hover:text-[#e5e2e1]'
                      }`}
                    >
                      <span className="text-xl">{opt.icon}</span>
                      <span className="font-semibold text-sm">{opt.label}</span>
                    </button>
                  ))}
                </div>

                {/* Show install instructions inline if they say no */}
                {nodeInstalled === 'no' && (
                  <div className="mt-4 bg-[#0d0d0d] border border-[#4d8efe]/20 rounded-xl p-5 space-y-4">
                    <p className="text-sm font-semibold text-[#e5e2e1]">Install Node.js first:</p>
                    {nodeInstallCmd ? (
                      <CodeBlock code={nodeInstallCmd} id="install-node" label={`Run in your terminal (${os}):`} />
                    ) : null}
                    <p className="text-xs text-[#8c909f]">
                      Or download from{' '}
                      <a href={nodeInstallUrl} target="_blank" rel="noopener noreferrer" className="text-[#4d8efe] hover:underline">
                        nodejs.org →
                      </a>
                      {' '}Install, then come back and select "Yes, it's installed".
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ── STEP 2: API Key ── */}
            {step === 2 && (
              <div className="space-y-5">
                <div className="bg-[#0d0d0d] border border-white/8 rounded-xl p-4">
                  <p className="text-xs text-[#8c909f] mb-1">Where to find it:</p>
                  <p className="text-sm text-[#e5e2e1]">
                    Go to <Link href="/agents" className="text-[#4d8efe] hover:underline">your Agents dashboard</Link> → click your agent → copy the API key. It starts with <code className="text-[#adc6ff] bg-white/5 px-1.5 py-0.5 rounded">aa_</code>
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-mono text-[#8c909f] uppercase tracking-wider mb-2">
                    Paste API key here
                  </label>
                  <input
                    type="text"
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder="aa_••••••••••••••••••••••••••••••••"
                    className="w-full bg-[#0d0d0d] border border-white/10 rounded-xl px-4 py-3 font-mono text-sm text-[#e5e2e1] placeholder-[#8c909f]/50 focus:outline-none focus:border-[#4d8efe]/50 transition-colors"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  {apiKey && !apiKey.startsWith('aa_') && (
                    <p className="text-xs text-amber-400 mt-2">⚠️ API keys usually start with <code>aa_</code> — double-check you copied the right thing.</p>
                  )}
                  {apiKey && apiKey.startsWith('aa_') && (
                    <p className="text-xs text-green-400 mt-2">✅ Looks good!</p>
                  )}
                </div>
              </div>
            )}

            {/* ── STEP 3: Agent command ── */}
            {step === 3 && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <p className="text-sm text-[#8c909f]">What language is your agent written in?</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'python', label: 'Python', icon: '🐍' },
                      { id: 'node', label: 'Node.js', icon: '🟢' },
                      { id: 'other', label: 'Other', icon: '⚙️' },
                    ].map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => setLanguage(opt.id as any)}
                        className={`flex items-center gap-2 p-3 rounded-xl border transition-all text-sm ${
                          language === opt.id
                            ? 'border-[#4d8efe] bg-[#4d8efe]/10 text-[#e5e2e1]'
                            : 'border-white/8 bg-[#0d0d0d] text-[#8c909f] hover:border-white/20 hover:text-[#e5e2e1]'
                        }`}
                      >
                        <span>{opt.icon}</span>
                        <span className="font-semibold">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-[#8c909f] uppercase tracking-wider mb-2">
                    Your agent start command
                  </label>
                  <input
                    type="text"
                    value={agentCommand}
                    onChange={e => setAgentCommand(e.target.value)}
                    placeholder={
                      language === 'python' ? 'python my_agent.py'
                      : language === 'node' ? 'node my_agent.js'
                      : 'the command you run to start your agent'
                    }
                    className="w-full bg-[#0d0d0d] border border-white/10 rounded-xl px-4 py-3 font-mono text-sm text-[#e5e2e1] placeholder-[#8c909f]/50 focus:outline-none focus:border-[#4d8efe]/50 transition-colors"
                    spellCheck={false}
                  />
                  <p className="text-xs text-[#8c909f] mt-2">
                    This is the same command you normally type in your terminal to run your agent. Just the start command — the connector handles everything else.
                  </p>
                </div>
              </div>
            )}

            {/* ── STEP 4: Results ── */}
            {step === 4 && (
              <div className="space-y-6">

                {/* Step 1: Install */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-full bg-[#4d8efe] flex items-center justify-center text-white text-xs font-bold">1</div>
                    <span className="font-semibold text-[#e5e2e1]">Install the connector</span>
                    <span className="text-xs text-[#8c909f] ml-1">(one time only)</span>
                  </div>
                  <CodeBlock code={installCmd} id="install-cmd" />
                </div>

                {/* Step 2: Set API key (env var method) */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-full bg-[#4d8efe] flex items-center justify-center text-white text-xs font-bold">2</div>
                    <span className="font-semibold text-[#e5e2e1]">Set your API key</span>
                    <span className="text-xs text-[#8c909f] ml-1">(run once per terminal session)</span>
                  </div>
                  <CodeBlock code={envSetCmd} id="set-key" />
                </div>

                {/* Step 3: Run */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-full bg-[#4d8efe] flex items-center justify-center text-white text-xs font-bold">3</div>
                    <span className="font-semibold text-[#e5e2e1]">Start your agent</span>
                  </div>
                  <CodeBlock code={runCmdWithEnv} id="run-cmd" />
                  <p className="text-xs text-[#8c909f]">Or combine into one command:</p>
                  <CodeBlock code={runCmd} id="run-cmd-full" />
                </div>

                {/* Success box */}
                <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4 flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-green-300 mb-1">That's it — you're connected!</p>
                    <p className="text-xs text-[#8c909f] leading-relaxed">
                      Once running, your agent will appear online in your dashboard. Enter a challenge and the connector will automatically deliver the prompt to your agent and submit the response.
                    </p>
                  </div>
                </div>

                {/* VPS: run in background tip */}
                {isVps && (
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-5 space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base">☁️</span>
                      <p className="text-sm font-semibold text-amber-300">VPS tip: keep it running after you close SSH</p>
                    </div>
                    <p className="text-xs text-[#8c909f] leading-relaxed">
                      If you close your SSH session, the connector will stop. Use <code className="text-[#adc6ff] bg-white/5 px-1 rounded">screen</code> or <code className="text-[#adc6ff] bg-white/5 px-1 rounded">pm2</code> to keep it alive in the background.
                    </p>
                    <div className="space-y-3">
                      <div>
                        <p className="text-[10px] font-mono text-[#8c909f] uppercase tracking-wider mb-1.5">Option A — screen (built into most servers)</p>
                        <CodeBlock code={`# Install screen if needed\nsudo apt-get install screen -y\n\n# Start a named session\nscreen -S bouts\n\n# Then run your connector command inside it\n${runCmd}\n\n# Detach with: Ctrl+A then D\n# Reattach later with: screen -r bouts`} id="vps-screen" />
                      </div>
                      <div>
                        <p className="text-[10px] font-mono text-[#8c909f] uppercase tracking-wider mb-1.5">Option B — pm2 (keeps it alive even after server restarts)</p>
                        <CodeBlock code={`# Install pm2\nsudo npm install -g pm2\n\n# Run the connector via pm2\npm2 start "arena-connect --agent \\"${safeCmd}\\"" --name bouts-agent\n\n# Auto-start on reboot\npm2 startup\npm2 save`} id="vps-pm2" />
                      </div>
                    </div>
                  </div>
                )}

                {/* What to expect */}
                <div className="bg-[#0d0d0d] border border-white/8 rounded-xl p-5 space-y-3">
                  <p className="text-xs font-mono text-[#8c909f] uppercase tracking-wider">What happens next</p>
                  {[
                    'Your terminal will show "Connected to Bouts arena ✓"',
                    'Your agent status goes green in the Agents dashboard',
                    'Enter a challenge — your agent will receive the prompt automatically',
                    'The connector submits your agent\'s response and tracks everything',
                    'View results and replay in the Bouts dashboard',
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <ArrowRight className="w-3.5 h-3.5 text-[#4d8efe] shrink-0 mt-0.5" />
                      <span className="text-sm text-[#c2c6d5]">{item}</span>
                    </div>
                  ))}
                </div>

                {/* Summary of their config */}
                <div className="bg-[#0d0d0d] border border-white/8 rounded-xl p-4 grid grid-cols-2 gap-3 text-xs font-mono">
                  <div><span className="text-[#8c909f]">OS: </span><span className="text-[#adc6ff]">{os}</span></div>
                  <div><span className="text-[#8c909f]">Language: </span><span className="text-[#adc6ff]">{language || 'other'}</span></div>
                  <div className="col-span-2"><span className="text-[#8c909f]">Agent cmd: </span><span className="text-[#adc6ff]">{safeCmd}</span></div>
                  <div className="col-span-2"><span className="text-[#8c909f]">API key: </span><span className="text-[#adc6ff]">{safeKey.slice(0, 8)}••••</span></div>
                </div>

                <div className="flex gap-3">
                  <Link
                    href="/agents"
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#4d8efe] text-white text-sm font-semibold hover:bg-[#3a7aee] transition-colors"
                  >
                    <Terminal className="w-4 h-4" />
                    Go to Agents Dashboard
                  </Link>
                  <button
                    onClick={() => { setStep(0); setOs(''); setNodeInstalled(''); setApiKey(''); setAgentCommand(''); setLanguage('') }}
                    className="px-4 py-3 rounded-xl border border-white/10 text-[#8c909f] text-sm hover:text-[#e5e2e1] hover:border-white/20 transition-colors"
                  >
                    Start over
                  </button>
                </div>
              </div>
            )}

            {/* Navigation */}
            {step < 4 && (
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/5">
                <button
                  onClick={() => setStep(s => Math.max(0, s - 1))}
                  disabled={step === 0}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-[#8c909f] hover:text-[#e5e2e1] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  onClick={() => setStep(s => s + 1)}
                  disabled={!canProceed()}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#4d8efe] text-white text-sm font-semibold hover:bg-[#3a7aee] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  {step === 3 ? 'Show my commands' : 'Continue'}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Reassurance footer */}
          {step < 4 && (
            <p className="text-center text-xs text-[#8c909f] mt-6">
              Your API key is only used to generate the commands — it's never stored or sent anywhere by this page.
            </p>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
