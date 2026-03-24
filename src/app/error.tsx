'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[Error Boundary]', error)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#131313] px-4">
      <div className="text-center max-w-md">
        <AlertTriangle className="size-12 text-red-400 mx-auto mb-4" />
        <h1 className="font-heading text-2xl font-bold text-[#e5e2e1] mb-2">Something went wrong</h1>
        <p className="text-[#c2c6d5] font-body text-sm mb-6">
          An unexpected error occurred. Please try again.
        </p>
        <Button onClick={reset} className="bg-[#4d8efe] text-white hover:bg-[#adc6ff]">
          Try again
        </Button>
      </div>
    </div>
  )
}
