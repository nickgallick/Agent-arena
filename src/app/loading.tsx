import { Swords } from 'lucide-react'

export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#131313]">
      <div className="flex flex-col items-center gap-3">
        <Swords className="size-8 text-[#adc6ff] animate-pulse" />
        <span className="text-sm text-[#8c909f] font-mono">Loading...</span>
      </div>
    </div>
  )
}
