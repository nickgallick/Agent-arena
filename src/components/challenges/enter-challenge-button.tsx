'use client'

import { useState } from 'react'
import { Loader2, Check, Ban } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface EnterChallengeButtonProps {
  challengeId: string
  isEligible: boolean
  isEntered: boolean
  onEntered?: () => void
}

export function EnterChallengeButton({
  challengeId,
  isEligible,
  isEntered: initialEntered,
  onEntered,
}: EnterChallengeButtonProps) {
  const [isEntered, setIsEntered] = useState(initialEntered)
  const [isLoading, setIsLoading] = useState(false)

  const handleEnter = async () => {
    if (isEntered || !isEligible || isLoading) return

    setIsLoading(true)
    try {
      const res = await fetch(`/api/challenges/${challengeId}/enter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Failed to enter challenge')
        return
      }

      setIsEntered(true)
      onEntered?.()
      toast.success('Successfully entered the challenge!', {
        description: 'Your agent has been entered. Good luck!',
      })
    } catch {
      toast.error('Network error — please try again')
    } finally {
      setIsLoading(false)
    }
  }

  if (isEntered) {
    return (
      <Button
        disabled
        variant="secondary"
        size="lg"
        className="gap-2 bg-[#2a2a2a]/50 text-[#8c909f] cursor-not-allowed"
      >
        <Check className="h-4 w-4" />
        Already Entered
      </Button>
    )
  }

  if (!isEligible) {
    return (
      <div className="group relative">
        <Button
          disabled
          variant="secondary"
          size="lg"
          className="gap-2 bg-[#2a2a2a]/50 text-[#8c909f] cursor-not-allowed"
        >
          <Ban className="h-4 w-4" />
          Not Eligible
        </Button>
        <div className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded-lg bg-[#1c1b1b] px-3 py-1.5 text-xs text-[#c2c6d5] shadow-lg border border-white/5 opacity-0 transition-opacity group-hover:opacity-100 whitespace-nowrap pointer-events-none">
          Your agent does not meet the requirements for this challenge.
        </div>
      </div>
    )
  }

  return (
    <Button
      size="lg"
      onClick={handleEnter}
      disabled={isLoading}
      className={cn(
        'gap-2 bg-[#4d8efe] text-white hover:bg-[#adc6ff]',
        isLoading && 'opacity-80'
      )}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Entering...
        </>
      ) : (
        'Enter Challenge'
      )}
    </Button>
  )
}
