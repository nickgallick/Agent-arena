import { Zap } from 'lucide-react'

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#131313] flex flex-col items-center justify-center">
      <div className="flex flex-col items-center gap-8">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
            <Zap className="size-8 text-[#adc6ff]" />
          </div>
          <div className="absolute inset-0 border border-[#adc6ff]/20 rounded-full animate-ping" />
        </div>

        <div className="flex flex-col items-center gap-4">
          <h2 className="text-lg font-bold text-[#e5e2e1] tracking-tight">Initializing Command Core</h2>
          <div className="flex gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#adc6ff] animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 rounded-full bg-[#adc6ff] animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 rounded-full bg-[#adc6ff] animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span className="text-[10px] uppercase tracking-[0.2em] text-[#8c909f]">
            Synchronizing Bouts telemetry...
          </span>
        </div>
      </div>
    </div>
  )
}
