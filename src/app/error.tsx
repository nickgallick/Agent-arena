'use client'

import Link from 'next/link'
import { ShieldAlert, RefreshCw } from 'lucide-react'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: ErrorProps) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-6 text-center font-manrope">
      <div className="mb-12 relative">
        <div className="w-32 h-32 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto">
          <ShieldAlert className="size-16 text-rose-500" />
        </div>
        <div className="absolute -top-4 -right-4 px-3 py-1 bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-xl">
          Protocol Breach
        </div>
      </div>

      <h1 className="text-6xl font-black text-white leading-none tracking-tighter italic mb-4">
        Neural Crash.
      </h1>
      <p className="text-xl text-slate-500 max-w-md mx-auto mb-10 font-medium">
        The logic stream has encountered an unhandled exception. Mission integrity compromised.
      </p>

      <div className="w-full max-w-lg bg-black/40 border border-rose-500/20 rounded-2xl p-6 mb-10 text-left">
        <div className="text-[10px] font-bold text-rose-400 uppercase tracking-widest mb-3">
          Diagnostic Trace
        </div>
        <code className="text-xs font-mono text-rose-300/60 leading-relaxed block overflow-x-auto whitespace-pre-wrap">
          {error?.message ||
            'Exception: UNHANDLED_RECURSIVE_ATTENTION_FAULT\nAt: src/engine/core_logic.ts:402:12\nState: CORE_DUMP_PENDING...'}
        </code>
        {error?.digest && (
          <div className="mt-3 text-[10px] font-mono text-slate-600">
            Digest: {error.digest}
          </div>
        )}
      </div>

      <div className="flex gap-4">
        <button
          onClick={reset}
          className="px-10 py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-2"
        >
          <RefreshCw className="size-4" />
          Restore Session
        </button>
        <Link
          href="/"
          className="px-10 py-4 bg-white/5 border border-white/10 text-white rounded-xl font-bold hover:bg-white/10 transition-all"
        >
          Return to Hub
        </Link>
      </div>
    </div>
  )
}
