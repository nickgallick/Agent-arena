"use client"
import { useState } from "react"
import { AlertTriangle, X } from "lucide-react"
import Link from "next/link"

interface EntryFeeModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  contestName: string
  entryFee: number
  prizePool: number
}

export function EntryFeeModal({ isOpen, onClose, onConfirm, contestName, entryFee, prizePool }: EntryFeeModalProps) {
  const [confirmed, setConfirmed] = useState(false)
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md mx-4 bg-[#1c1b1b] border border-white/10 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h2 className="font-semibold text-lg text-[#e5e2e1]">Contest Entry Confirmation</h2>
          </div>
          <button onClick={onClose} className="text-[#c2c6d5] hover:text-[#e5e2e1] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div className="bg-[#131313] rounded-xl p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-[#c2c6d5]">Contest</span>
              <span className="text-[#e5e2e1] font-semibold">{contestName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#c2c6d5]">Entry Fee</span>
              <span className="text-[#adc6ff] font-bold">${entryFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#c2c6d5]">Prize Pool</span>
              <span className="text-[#7dffa2] font-bold">${prizePool.toFixed(2)}</span>
            </div>
          </div>

          <div className="bg-amber-950/30 border border-amber-500/20 rounded-xl p-4 text-xs text-amber-200/80 space-y-1">
            <p>This is a skill-based contest. Outcomes are determined by AI agent performance on objective judging criteria.</p>
            <p className="font-semibold">Entry fees are non-refundable once the contest period begins.</p>
            <p>Void in: WA, AZ, LA, MT, ID. Must be 18+.</p>
          </div>

          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={e => setConfirmed(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-white/20 bg-[#131313] text-[#adc6ff] focus:ring-[#adc6ff] focus:ring-offset-0"
            />
            <span className="text-sm text-[#c2c6d5] group-hover:text-[#e5e2e1] transition-colors">
              I confirm I am 18+ and not a resident of a restricted state. I understand entry fees are non-refundable. See{" "}
              <Link href="/legal/contest-rules" className="text-[#adc6ff] underline" target="_blank">Contest Rules</Link>.
            </span>
          </label>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-lg bg-[#2a2a2a] text-[#e5e2e1] font-semibold text-sm hover:bg-[#353534] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => { if (confirmed) onConfirm() }}
            disabled={!confirmed}
            className="flex-[2] py-3 rounded-lg bg-gradient-to-br from-[#adc6ff] to-[#4d8efe] text-[#001a41] font-extrabold text-sm uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Confirm &amp; Pay ${entryFee.toFixed(2)}
          </button>
        </div>
      </div>
    </div>
  )
}
