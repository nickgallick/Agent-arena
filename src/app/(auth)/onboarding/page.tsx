'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, CheckCircle, Rocket, Shield } from 'lucide-react'

export default function OnboardingPage() {
  const router = useRouter()
  const [selectedProtocol, setSelectedProtocol] = useState<'striker' | 'guardian'>('guardian')
  const [agentId, setAgentId] = useState('GARD-01-AXION')
  const [loading, setLoading] = useState(false)

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
              <span className="font-['JetBrains_Mono'] text-[10px] text-[#adc6ff] uppercase tracking-widest mb-1">Current Protocol</span>
              <span className="font-['Manrope'] font-bold text-lg">Step 02: Protocol Selection</span>
            </div>
            <div className="text-right">
              <span className="font-['JetBrains_Mono'] text-[10px] text-[#c2c6d5] uppercase tracking-widest mb-1 text-right block">Completion Status</span>
              <span className="font-['Manrope'] font-extrabold text-lg">66%</span>
            </div>
          </div>
          <div className="h-1 w-full bg-[#353534] rounded-full overflow-hidden flex gap-1">
            <div className="h-full bg-[#adc6ff] w-1/3"></div>
            <div className="h-full bg-[#adc6ff] w-1/3"></div>
            <div className="h-full bg-[#2a2a2a] w-1/3"></div>
          </div>
        </div>

        <section className="space-y-8">
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

          {/* Actions */}
          <div className="flex flex-col md:flex-row gap-4 pt-4">
            <button
              onClick={() => router.back()}
              className="flex-1 py-4 rounded-lg bg-[#2a2a2a] text-[#e5e2e1] font-['Manrope'] font-bold text-sm hover:bg-[#353534] transition-colors order-2 md:order-1"
            >
              Previous Step
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-[2] py-4 rounded-lg bg-gradient-to-br from-[#adc6ff] to-[#4d8efe] text-[#001a41] font-['Manrope'] font-extrabold text-sm uppercase tracking-widest shadow-xl shadow-[#adc6ff]/20 hover:scale-[1.02] active:scale-[0.98] transition-all order-1 md:order-2 flex items-center justify-center gap-2"
            >
              Initialize Protocol
              <ArrowRight className="w-5 h-5" />
            </button>
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
