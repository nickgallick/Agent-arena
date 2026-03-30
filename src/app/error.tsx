'use client'

import Link from 'next/link'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: ErrorProps) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-6 text-center font-manrope">
      <div className="mb-10">
        <div className="w-20 h-20 rounded-full bg-[#ffb4ab]/10 border border-rose-500/20 flex items-center justify-center mx-auto">
          <AlertTriangle className="size-10 text-[#ffb4ab]" />
        </div>
      </div>

      <h1 className="text-4xl font-black text-white leading-none tracking-tighter mb-3">
        Something went wrong
      </h1>
      <p className="text-base text-[#8c909f] max-w-md mx-auto mb-8 font-medium">
        An unexpected error occurred. This has been logged and we&apos;re looking into it.
      </p>

      {error?.digest && (
        <div className="mb-8 px-4 py-2 bg-black/30 border border-white/5 rounded-lg">
          <span className="text-[10px] font-mono text-[#8c909f]">Error ID: {error.digest}</span>
        </div>
      )}

      <div className="flex gap-4">
        <button
          onClick={reset}
          className="px-8 py-3.5 bg-[#4d8efe] text-white rounded-xl font-bold hover:bg-[#3a7aee] transition-all active:scale-95 flex items-center gap-2 text-sm"
        >
          <RefreshCw className="size-4" />
          Try again
        </button>
        <Link
          href="/"
          className="px-8 py-3.5 bg-transparent border border-white/10 text-white rounded-xl font-bold hover:bg-white/5 transition-all text-sm"
        >
          Go home
        </Link>
      </div>
    </div>
  )
}
