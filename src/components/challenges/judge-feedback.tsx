'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { JudgeScore } from '@/types/judge'

const judgeLabels: Record<string, string> = {
  alpha: 'Technical Quality',
  beta: 'Creativity',
  gamma: 'Practical Value',
  tiebreaker: 'Tiebreaker',
}

const scoreBarColors: Record<string, string> = {
  quality: 'bg-[#4d8efe]',
  creativity: 'bg-purple-500',
  completeness: 'bg-emerald-500',
  practicality: 'bg-amber-500',
}

interface JudgeFeedbackProps {
  scores: JudgeScore[]
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const colorKey = label.toLowerCase()
  const barColor = scoreBarColors[colorKey] ?? 'bg-[#4d8efe]'

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-[#8c909f]">{label}</span>
        <span className="font-mono text-[#e5e2e1]">{value.toFixed(1)}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-zinc-700/50">
        <div
          className={cn('h-2 rounded-full transition-all', barColor)}
          style={{ width: `${(value / 10) * 100}%` }}
        />
      </div>
    </div>
  )
}

export function JudgeFeedback({ scores }: JudgeFeedbackProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const toggle = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="space-y-3">
      {scores.map((score) => {
        const isOpen = expanded[score.id] ?? false
        const label = judgeLabels[score.judge_type] ?? score.judge_type

        return (
          <div
            key={score.id}
            className="rounded-xl border border-[#424753]/15 bg-[#201f1f]/50 overflow-hidden"
          >
            <button
              type="button"
              onClick={() => toggle(score.id)}
              aria-expanded={isOpen}
              aria-label={`${isOpen ? 'Collapse' : 'Expand'} feedback for Judge ${score.judge_type}`}
              className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-zinc-700/30"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-[#e5e2e1]">
                  Judge {score.judge_type.charAt(0).toUpperCase() + score.judge_type.slice(1)}
                </span>
                <span className="text-xs text-[#8c909f]">{label}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-[#4d8efe]/15 px-2.5 py-0.5 text-xs font-bold text-[#adc6ff]">
                  {score.overall_score.toFixed(1)}
                </span>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 text-[#8c909f] transition-transform',
                    isOpen && 'rotate-180'
                  )}
                />
              </div>
            </button>

            {isOpen && (
              <div className="border-t border-[#424753]/15 px-4 py-4 space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <ScoreBar label="Quality" value={score.quality_score} />
                  <ScoreBar label="Creativity" value={score.creativity_score} />
                  <ScoreBar label="Completeness" value={score.completeness_score} />
                  <ScoreBar label="Practicality" value={score.practicality_score} />
                </div>

                {score.feedback && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-[#8c909f] mb-2">
                      Feedback
                    </h4>
                    <p className="text-sm text-zinc-300 leading-relaxed">
                      {score.feedback}
                    </p>
                  </div>
                )}

                {score.red_flags && score.red_flags.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-red-400 mb-2">
                      Red Flags
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {score.red_flags.map((flag, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center rounded-full bg-red-500/15 px-2.5 py-0.5 text-xs font-medium text-red-400"
                        >
                          {flag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
