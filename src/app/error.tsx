'use client'

import { useEffect } from 'react'
import { AlertTriangle, RotateCcw, AlertOctagon, Terminal } from 'lucide-react'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[Error Boundary]', error)
  }, [error])

  return (
    <div className="bg-background text-on-surface font-body selection:bg-primary/30 min-h-screen flex flex-col">
      <main className="flex-grow flex items-center justify-center p-6 mt-16">
        <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Error Graphic Section */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center space-y-8 py-12">
            <div className="relative w-48 h-48 flex items-center justify-center">
              {/* Decorative Radial Glow */}
              <div className="absolute inset-0 bg-error/20 blur-[60px] rounded-full" />
              {/* Error Icon Orbitals */}
              <div className="absolute inset-0 border border-error/20 rounded-full animate-pulse" />
              <div className="absolute inset-4 border border-error/10 rounded-full" />
              <div className="relative bg-error-gradient p-8 rounded-full shadow-2xl shadow-error/30">
                <AlertTriangle className="text-on-error !text-6xl w-12 h-12" style={{ fill: 'currentColor' }} />
              </div>
            </div>
            <div className="text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-error-container/30 border border-error/20">
                <span className="w-2 h-2 rounded-full bg-error animate-ping" />
                <span className="font-label text-xs uppercase tracking-widest text-error">CRITICAL_EXCEPTION</span>
              </div>
              <h1 className="font-headline text-4xl lg:text-5xl font-extrabold tracking-tighter text-on-surface">
                NEURAL LINK <br /><span className="text-error">INTERRUPTED</span>
              </h1>
            </div>
          </div>

          {/* Content & Actions Section */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-surface-container-low p-8 rounded-xl shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Terminal className="!text-9xl w-24 h-24" />
              </div>
              <div className="relative z-10 space-y-6">
                <p className="text-on-surface-variant text-lg leading-relaxed max-w-lg">
                  A critical exception was caught in the orchestration layer. The kinetic command stream has been safely throttled to prevent agent misalignment.
                </p>
                <div className="flex flex-wrap gap-4 pt-4">
                  <button
                    onClick={reset}
                    className="bg-primary-gradient text-on-primary-fixed px-6 py-3 rounded-lg font-bold flex items-center gap-3 shadow-lg shadow-primary/20 hover:opacity-90 transition-all scale-100 active:scale-95"
                  >
                    <RotateCcw className="w-5 h-5" />
                    Re-initialize Session
                  </button>
                  <button className="bg-surface-container-high text-primary px-6 py-3 rounded-lg font-bold flex items-center gap-3 hover:bg-surface-container-highest transition-all scale-100 active:scale-95">
                    <AlertOctagon className="w-5 h-5" />
                    Report Incident
                  </button>
                </div>
              </div>
            </div>

            {/* Stack Trace / Logs Section */}
            <div className="bg-surface-container-lowest rounded-xl overflow-hidden border border-outline-variant/15">
              <div className="bg-surface-container-high px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Terminal className="text-tertiary w-5 h-5" />
                  <span className="font-label text-sm font-semibold text-on-surface-variant uppercase tracking-wider">Stack Trace Output</span>
                </div>
                <span className="text-[10px] font-label text-on-surface-variant/50">ID: BE-992-UXL</span>
              </div>
              <div className="p-6 font-label text-xs leading-relaxed max-h-[250px] overflow-y-auto space-y-2">
                <div className="flex gap-4">
                  <span className="text-on-surface-variant/40 select-none">001</span>
                  <span className="text-secondary-fixed-dim">[SYS] Initializing Bouts_Core... Success.</span>
                </div>
                <div className="flex gap-4">
                  <span className="text-on-surface-variant/40 select-none">002</span>
                  <span className="text-secondary-fixed-dim">[AGENT] Handshake with &apos;Alpha-9&apos; established at 14ms.</span>
                </div>
                <div className="flex gap-4">
                  <span className="text-on-surface-variant/40 select-none">003</span>
                  <span className="text-error font-bold">EXCEPTION: NullPointerReference at OrchestrationLayer.js:842:12</span>
                </div>
                <div className="flex gap-4">
                  <span className="text-on-surface-variant/40 select-none">004</span>
                  <span className="text-on-surface-variant/60">at dispatchEvent (internal/process/task_queues.js:95:5)</span>
                </div>
                <div className="flex gap-4">
                  <span className="text-on-surface-variant/40 select-none">005</span>
                  <span className="text-on-surface-variant/60">at processTicksAndRejections (internal/process/task_queues.js:75:11)</span>
                </div>
                <div className="flex gap-4">
                  <span className="text-on-surface-variant/40 select-none">006</span>
                  <span className="text-error font-bold">FATAL: Kinetic stream buffer overflow. Emergency shutdown engaged.</span>
                </div>
                <div className="flex gap-4">
                  <span className="text-on-surface-variant/40 select-none">007</span>
                  <span className="text-tertiary-fixed-dim">[INFO] Context dumped to /logs/crash_dump_2024_10_24.bin</span>
                </div>
                <div className="flex gap-4">
                  <span className="text-on-surface-variant/40 select-none">008</span>
                  <span className="text-on-surface-variant/60">... End of Trace ...</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 px-2">
              <div className="h-[1px] flex-grow bg-outline-variant/20" />
              <p className="text-[10px] font-label text-on-surface-variant/40 uppercase tracking-[0.2em]">Safety Protocol 44-B Active</p>
              <div className="h-[1px] flex-grow bg-outline-variant/20" />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
