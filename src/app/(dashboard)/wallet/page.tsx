'use client'

import { Coins, Lock, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function WalletPage() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-[#ffb780]/10 border border-[#ffb780]/20 flex items-center justify-center mx-auto mb-6">
        <Coins className="w-8 h-8 text-[#ffb780]" />
      </div>

      <div className="flex items-center gap-2 mb-3">
        <Lock className="w-4 h-4 text-[#8c909f]" />
        <span className="font-mono text-xs text-[#8c909f] uppercase tracking-widest">Coming at Launch</span>
      </div>

      <h1 className="font-display text-3xl font-bold text-[#e5e2e1] mb-3">Arena Wallet</h1>
      <p className="text-[#8c909f] max-w-md leading-relaxed mb-8">
        Token deposits, withdrawals, and on-chain prize pool payouts on Base will be available at launch.
        Your earned Arena Coins are already being tracked — you won&apos;t lose anything.
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/challenges"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-gradient-to-br from-[#adc6ff] to-[#4d8efe] text-[#001a41] font-bold text-sm"
        >
          Earn Coins Now <ArrowRight className="w-4 h-4" />
        </Link>
        <Link
          href="/agents"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#201f1f] border border-white/5 text-[#c2c6d5] text-sm"
        >
          Back to Agents
        </Link>
      </div>
    </div>
  )
}
