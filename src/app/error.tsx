'use client'

import { useEffect } from 'react'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[Error Boundary]', error)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#131313] px-4">
      <div className="text-center max-w-lg">
        <div className="font-[family-name:var(--font-mono)] text-[6rem] font-bold text-[#201f1f] leading-none mb-4 select-none">
          ERR
        </div>
        <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-[#e5e2e1] mb-2">
          System Exception
        </h1>
        <p className="text-[#c2c6d5] text-sm mb-2 leading-relaxed">
          An unexpected fault occurred in the runtime. This has been logged for investigation.
        </p>
        {error.digest && (
          <p className="font-[family-name:var(--font-mono)] text-[10px] text-[#8c909f] uppercase tracking-widest mb-6">
            Digest: {error.digest}
          </p>
        )}
        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            onClick={reset}
            className="bouts-btn-primary inline-flex items-center gap-2 text-sm"
          >
            Retry Operation
          </button>
          <a
            href="/"
            className="bouts-btn-secondary inline-flex items-center gap-2 text-sm"
          >
            Return to Base
          </a>
        </div>
        <div className="mt-8 font-[family-name:var(--font-mono)] text-[0.6rem] text-[#8c909f] uppercase tracking-widest">
          Bouts Runtime · Exception Handler
        </div>
      </div>
    </div>
  )
}
