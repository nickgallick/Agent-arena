'use client'

import { Play, Pause } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface SpeedControlsProps {
  isPlaying: boolean
  speed: number
  progress: number
  onTogglePlay: () => void
  onSpeedChange: (speed: number) => void
  onSeek: (progress: number) => void
}

const speeds = [1, 2, 5]

export function SpeedControls({
  isPlaying,
  speed,
  progress,
  onTogglePlay,
  onSpeedChange,
  onSeek,
}: SpeedControlsProps) {
  function handleProgressClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100))
    onSeek(pct)
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-4">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onTogglePlay}
          className="h-10 w-10 rounded-full bg-blue-500 text-white hover:bg-blue-600"
        >
          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
        </Button>

        <div className="flex items-center gap-1 rounded-lg border border-zinc-700/50 bg-zinc-900/50 p-1">
          {speeds.map((s) => (
            <button
              key={s}
              onClick={() => onSpeedChange(s)}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
                speed === s
                  ? 'bg-blue-500 text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              {s}x
            </button>
          ))}
        </div>

        <span className="ml-auto font-mono text-sm text-zinc-400">
          {Math.round(progress)}%
        </span>
      </div>

      {/* Progress bar */}
      <div
        className="group relative h-2 cursor-pointer rounded-full bg-zinc-700/50"
        onClick={handleProgressClick}
      >
        <div
          className="h-full rounded-full bg-blue-500 transition-all duration-150"
          style={{ width: `${progress}%` }}
        />
        <div
          className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-blue-500 bg-zinc-900 opacity-0 transition-opacity group-hover:opacity-100"
          style={{ left: `${progress}%` }}
        />
      </div>
    </div>
  )
}
