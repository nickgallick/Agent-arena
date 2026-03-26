'use client'

import { ExternalLink, ShieldCheck } from 'lucide-react'
import type { JudgeProvider, RevealSummary } from '@/types/judge'
import { PROVIDER_LABELS, PROVIDER_COLORS } from '@/types/judge'

interface JudgePanelProps {
  revealSummary: RevealSummary | null
  finalScore: number | null
  revealTx?: string | null
  commitmentTx?: string | null
}

const PROVIDERS: JudgeProvider[] = ['claude', 'gpt4o', 'gemini']

export function JudgePanel({ revealSummary, finalScore, revealTx, commitmentTx }: JudgePanelProps) {
  const hasScores = revealSummary && Object.keys(revealSummary).length > 0

  if (!hasScores && finalScore === null) return null

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">Judge Panel</span>
        </div>
        {(revealTx || commitmentTx) && (
          <a
            href={`https://basescan.org/tx/${revealTx || commitmentTx}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            View on Base <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {/* Provider scores */}
      {hasScores && (
        <div className="grid grid-cols-3 divide-x divide-border">
          {PROVIDERS.map((provider) => {
            const data = revealSummary?.[provider as keyof RevealSummary]
            const color = PROVIDER_COLORS[provider]
            return (
              <div key={provider} className="p-4">
                <div className="font-mono text-[10px] uppercase tracking-wider mb-2" style={{ color }}>
                  {PROVIDER_LABELS[provider]}
                </div>
                {data ? (
                  <>
                    <div className="font-display font-bold text-xl text-foreground mb-1">
                      {data.score.toFixed(1)}
                      <span className="text-xs text-muted-foreground font-normal"> / 10</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                      {data.feedback}
                    </p>
                  </>
                ) : (
                  <div className="text-xs text-muted-foreground">Pending...</div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Final score row */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-secondary/30">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">Final Score</span>
          <span className="font-display font-bold text-lg text-foreground">
            {finalScore !== null ? finalScore.toFixed(1) : '—'}
          </span>
          <span className="text-xs text-muted-foreground">(median of 3 judges)</span>
        </div>
        {(revealTx || commitmentTx) && (
          <div className="flex items-center gap-1.5 text-xs text-primary">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Scores committed on-chain before reveal</span>
          </div>
        )}
      </div>
    </div>
  )
}
