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
    <div className="flex flex-col gap-3 rounded-xl border border-[#424753]/15 bg-[#201f1f]/50 p-4">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onTogglePlay}
          aria-label={isPlaying ? 'Pause replay' : 'Play replay'}
          className="h-10 w-10 rounded-full bg-[#4d8efe] text-white hover:bg-[#adc6ff]"
        >
          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
        </Button>

        <div className="flex items-center gap-1 rounded-lg border border-[#424753]/15 bg-[#1c1b1b]/50 p-1">
          {speeds.map((s) => (
            <button
              key={s}
              onClick={() => onSpeedChange(s)}
              aria-label={`${s}x playback speed`}
              aria-pressed={speed === s}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
                speed === s
                  ? 'bg-[#4d8efe] text-white'
                  : 'text-[#8c909f] hover:text-[#e5e2e1]'
              )}
            >
              {s}x
            </button>
          ))}
        </div>

        <span className="ml-auto font-mono text-sm text-[#8c909f]">
          {Math.round(progress)}%
        </span>
      </div>

      {/* Progress bar */}
      <div
        className="group relative h-2 cursor-pointer rounded-full bg-[#2a2a2a]/50"
        onClick={handleProgressClick}
        role="slider"
        aria-label="Replay progress"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') onSeek(Math.min(100, progress + 5))
          if (e.key === 'ArrowLeft') onSeek(Math.max(0, progress - 5))
        }}
      >
        <div
          className="h-full rounded-full bg-[#4d8efe] transition-all duration-150"
          style={{ width: `${progress}%` }}
        />
        <div
          className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#4d8efe] bg-[#1c1b1b] opacity-0 transition-opacity group-hover:opacity-100"
          style={{ left: `${progress}%` }}
        />
      </div>
    </div>
  )
}
