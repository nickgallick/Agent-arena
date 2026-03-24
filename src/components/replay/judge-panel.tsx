'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface JudgeScore {
  id: string
  entry_id: string
  judge_type: string
  quality_score: number
  creativity_score: number
  completeness_score: number
  practicality_score: number
  overall_score: number
  feedback: string
  red_flags: string[]
}

interface JudgePanelProps {
  scores: JudgeScore[]
  finalScore: number
}

const categories = [
  { key: 'quality_score' as const, label: 'Quality' },
  { key: 'creativity_score' as const, label: 'Creativity' },
  { key: 'completeness_score' as const, label: 'Completeness' },
  { key: 'practicality_score' as const, label: 'Practicality' },
]

function ScoreBar({ score, max = 10 }: { score: number; max?: number }) {
  const pct = (score / max) * 100
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 flex-1 rounded-full bg-[#2a2a2a]/50">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-[#4d8efe]' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500'
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 text-right font-mono text-sm text-[#c2c6d5]">{score.toFixed(1)}</span>
    </div>
  )
}

function JudgeTypeLabel({ type }: { type: string }) {
  const labels: Record<string, { label: string; color: string }> = {
    technical: { label: 'Technical Judge', color: 'text-cyan-400' },
    creative: { label: 'Creative Judge', color: 'text-purple-400' },
    practical: { label: 'Practical Judge', color: 'text-[#ffb780]' },
  }
  const info = labels[type] ?? { label: type, color: 'text-[#8c909f]' }
  return <span className={cn('text-sm font-semibold', info.color)}>{info.label}</span>
}

export function JudgePanel({ scores, finalScore }: JudgePanelProps) {
  return (
    <Card className="border-[#424753]/15 bg-[#201f1f]/50">
      <CardHeader>
        <CardTitle className="text-[#e5e2e1]">Judge Scores</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {/* Final combined score */}
        <div className="flex flex-col items-center gap-1 rounded-xl border border-blue-500/20 bg-[#4d8efe]/5 py-4">
          <span className="text-xs font-medium uppercase tracking-wider text-[#e5e2e1]0">
            Final Score
          </span>
          <span className="text-4xl font-bold text-[#adc6ff]">{finalScore.toFixed(1)}</span>
          <span className="text-xs text-[#e5e2e1]0">out of 10</span>
        </div>

        {/* Individual judges */}
        {scores.map((score) => (
          <div key={score.id} className="flex flex-col gap-3">
            <JudgeTypeLabel type={score.judge_type} />

            <div className="flex flex-col gap-2">
              {categories.map((cat) => (
                <div key={cat.key} className="flex flex-col gap-1">
                  <span className="text-xs text-[#e5e2e1]0">{cat.label}</span>
                  <ScoreBar score={score[cat.key]} />
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between border-t border-[#424753]/15 pt-2">
              <span className="text-xs font-medium text-[#8c909f]">Overall</span>
              <span className="text-2xl font-bold text-[#e5e2e1]">{score.overall_score.toFixed(1)}</span>
            </div>

            {score.feedback && (
              <p className="rounded-md bg-[#1c1b1b]/50 p-3 text-xs leading-relaxed text-[#8c909f]">
                {score.feedback}
              </p>
            )}

            {score.red_flags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {score.red_flags.map((flag, i) => (
                  <span key={i} className="rounded bg-red-500/10 px-2 py-0.5 text-xs text-[#ffb4ab]">
                    {flag}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
