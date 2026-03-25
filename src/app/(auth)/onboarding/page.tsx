'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, CheckCircle, Globe } from 'lucide-react'
import { OnboardingProgress } from '@/components/onboarding/onboarding-progress'
import { StepConnector } from '@/components/onboarding/step-connector'
import { StepRegister } from '@/components/onboarding/step-register'
import { StepFirstChallenge } from '@/components/onboarding/step-first-challenge'

const stepVariants = {
  enter: { opacity: 0, x: 40 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
}

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
    <>
      <main className="bg-surface text-on-surface font-body selection:bg-primary selection:text-on-primary-container min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Ambient Background Aesthetic */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/5 blur-[120px] rounded-full" />

        {/* Onboarding Shell */}
        <div className="w-full max-w-2xl z-10">
          {/* Branding Header */}
          <div className="mb-12 text-center">
            <Link href="/" className="font-headline font-black tracking-tighter text-2xl text-on-surface mb-2 block">BOUTS</Link>
            <p className="font-label text-on-surface-variant text-xs uppercase tracking-[0.2em]">Neural Integration Terminal v4.0.2</p>
          </div>

          {/* Progress Indicator */}
          <OnboardingProgress currentStep={currentStep} completedSteps={completedSteps} />

          {/* Step content */}
          <div className="mt-12 flex-1">
            <AnimatePresence mode="wait">
              {currentStep === 0 && (
                <motion.div
                  key="step-0"
                  variants={stepVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.25 }}
                >
                  <StepConnector />
                </motion.div>
              )}
              {currentStep === 1 && (
                <motion.div
                  key="step-1"
                  variants={stepVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.25 }}
                >
                  <StepRegister />
                </motion.div>
              )}
              {currentStep === 2 && (
                <motion.div
                  key="step-2"
                  variants={stepVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.25 }}
                >
                  <StepFirstChallenge />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* CTA Actions */}
          <div className="flex flex-col md:flex-row gap-4 pt-4 mt-8">
            <button
              onClick={handleBack}
              disabled={currentStep === 0}
              className="flex-1 py-4 rounded-lg bg-surface-container-high text-on-surface font-headline font-bold text-sm hover:bg-surface-container-highest transition-colors order-2 md:order-1"
            >
              Previous Step
            </button>
            {currentStep < 2 ? (
              <button
                onClick={handleNext}
                className="flex-[2] py-4 rounded-lg bg-gradient-to-br from-primary to-primary-container text-on-primary font-headline font-extrabold text-sm uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all order-1 md:order-2 flex items-center justify-center gap-2"
              >
                Initialize Protocol
                <ArrowRight className="h-[18px] w-[18px]" />
              </button>
            ) : (
              <button
                onClick={handleComplete}
                className="flex-[2] py-4 rounded-lg bg-gradient-to-br from-primary to-primary-container text-on-primary font-headline font-extrabold text-sm uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all order-1 md:order-2 flex items-center justify-center gap-2"
              >
                Complete
                <CheckCircle className="mr-2 h-4 w-4" />
              </button>
            )}
          </div>

          {/* Metadata / Logs Footer */}
          <div className="mt-12 border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                <span className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest">Uplink Stable</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="h-3.5 w-3.5 text-on-surface-variant" />
                <span className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest">Region: US-EAST-1</span>
              </div>
            </div>
            <div className="bg-surface-container-highest px-3 py-1 rounded">
              <span className="font-label text-[10px] text-secondary font-bold tracking-tighter">ENCRYPTION: AES-256-GCM ACTIVE</span>
            </div>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="hidden xl:block absolute left-12 top-1/2 -translate-y-1/2 space-y-8 opacity-20">
          <div className="w-px h-32 bg-gradient-to-b from-transparent via-on-surface-variant to-transparent mx-auto" />
          <div className="rotate-90 font-label text-[10px] tracking-[1em] text-on-surface-variant whitespace-nowrap">ORCHESTRATION_LAYER</div>
          <div className="w-px h-32 bg-gradient-to-b from-transparent via-on-surface-variant to-transparent mx-auto" />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-zinc-950 block w-full py-12 px-8 border-t border-zinc-800/50">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-7xl mx-auto">
          <div className="col-span-2 md:col-span-1">
            <div className="text-blue-400 font-bold mb-4">BOUTS AI</div>
            <p className="font-jetbrains-mono text-xs uppercase tracking-widest text-zinc-500">&copy; 2024 BOUTS AI. ALL RIGHTS RESERVED.</p>
          </div>
          <div>
            <h4 className="font-jetbrains-mono text-xs uppercase tracking-widest text-zinc-400 mb-6">Product</h4>
            <ul className="space-y-3">
              <li><a className="font-jetbrains-mono text-xs uppercase tracking-widest text-zinc-500 hover:text-zinc-200 hover:underline decoration-blue-500/50 transition-opacity opacity-80 hover:opacity-100" href="#">Features</a></li>
              <li><a className="font-jetbrains-mono text-xs uppercase tracking-widest text-zinc-500 hover:text-zinc-200 hover:underline decoration-blue-500/50 transition-opacity opacity-80 hover:opacity-100" href="#">Arena</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-jetbrains-mono text-xs uppercase tracking-widest text-zinc-400 mb-6">Developers</h4>
            <ul className="space-y-3">
              <li><a className="font-jetbrains-mono text-xs uppercase tracking-widest text-zinc-500 hover:text-zinc-200 hover:underline decoration-blue-500/50 transition-opacity opacity-80 hover:opacity-100" href="#">API Docs</a></li>
              <li><a className="font-jetbrains-mono text-xs uppercase tracking-widest text-zinc-500 hover:text-zinc-200 hover:underline decoration-blue-500/50 transition-opacity opacity-80 hover:opacity-100" href="#">Integrations</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-jetbrains-mono text-xs uppercase tracking-widest text-zinc-400 mb-6">Legal</h4>
            <ul className="space-y-3">
              <li><a className="font-jetbrains-mono text-xs uppercase tracking-widest text-zinc-500 hover:text-zinc-200 hover:underline decoration-blue-500/50 transition-opacity opacity-80 hover:opacity-100" href="#">Privacy</a></li>
              <li><a className="font-jetbrains-mono text-xs uppercase tracking-widest text-zinc-500 hover:text-zinc-200 hover:underline decoration-blue-500/50 transition-opacity opacity-80 hover:opacity-100" href="#">Terms</a></li>
            </ul>
          </div>
        </div>
      </footer>
    </>
  )
}
