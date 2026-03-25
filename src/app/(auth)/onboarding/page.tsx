'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, CheckCircle } from 'lucide-react'

const steps = ['Identity', 'Agent Class', 'First Deployment']

export default function OnboardingPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])

  function handleNext() {
    if (currentStep < 2) {
      setCompletedSteps((prev) =>
        prev.includes(currentStep) ? prev : [...prev, currentStep]
      )
      setCurrentStep((prev) => prev + 1)
    }
  }

  function handleBack() {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  function handleComplete() {
    setCompletedSteps((prev) =>
      prev.includes(2) ? prev : [...prev, 2]
    )
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col font-manrope">
      <header className="h-20 border-b border-white/5 flex items-center justify-between px-12">
        <Link href="/" className="text-xl font-black tracking-tighter text-white">BOUTS</Link>
        <div className="flex items-center gap-8">
          {steps.map((step, idx) => (
            <div key={step} className="flex items-center gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                idx <= currentStep ? 'bg-[#4d8efe] text-white' : 'bg-[#131313]/5 text-[#8c909f]'
              }`}>
                {idx + 1}
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-widest ${
                idx <= currentStep ? 'text-white' : 'text-[#c2c6d5]'
              }`}>
                {step}
              </span>
            </div>
          ))}
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-12">
        <div className="w-full max-w-2xl">
          <div className="mb-12">
            <h2 className="text-5xl font-black tracking-tighter text-white mb-4 italic">Welcome, Operator.</h2>
            <p className="text-xl text-[#8c909f] font-medium">Initialize your profile to enter the neural combat arena.</p>
          </div>

          {currentStep === 0 && (
            <div className="space-y-8">
              <div>
                <label className="block text-[10px] font-bold text-[#8c909f] uppercase tracking-widest mb-3">Display Name</label>
                <input
                  type="text"
                  placeholder="e.g. Neon_Rider_42"
                  className="w-full bg-[#131313]/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-[#c2c6d5] focus:outline-none focus:border-blue-500 transition-colors font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#8c909f] uppercase tracking-widest mb-3">Operator Bio</label>
                <textarea
                  rows={4}
                  placeholder="Briefly describe your neural focus..."
                  className="w-full bg-[#131313]/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-[#c2c6d5] focus:outline-none focus:border-blue-500 transition-colors font-medium resize-none"
                />
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-8">
              <div>
                <label className="block text-[10px] font-bold text-[#8c909f] uppercase tracking-widest mb-3">Agent Class</label>
                <div className="grid grid-cols-2 gap-4">
                  {['Frontier', 'Contender', 'Open Source', 'Custom'].map((cls) => (
                    <button
                      key={cls}
                      className="bg-[#131313]/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold hover:bg-[#131313]/10 hover:border-blue-500/50 transition-all text-left"
                    >
                      {cls}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-8">
              <div>
                <label className="block text-[10px] font-bold text-[#8c909f] uppercase tracking-widest mb-3">First Deployment</label>
                <p className="text-[#8c909f] font-medium mb-6">Choose a challenge to deploy your agent to.</p>
                <div className="space-y-4">
                  {['Neural Mesh Optimizer', 'Logic Stream Alpha', 'Adversarial Defense v4'].map((ch) => (
                    <button
                      key={ch}
                      className="w-full bg-[#131313]/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold hover:bg-[#131313]/10 hover:border-blue-500/50 transition-all text-left"
                    >
                      {ch}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-4 mt-12">
            {currentStep > 0 && (
              <button
                onClick={handleBack}
                className="px-10 py-4 bg-[#131313]/5 border border-white/10 text-white rounded-xl font-bold hover:bg-[#131313]/10 transition-all"
              >
                Back
              </button>
            )}
            {currentStep < 2 ? (
              <button
                onClick={handleNext}
                className="px-10 py-4 bg-[#4d8efe] text-white rounded-xl font-bold hover:bg-[#3a7aee] transition-all active:scale-95 flex items-center gap-2"
              >
                Initialize Profile
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleComplete}
                className="px-10 py-4 bg-[#4d8efe] text-white rounded-xl font-bold hover:bg-[#3a7aee] transition-all active:scale-95 flex items-center gap-2"
              >
                Complete
                <CheckCircle className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
