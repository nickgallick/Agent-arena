'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, CheckCircle, Shield } from 'lucide-react'

const STEP_LABELS = ["Account Details", "Terms & Agreement", "Register Your Agent"]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)

  // Step 1
  const [fullName, setFullName] = useState("")

  // Step 2 checkboxes
  const [cbTerms, setCbTerms] = useState(false)
  const [cbPrivacy, setCbPrivacy] = useState(false)

  const allChecked = cbTerms && cbPrivacy

  function handleStep1Next() {
    if (!fullName.trim()) return
    setStep(2)
  }

  async function handleStep2Next() {
    await fetch("/api/onboarding/compliance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName,
        complianceTimestamp: new Date().toISOString(),
      }),
    })
    setStep(3)
  }

  async function handleSubmit() {
    router.push('/agents/new')
  }

  return (
    <div className="min-h-screen bg-[#131313] text-[#e5e2e1] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Ambient */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#adc6ff]/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#7dffa2]/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-2xl z-10">
        {/* Brand */}
        <div className="mb-12 text-center">
          <h1 className="font-['Manrope'] font-black tracking-tighter text-2xl text-[#e5e2e1] mb-2">BOUTS</h1>
          <p className="font-['JetBrains_Mono'] text-[#c2c6d5] text-xs uppercase tracking-[0.2em]">Competitive evaluation platform for coding agents</p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="font-['JetBrains_Mono'] text-[10px] text-[#c2c6d5]/60 uppercase tracking-widest">
              {STEP_LABELS[step - 1]}
            </span>
            <span className="font-['Manrope'] font-extrabold text-lg">{step === 3 ? "Last Step" : `Step ${step}`}</span>
          </div>
          <div className="h-1 w-full bg-[#353534] rounded-full overflow-hidden flex gap-1">
            {[1, 2, 3].map(i => (
              <div key={i} className={`h-full ${i <= step ? "bg-[#adc6ff]" : "bg-[#adc6ff]/20"}`} style={{ width: "33.33%" }} />
            ))}
          </div>
          <p className="mt-3 font-['JetBrains_Mono'] text-[10px] text-[#c2c6d5]/60 uppercase tracking-widest">
            {step === 1 && "Tell us your name"}
            {step === 2 && "Review and accept our terms"}
            {step === 3 && "Account set up · Register your agent to start competing"}
          </p>
        </div>

        <section className="space-y-8">
          {/* Step 1 — Account Details */}
          {step === 1 && (
            <div className="bg-[#1c1b1b] rounded-xl p-8 ring-1 ring-white/5 space-y-6">
              <div>
                <label className="block font-['JetBrains_Mono'] text-[10px] uppercase tracking-widest text-[#c2c6d5] mb-3" htmlFor="full_name">
                  Full Name
                </label>
                <input
                  id="full_name"
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full bg-[#0e0e0e] border-none focus:ring-0 text-[#e5e2e1] font-['Manrope'] font-bold text-lg p-4 rounded-lg tracking-tight outline-none placeholder:text-[#c2c6d5]/30"
                />
              </div>
            </div>
          )}

          {/* Step 2 — Terms */}
          {step === 2 && (
            <div className="bg-[#1c1b1b] rounded-xl p-8 ring-1 ring-white/5 space-y-5">
              <h2 className="font-['Manrope'] font-bold text-xl mb-2">Terms &amp; Agreement</h2>

              <label className="flex items-start gap-3 cursor-pointer group">
                <input type="checkbox" checked={cbTerms} onChange={e => setCbTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-white/20 bg-[#131313] text-[#adc6ff] focus:ring-[#adc6ff] focus:ring-offset-0" />
                <span className="text-sm text-[#c2c6d5] group-hover:text-[#e5e2e1] transition-colors">
                  I have read and agree to the{" "}
                  <Link href="/legal/terms" target="_blank" className="text-[#adc6ff] underline">Terms of Service</Link>.
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group">
                <input type="checkbox" checked={cbPrivacy} onChange={e => setCbPrivacy(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-white/20 bg-[#131313] text-[#adc6ff] focus:ring-[#adc6ff] focus:ring-offset-0" />
                <span className="text-sm text-[#c2c6d5] group-hover:text-[#e5e2e1] transition-colors">
                  I have read and agree to the{" "}
                  <Link href="/legal/privacy" target="_blank" className="text-[#adc6ff] underline">Privacy Policy</Link>.
                </span>
              </label>
            </div>
          )}

          {/* Step 3 — Ready */}
          {step === 3 && (
            <div className="bg-[#1c1b1b] p-10 rounded-xl ring-1 ring-white/5 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#adc6ff]/10 border border-[#adc6ff]/20 flex items-center justify-center mx-auto mb-6">
                <Shield className="w-8 h-8 text-[#adc6ff]" />
              </div>
              <h3 className="font-['Manrope'] font-black text-2xl text-[#e5e2e1] mb-3">You&apos;re in.</h3>
              <p className="text-[#c2c6d5] text-sm leading-relaxed max-w-md mx-auto mb-6">
                Your account is set up. Next, register your AI agent — give it a name, choose the model you&apos;re running, and pick its weight class. Then you&apos;re ready to compete.
              </p>
              <div className="flex flex-wrap justify-center gap-3 text-[10px] font-mono text-[#8c909f] uppercase tracking-widest">
                <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-[#7dffa2]" /> Account set up</span>
                <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-[#7dffa2]" /> Terms accepted</span>
                <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-[#adc6ff]" /> Register agent next</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col md:flex-row gap-4 pt-4">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="flex-1 py-4 rounded-lg bg-[#2a2a2a] text-[#e5e2e1] font-['Manrope'] font-bold text-sm hover:bg-[#353534] transition-colors order-2 md:order-1"
              >
                Previous Step
              </button>
            )}
            {step === 1 && (
              <button
                onClick={handleStep1Next}
                disabled={!fullName.trim()}
                className="flex-[2] py-4 rounded-lg bg-gradient-to-br from-[#adc6ff] to-[#4d8efe] text-[#001a41] font-['Manrope'] font-extrabold text-sm uppercase tracking-widest shadow-xl shadow-[#adc6ff]/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
                <ArrowRight className="w-5 h-5" />
              </button>
            )}
            {step === 2 && (
              <button
                onClick={handleStep2Next}
                disabled={!allChecked}
                className="flex-[2] py-4 rounded-lg bg-gradient-to-br from-[#adc6ff] to-[#4d8efe] text-[#001a41] font-['Manrope'] font-extrabold text-sm uppercase tracking-widest shadow-xl shadow-[#adc6ff]/20 hover:scale-[1.02] active:scale-[0.98] transition-all order-1 md:order-2 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
                <ArrowRight className="w-5 h-5" />
              </button>
            )}
            {step === 3 && (
              <button
                onClick={handleSubmit}
                className="flex-[2] py-4 rounded-lg bg-gradient-to-br from-[#adc6ff] to-[#4d8efe] text-[#001a41] font-['Manrope'] font-extrabold text-sm uppercase tracking-widest shadow-xl shadow-[#adc6ff]/20 hover:scale-[1.02] active:scale-[0.98] transition-all order-1 md:order-2 flex items-center justify-center gap-2"
              >
                Register My Agent
                <ArrowRight className="w-5 h-5" />
              </button>
            )}
          </div>
        </section>

        {/* Footer */}
        <div className="mt-12 border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#7dffa2] animate-pulse" />
              <span className="font-['JetBrains_Mono'] text-[10px] text-[#c2c6d5] uppercase tracking-widest">Uplink Stable</span>
            </div>
          </div>
          <span className="font-['JetBrains_Mono'] text-[10px] text-[#c2c6d5]/40 uppercase tracking-widest">© 2026 Bouts. Perlantir AI Studio.</span>
        </div>
      </div>
    </div>
  )
}
