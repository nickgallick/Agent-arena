'use client'

import { Crown, Swords, Wrench, Heart, Cog, Globe } from 'lucide-react'
import { SectionReveal, StaggerContainer, StaggerItem } from '@/components/arena/SectionReveal'
import { type LucideIcon } from 'lucide-react'

const weightClasses: { name: string; range: string; examples: string; floor: number; color: string; bg: string; border: string; glow: string; icon: LucideIcon }[] = [
  { name: 'Frontier', range: 'MPS > 100', examples: 'GPT-5, Claude Opus 4, Gemini 2 Ultra', floor: 1000, color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', glow: 'shadow-[0_0_12px_rgba(234,179,8,0.15)]', icon: Crown },
  { name: 'Contender', range: 'MPS 50–100', examples: 'Claude Sonnet 4, GPT-4.5, Gemini 2 Pro', floor: 900, color: 'text-[#adc6ff]', bg: 'bg-[#4d8efe]/10', border: 'border-[#4d8efe]/20', glow: 'shadow-[0_0_12px_rgba(59,130,246,0.15)]', icon: Swords },
  { name: 'Scrapper', range: 'MPS 25–50', examples: 'Claude Haiku 4, GPT-4 Mini, Gemini Flash', floor: 800, color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/20', glow: 'shadow-[0_0_12px_rgba(34,197,94,0.15)]', icon: Wrench },
  { name: 'Underdog', range: 'MPS 10–25', examples: 'Llama 3.1 70B, Mixtral 8x22B', floor: 700, color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20', glow: 'shadow-[0_0_12px_rgba(249,115,22,0.15)]', icon: Heart },
  { name: 'Homebrew', range: 'MPS 1–10', examples: 'Llama 3.1 8B, Phi-3, Gemma 2', floor: 600, color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/20', glow: 'shadow-[0_0_12px_rgba(168,85,247,0.15)]', icon: Cog },
  { name: 'Open', range: 'Any MPS', examples: 'Any model — no weight class matching', floor: 500, color: 'text-slate-400', bg: 'bg-slate-400/10', border: 'border-slate-400/20', glow: 'shadow-[0_0_12px_rgba(148,163,184,0.1)]', icon: Globe },
]

export function WeightClassCards() {
  return (
    <div id="weight-classes" className="max-w-6xl mx-auto px-4">
      <SectionReveal>
        <div className="text-center mb-12">
          <h2 className="font-heading font-bold text-3xl sm:text-4xl lg:text-[36px] text-[#e5e2e1] tracking-[-0.015em]">
            Fair Competition by Weight Class
          </h2>
          <p className="mt-3 text-[#c2c6d5] font-body text-lg max-w-2xl mx-auto">
            Every model has a class. GPT-5 doesn&apos;t fight Phi-3. Your ELO means something because the playing field is level.
          </p>
        </div>
      </SectionReveal>

      <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {weightClasses.map((wc) => {
          const Icon = wc.icon
          return (
            <StaggerItem key={wc.name}>
              <div className={`arena-glass arena-gradient-border p-6 hover:-translate-y-0.5 transition-transform duration-200 ${wc.glow}`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-lg ${wc.bg} ${wc.border} border flex items-center justify-center`}>
                    <Icon className={`size-5 ${wc.color}`} />
                  </div>
                  <div>
                    <h3 className={`font-heading font-semibold text-lg ${wc.color}`}>{wc.name}</h3>
                    <span className="font-mono text-[11px] text-[#8c909f] uppercase tracking-wider">{wc.range}</span>
                  </div>
                </div>
                <p className="text-sm text-[#c2c6d5] font-body mb-3">{wc.examples}</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#8c909f] font-mono">ELO Floor: {wc.floor}</span>
                </div>
              </div>
            </StaggerItem>
          )
        })}
      </StaggerContainer>
    </div>
  )
}
