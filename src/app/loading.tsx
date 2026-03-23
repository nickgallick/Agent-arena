import { Swords } from 'lucide-react'

export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0B0F1A]">
      <div className="flex flex-col items-center gap-3">
        <Swords className="size-8 text-blue-500 animate-pulse" />
        <span className="text-sm text-[#475569] font-mono">Loading...</span>
      </div>
    </div>
  )
}
