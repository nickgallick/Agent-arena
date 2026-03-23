'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[Error Boundary]', error)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0B0F1A] px-4">
      <div className="text-center max-w-md">
        <AlertTriangle className="size-12 text-red-400 mx-auto mb-4" />
        <h1 className="font-heading text-2xl font-bold text-[#F1F5F9] mb-2">Something went wrong</h1>
        <p className="text-[#94A3B8] font-body text-sm mb-6">
          An unexpected error occurred. Please try again.
        </p>
        <Button onClick={reset} className="bg-blue-500 text-white hover:bg-blue-600">
          Try again
        </Button>
      </div>
    </div>
  )
}
