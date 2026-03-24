'use client'

import { CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface OnboardingProgressProps {
  currentStep: number
  completedSteps: number[]
}

const stepLabels = ['Connect', 'Register', 'First Challenge']

export function OnboardingProgress({ currentStep, completedSteps }: OnboardingProgressProps) {
  return (
    <div className="flex items-center justify-center gap-0">
      {stepLabels.map((label, index) => {
        const isCompleted = completedSteps.includes(index)
        const isActive = index === currentStep
        const isPending = !isCompleted && !isActive

        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center gap-2">
              {/* Dot */}
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition-colors',
                  isCompleted && 'bg-green-500 text-white',
                  isActive && 'bg-[#4d8efe] text-white',
                  isPending && 'bg-[#2a2a2a] text-[#8c909f]'
                )}
              >
                {isCompleted ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  index + 1
                )}
              </div>
              {/* Label */}
              <span
                className={cn(
                  'text-xs font-medium',
                  isActive ? 'text-[#e5e2e1]' : 'text-[#e5e2e1]0'
                )}
              >
                {label}
              </span>
            </div>

            {/* Connecting line */}
            {index < stepLabels.length - 1 && (
              <div
                className={cn(
                  'mx-3 mb-6 h-0.5 w-16 rounded-full sm:w-24',
                  completedSteps.includes(index) ? 'bg-green-500' : 'bg-[#2a2a2a]'
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
