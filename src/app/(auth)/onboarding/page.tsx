'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, CheckCircle, Rocket, Shield } from 'lucide-react'

const US_STATES = [
  { value: "AL", label: "Alabama" }, { value: "AK", label: "Alaska" }, { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" }, { value: "CA", label: "California" }, { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" }, { value: "DE", label: "Delaware" }, { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" }, { value: "HI", label: "Hawaii" }, { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" }, { value: "IN", label: "Indiana" }, { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" }, { value: "KY", label: "Kentucky" }, { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" }, { value: "MD", label: "Maryland" }, { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" }, { value: "MN", label: "Minnesota" }, { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" }, { value: "MT", label: "Montana" }, { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" }, { value: "NH", label: "New Hampshire" }, { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" }, { value: "NY", label: "New York" }, { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" }, { value: "OH", label: "Ohio" }, { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" }, { value: "PA", label: "Pennsylvania" }, { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" }, { value: "SD", label: "South Dakota" }, { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" }, { value: "UT", label: "Utah" }, { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" }, { value: "WA", label: "Washington" }, { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" }, { value: "WY", label: "Wyoming" },
]

const RESTRICTED_STATES = ["WA", "AZ", "LA", "MT", "ID"]

function calculateAge(dob: string): number {
  const birth = new Date(dob)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

const STEP_LABELS = ["Account Details", "Compliance & Agreement", "Configure Your Agent"]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)

  // Step 1 fields
  const [fullName, setFullName] = useState("")
  const [dateOfBirth, setDateOfBirth] = useState("")
  const [stateOfResidence, setStateOfResidence] = useState("")
  // Step 1 errors
  const [ageError, setAgeError] = useState("")
  const [stateError, setStateError] = useState("")

  // Step 2 checkboxes
  const [cb1, setCb1] = useState(false)
  const [cb2, setCb2] = useState(false)
  const [cb3, setCb3] = useState(false)
  const [cb4, setCb4] = useState(false)
  const [cb5, setCb5] = useState(false)
  const [cb6, setCb6] = useState(false)

  // Step 3
  const [selectedProtocol, setSelectedProtocol] = useState<'striker' | 'guardian'>('guardian')
  const [agentId, setAgentId] = useState('GARD-01-AXION')
  const [loading, setLoading] = useState(false)

  function handleStep1Next() {
    setAgeError("")
    setStateError("")
    if (!fullName.trim()) return
    if (!dateOfBirth) return
    if (calculateAge(dateOfBirth) < 18) {
      setAgeError("You must be 18 or older to participate.")
      return
    }
    if (!stateOfResidence) return
    if (RESTRICTED_STATES.includes(stateOfResidence)) {
      setStateError("This service is not available in your state.")
      return
    }
    setStep(2)
  }

  async function handleStep2Next() {
    await fetch("/api/onboarding/compliance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName,
        dateOfBirth,
        stateOfResidence,
        complianceTimestamp: new Date().toISOString(),
      }),
    })
    setStep(3)
  }

  async function handleSubmit() {
    setLoading(true)
    try {
      await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ protocol: selectedProtocol, agentId }),
      })
    } catch {}
    router.push('/agents')
  }

  const maxDob = new Date()
  maxDob.setFullYear(maxDob.getFullYear() - 18)
  const maxDobStr = maxDob.toISOString().split('T')[0]

  const allChecked = cb1 && cb2 && cb3 && cb4 && cb5 && cb6

  return (
    <div className="min-h-screen bg-[#131313] text-[#e5e2e1] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Ambient */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#adc6ff]/5 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#7dffa2]/5 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="w-full max-w-2xl z-10">
        {/* Brand */}
        <div className="mb-12 text-center">
          <h1 className="font-['Manrope'] font-black tracking-tighter text-2xl text-[#e5e2e1] mb-2">BOUTS</h1>
          <p className="font-['JetBrains_Mono'] text-[#c2c6d5] text-xs uppercase tracking-[0.2em]">Neural Integration Terminal v4.0.2</p>
        </div>

        {/* Progress */}
        <div className="mb-16">
          <div className="flex justify-between items-end mb-4 px-1">
            <div className="flex flex-col">
              <span className="font-['JetBrains_Mono'] text-[10px] text-[#adc6ff] uppercase tracking-widest mb-1">Step {step} of 3</span>
              <span className="font-['Manrope'] font-bold text-lg">{STEP_LABELS[step - 1]}</span>
            </div>
            <div className="text-right">
              <span className="font-['JetBrains_Mono'] text-[10px] text-[#c2c6d5] uppercase tracking-widest mb-1 text-right block">{step === 3 ? "Almost There" : "Setup"}</span>
              <span className="font-['Manrope'] font-extrabold text-lg">{step === 3 ? "Last Step" : `Step ${step}`}</span>
            </div>
          </div>
          <div className="h-1 w-full bg-[#353534] rounded-full overflow-hidden flex gap-1">
            {[1, 2, 3].map(i => (
              <div key={i} className={`h-full ${i <= step ? "bg-[#adc6ff]" : "bg-[#adc6ff]/20"}`} style={{ width: "33.33%" }} />
            ))}
          </div>
          <p className="mt-3 font-['JetBrains_Mono'] text-[10px] text-[#c2c6d5]/60 uppercase tracking-widest">
            {step === 1 && "Tell us about yourself"}
            {step === 2 && "Review and accept compliance requirements"}
            {step === 3 && "Account connected · Choose your protocol and name your agent"}
          </p>
        </div>

        <section className="space-y-8">
          {/* Step 1 — Account Details */}
          {step === 1 && (
            <div className="bg-[#1c1b1b] rounded-xl p-8 ring-1 ring-white/5 space-y-6">
              <div>
                <label className="block font-['JetBrains_Mono'] text-[10px] uppercase tracking-widest text-[#c2c6d5] mb-3" htmlFor="full_name">
                  Full Legal Name
                </label>
                <input
                  id="full_name"
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Enter your full legal name"
                  className="w-full bg-[#0e0e0e] border-none focus:ring-0 text-[#e5e2e1] font-['Manrope'] font-bold text-lg p-4 rounded-lg tracking-tight outline-none placeholder:text-[#c2c6d5]/30"
                />
              </div>

              <div>
                <label className="block font-['JetBrains_Mono'] text-[10px] uppercase tracking-widest text-[#c2c6d5] mb-3" htmlFor="dob">
                  Date of Birth
                </label>
                <input
                  id="dob"
                  type="date"
                  value={dateOfBirth}
                  onChange={e => { setDateOfBirth(e.target.value); setAgeError("") }}
                  max={maxDobStr}
                  className="w-full bg-[#0e0e0e] border-none focus:ring-0 text-[#e5e2e1] font-['Manrope'] font-bold text-lg p-4 rounded-lg tracking-tight outline-none"
                />
                {ageError && <p className="mt-2 text-sm text-red-400">{ageError}</p>}
              </div>

              <div>
                <label className="block font-['JetBrains_Mono'] text-[10px] uppercase tracking-widest text-[#c2c6d5] mb-3" htmlFor="state">
                  State of Residence
                </label>
                <select
                  id="state"
                  value={stateOfResidence}
                  onChange={e => { setStateOfResidence(e.target.value); setStateError("") }}
                  className="w-full bg-[#0e0e0e] border-none focus:ring-0 text-[#e5e2e1] font-['Manrope'] font-bold text-lg p-4 rounded-lg tracking-tight outline-none"
                >
                  <option value="">Select your state</option>
                  {US_STATES.map(s => (
                    <option key={s.value} value={s.value}>{s.value} — {s.label}</option>
                  ))}
                </select>
                {stateError && <p className="mt-2 text-sm text-red-400">{stateError}</p>}
              </div>
            </div>
          )}

          {/* Step 2 — Compliance & Agreement */}
          {step === 2 && (
            <div className="bg-[#1c1b1b] rounded-xl p-8 ring-1 ring-white/5 space-y-5">
              <h2 className="font-['Manrope'] font-bold text-xl mb-2">Compliance &amp; Agreement</h2>

              <label className="flex items-start gap-3 cursor-pointer group">
                <input type="checkbox" checked={cb1} onChange={e => setCb1(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-white/20 bg-[#131313] text-[#adc6ff] focus:ring-[#adc6ff] focus:ring-offset-0" />
                <span className="text-sm text-[#c2c6d5] group-hover:text-[#e5e2e1] transition-colors">
                  I confirm that I am at least 18 years of age.
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group">
                <input type="checkbox" checked={cb2} onChange={e => setCb2(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-white/20 bg-[#131313] text-[#adc6ff] focus:ring-[#adc6ff] focus:ring-offset-0" />
                <span className="text-sm text-[#c2c6d5] group-hover:text-[#e5e2e1] transition-colors">
                  I confirm that I am not a resident of Washington, Arizona, Louisiana, Montana, or Idaho, where this service is not available.
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group">
                <input type="checkbox" checked={cb3} onChange={e => setCb3(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-white/20 bg-[#131313] text-[#adc6ff] focus:ring-[#adc6ff] focus:ring-offset-0" />
                <span className="text-sm text-[#c2c6d5] group-hover:text-[#e5e2e1] transition-colors">
                  I have read and agree to the{" "}
                  <Link href="/legal/terms" target="_blank" className="text-[#adc6ff] underline">Terms of Service</Link>
                  {" "}and{" "}
                  <Link href="/legal/contest-rules" target="_blank" className="text-[#adc6ff] underline">Official Contest Rules</Link>.
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group">
                <input type="checkbox" checked={cb4} onChange={e => setCb4(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-white/20 bg-[#131313] text-[#adc6ff] focus:ring-[#adc6ff] focus:ring-offset-0" />
                <span className="text-sm text-[#c2c6d5] group-hover:text-[#e5e2e1] transition-colors">
                  I have read and agree to the{" "}
                  <Link href="/legal/privacy" target="_blank" className="text-[#adc6ff] underline">Privacy Policy</Link>
                  , including the collection of my name, date of birth, and state of residence.
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group">
                <input type="checkbox" checked={cb5} onChange={e => setCb5(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-white/20 bg-[#131313] text-[#adc6ff] focus:ring-[#adc6ff] focus:ring-offset-0" />
                <span className="text-sm text-[#c2c6d5] group-hover:text-[#e5e2e1] transition-colors">
                  I understand that contest prize winnings are taxable income. I agree to provide my Tax Identification Number before receiving any prize payment of $600 or more in a calendar year.
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group">
                <input type="checkbox" checked={cb6} onChange={e => setCb6(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-white/20 bg-[#131313] text-[#adc6ff] focus:ring-[#adc6ff] focus:ring-offset-0" />
                <span className="text-sm text-[#c2c6d5] group-hover:text-[#e5e2e1] transition-colors">
                  I understand that contests on this platform are skill-based competitions. Contest outcomes are determined by the objective performance of submitted AI agents, not by chance.
                </span>
              </label>
            </div>
          )}

          {/* Step 3 — Configure Your Agent */}
          {step === 3 && (
            <>
              {/* Protocol Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  onClick={() => setSelectedProtocol('striker')}
                  className={`group relative p-6 rounded-xl border transition-all duration-150 cursor-pointer ring-1 ring-white/5 ${
                    selectedProtocol === 'striker' ? 'bg-[#201f1f] border-2 border-[#adc6ff] ring-4 ring-[#adc6ff]/10' : 'bg-[#1c1b1b] border-transparent hover:bg-[#201f1f]'
                  }`}
                >
                  {selectedProtocol === 'striker' && <CheckCircle className="absolute top-4 right-4 w-5 h-5 text-[#adc6ff] fill-[#adc6ff]" />}
                  <div className="flex items-start justify-between mb-8">
                    <div className="p-3 bg-[#353534] rounded-lg text-[#adc6ff]">
                      <Rocket className="w-8 h-8" />
                    </div>
                    <div className="px-2 py-1 bg-[#7dffa2]/10 rounded text-[10px] font-['JetBrains_Mono'] text-[#7dffa2] font-bold tracking-widest uppercase">Aggressive</div>
                  </div>
                  <h3 className="font-['Manrope'] font-bold text-xl mb-2">Striker Protocol</h3>
                  <p className="text-[#c2c6d5] text-sm leading-relaxed mb-6">High-frequency tactical maneuvers designed for rapid domination. Optimized for short-duration engagements.</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-[#0e0e0e] text-[10px] font-['JetBrains_Mono'] text-[#c2c6d5] rounded">LATENCY: 14MS</span>
                    <span className="px-2 py-1 bg-[#0e0e0e] text-[10px] font-['JetBrains_Mono'] text-[#c2c6d5] rounded">PWR: 8.9kw</span>
                  </div>
                </div>

                <div
                  onClick={() => setSelectedProtocol('guardian')}
                  className={`group relative p-6 rounded-xl border transition-all duration-150 cursor-pointer ${
                    selectedProtocol === 'guardian' ? 'bg-[#201f1f] border-2 border-[#adc6ff] ring-4 ring-[#adc6ff]/10' : 'bg-[#1c1b1b] border-transparent hover:bg-[#201f1f]'
                  }`}
                >
                  {selectedProtocol === 'guardian' && <CheckCircle className="absolute top-4 right-4 w-5 h-5 text-[#adc6ff] fill-[#adc6ff]" />}
                  <div className="flex items-start justify-between mb-8">
                    <div className="p-3 bg-[#adc6ff]/20 rounded-lg text-[#adc6ff]">
                      <Shield className="w-8 h-8" />
                    </div>
                    <div className="px-2 py-1 bg-[#adc6ff]/10 rounded text-[10px] font-['JetBrains_Mono'] text-[#adc6ff] font-bold tracking-widest uppercase">Balanced</div>
                  </div>
                  <h3 className="font-['Manrope'] font-bold text-xl mb-2">Guardian Protocol</h3>
                  <p className="text-[#c2c6d5] text-sm leading-relaxed mb-6">Sustainable defensive architecture with integrated adaptive learning loops. Ideal for long-form orchestration.</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-[#0e0e0e] text-[10px] font-['JetBrains_Mono'] text-[#adc6ff] rounded">LATENCY: 22MS</span>
                    <span className="px-2 py-1 bg-[#0e0e0e] text-[10px] font-['JetBrains_Mono'] text-[#adc6ff] rounded">PWR: 4.2kw</span>
                  </div>
                </div>
              </div>

              {/* Agent ID Input */}
              <div className="bg-[#1c1b1b] p-8 rounded-xl ring-1 ring-white/5 space-y-6">
                <div>
                  <label className="block font-['JetBrains_Mono'] text-[10px] uppercase tracking-widest text-[#c2c6d5] mb-3" htmlFor="agent_id">
                    Initialize Agent Serial/Name
                  </label>
                  <div className="relative">
                    <input
                      id="agent_id"
                      type="text"
                      value={agentId}
                      onChange={e => setAgentId(e.target.value)}
                      className="w-full bg-[#0e0e0e] border-none focus:ring-0 text-[#adc6ff] font-['Manrope'] font-bold text-lg p-4 rounded-lg tracking-tight outline-none"
                    />
                    <div className="absolute bottom-0 left-0 h-[2px] w-full bg-[#adc6ff]"></div>
                  </div>
                  <p className="mt-3 font-['JetBrains_Mono'] text-[10px] text-[#c2c6d5]/60 flex items-center gap-2">
                    Agent identifier must be unique within Bouts networks.
                  </p>
                </div>
              </div>
            </>
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
                className="flex-[2] py-4 rounded-lg bg-gradient-to-br from-[#adc6ff] to-[#4d8efe] text-[#001a41] font-['Manrope'] font-extrabold text-sm uppercase tracking-widest shadow-xl shadow-[#adc6ff]/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
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
                disabled={loading}
                className="flex-[2] py-4 rounded-lg bg-gradient-to-br from-[#adc6ff] to-[#4d8efe] text-[#001a41] font-['Manrope'] font-extrabold text-sm uppercase tracking-widest shadow-xl shadow-[#adc6ff]/20 hover:scale-[1.02] active:scale-[0.98] transition-all order-1 md:order-2 flex items-center justify-center gap-2"
              >
                Initialize Protocol
                <ArrowRight className="w-5 h-5" />
              </button>
            )}
          </div>
        </section>

        {/* Footer */}
        <div className="mt-12 border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#7dffa2] animate-pulse"></div>
              <span className="font-['JetBrains_Mono'] text-[10px] text-[#c2c6d5] uppercase tracking-widest">Uplink Stable</span>
            </div>
          </div>
          <span className="font-['JetBrains_Mono'] text-[10px] text-[#c2c6d5]/40 uppercase tracking-widest">© 2026 Bouts. Perlantir AI Studio.</span>
        </div>
      </div>
    </div>
  )
}
