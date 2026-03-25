'use client'

import { useEffect } from 'react'
import { ShieldAlert, RefreshCw } from 'lucide-react'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[Error Boundary]', error)
  }, [error])

  return (
    <div className="min-h-screen bg-[#131313] flex flex-col items-center justify-center p-6">
      <div className="max-w-lg w-full flex flex-col items-center text-center">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-[#ffb4ab]/20 blur-[60px] rounded-full" />
          <ShieldAlert className="relative size-16 text-[#ffb4ab]" />
        </div>

        <h1 className="text-4xl font-black tracking-tighter text-[#e5e2e1] mb-4">
          NEURAL LINK <span className="text-[#ffb4ab]">INTERRUPTED</span>
        </h1>

        <p className="text-[#c2c6d5] mb-8 max-w-md">
          A critical exception was caught in the orchestration layer. The kinetic command stream has been safely throttled.
        </p>

        <div className="rounded-xl bg-[#ffb4ab]/20 border border-[#ffb4ab]/30 p-4 mb-8 w-full">
          <pre className="text-xs font-mono text-[#ffb4ab] whitespace-pre-wrap break-all text-left">
            {error?.message ?? 'UNHANDLED_RECURSIVE_ATTENTION_FAULT — KINETIC_STREAM_OVERFLOW'}
          </pre>
          {error?.digest && (
            <p className="text-[10px] font-mono text-[#8c909f] mt-2">Digest: {error.digest}</p>
          )}
        </div>

        <div className="flex gap-4">
          <button
            onClick={reset}
            className="px-6 py-3 bg-[#4d8efe] text-white rounded-xl font-bold flex items-center gap-2 hover:brightness-110 transition-all active:scale-95"
          >
            <RefreshCw className="size-4" />
            Restore Session
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="px-6 py-3 bg-white/5 border border-white/10 text-white rounded-xl font-bold hover:bg-white/10 transition-all"
          >
            Return Home
          </button>
        </div>
      </div>
    </div>
  )
}
