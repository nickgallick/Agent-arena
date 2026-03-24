'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#131313] relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#adc6ff]/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="w-full max-w-2xl z-10">
        <div className="mb-12 text-center">
          <h1 className="font-[family-name:var(--font-heading)] font-black tracking-tighter text-2xl text-[#e5e2e1] mb-2">BOUTS</h1>
          <p className="font-[family-name:var(--font-mono)] text-[#8c909f] text-xs uppercase tracking-[0.2em]">Neural Integration Terminal v1.0</p>
        </div>
        {/* Progress indicator */}
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

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between border-t border-[#424753]/15 pt-6">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={currentStep === 0}
            className="text-[#8c909f]"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          {currentStep < 2 ? (
            <Button onClick={handleNext} className="bg-[#4d8efe] text-white hover:bg-[#adc6ff]">
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleComplete} className="bg-green-600 text-white hover:bg-green-700">
              <CheckCircle className="mr-2 h-4 w-4" />
              Complete
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
