export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#131313]">
      <div className="flex flex-col items-center gap-4">
        {/* Animated ring */}
        <div className="relative size-12">
          <div className="absolute inset-0 rounded-full border-2 border-[#201f1f]" />
          <div className="absolute inset-0 rounded-full border-2 border-t-[#adc6ff] animate-spin" />
        </div>
        <span className="font-[family-name:var(--font-mono)] text-[0.65rem] text-[#8c909f] uppercase tracking-widest">
          Initializing...
        </span>
      </div>
    </div>
  )
}
