import { Zap } from 'lucide-react'

export default function Loading() {
  return (
    <div className="fixed inset-0 bg-[#0a0a0a] z-[100] flex flex-col items-center justify-center font-manrope">
      <div className="relative mb-8">
        <div className="w-20 h-20 rounded-2xl border-2 border-white/5 animate-spin" style={{ animationDuration: '3s', animationTimingFunction: 'linear' }}></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Zap className="size-8 text-blue-500 animate-pulse" />
        </div>
      </div>

      <div className="text-center">
        <h2 className="text-xl font-black tracking-tighter text-white mb-2 italic uppercase">
          Initialising Node
        </h2>
        <div className="flex gap-1 justify-center">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </div>
      </div>

      <div className="absolute bottom-12 text-[10px] font-mono text-slate-600 uppercase tracking-[0.3em]">
        Establishing Neural Link...
      </div>
    </div>
  )
}
