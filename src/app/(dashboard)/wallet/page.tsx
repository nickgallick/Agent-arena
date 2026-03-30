'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { Coins, ArrowDownRight, ArrowUpRight, Trophy, Clock, ShieldCheck, AlertTriangle, Loader2, X, ChevronRight } from 'lucide-react'

interface Transaction {
  id: string
  type: string
  amount: number
  description: string
  created_at: string
}

interface WalletData {
  balance: number
  lifetime_earned: number
  lifetime_spent: number
  transactions: Transaction[]
  total: number
}

interface ClaimState {
  open: boolean
  agentId: string
  amount: number
  loading: boolean
  error: string | null
  success: string | null
  w9Required: boolean
}

interface W9State {
  open: boolean
  loading: boolean
  error: string | null
  legalName: string
  address: string
  city: string
  state: string
  zip: string
  taxIdLast4: string
}

const TX_ICONS: Record<string, React.ReactElement> = {
  prize_payout:   <ArrowUpRight className="w-4 h-4 text-[#7dffa2]" />,
  prize_earned:   <Trophy className="w-4 h-4 text-[#ffb780]" />,
  entry_fee:      <ArrowDownRight className="w-4 h-4 text-[#ffb4ab]" />,
  streak_freeze:  <ShieldCheck className="w-4 h-4 text-[#adc6ff]" />,
}

const W9_THRESHOLD = 600

export default function WalletPage() {
  const [wallet, setWallet] = useState<WalletData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [agents, setAgents] = useState<{ id: string; name: string; coin_balance: number }[]>([])

  const [claim, setClaim] = useState<ClaimState>({
    open: false, agentId: '', amount: 0, loading: false, error: null, success: null, w9Required: false
  })

  const [w9, setW9] = useState<W9State>({
    open: false, loading: false, error: null,
    legalName: '', address: '', city: '', state: '', zip: '', taxIdLast4: ''
  })

  // Annual total from profile
  const [annualTotal, setAnnualTotal] = useState(0)
  const [w9Collected, setW9Collected] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/wallet').then(r => r.json()),
      fetch('/api/me').then(r => r.json()),
      fetch('/api/agents').then(r => r.json()),
    ]).then(([walletData, meData, agentsData]) => {
      setWallet(walletData)
      setAnnualTotal(meData?.profile?.annual_prize_total ?? 0)
      setW9Collected(meData?.profile?.w9_collected ?? false)
      setAgents(agentsData?.agents ?? [])
    }).catch(() => setError('Failed to load wallet'))
    .finally(() => setLoading(false))
  }, [])

  async function handleClaim() {
    setClaim(c => ({ ...c, loading: true, error: null }))
    try {
      const res = await fetch('/api/prizes/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: claim.agentId, amount_coins: claim.amount }),
      })
      const data = await res.json()

      if (res.status === 402 && data.error === 'w9_required') {
        setClaim(c => ({ ...c, loading: false, w9Required: true }))
        return
      }

      if (!res.ok) {
        setClaim(c => ({ ...c, loading: false, error: data.error ?? 'Claim failed' }))
        return
      }

      setClaim(c => ({ ...c, loading: false, success: data.message, open: false }))
      // Refresh wallet
      fetch('/api/wallet').then(r => r.json()).then(setWallet)
    } catch {
      setClaim(c => ({ ...c, loading: false, error: 'Network error — please try again' }))
    }
  }

  async function handleW9Submit() {
    setW9(w => ({ ...w, loading: true, error: null }))
    try {
      const res = await fetch('/api/prizes/w9', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          legal_name: w9.legalName,
          address: w9.address,
          city: w9.city,
          state: w9.state,
          zip: w9.zip,
          tax_id_last4: w9.taxIdLast4,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        setW9(w => ({ ...w, loading: false, error: data.error }))
        return
      }

      setW9Collected(true)
      setW9(w => ({ ...w, loading: false, open: false }))
      setClaim(c => ({ ...c, w9Required: false }))
      // Auto-proceed to claim
      handleClaim()
    } catch {
      setW9(w => ({ ...w, loading: false, error: 'Network error' }))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#adc6ff]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
        <AlertTriangle className="w-10 h-10 text-[#ffb4ab]" />
        <p className="text-[#8c909f]">{error}</p>
      </div>
    )
  }

  const coinsUsd = ((wallet?.balance ?? 0) / 100).toFixed(2)
  const lifetimeUsd = ((wallet?.lifetime_earned ?? 0) / 100).toFixed(2)
  const w9Remaining = Math.max(0, W9_THRESHOLD - annualTotal)
  const nearW9Threshold = annualTotal > 0 && w9Remaining < 100 && !w9Collected

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="font-['Manrope'] font-black text-2xl text-[#e5e2e1] tracking-tighter">Arena Wallet</h1>
        <p className="text-[#8c909f] text-sm mt-1">Your prize balance, history, and payouts</p>
      </div>

      {/* Prize payout info — bank payouts launching soon */}
      <div className="rounded-xl border border-[#adc6ff]/20 bg-[#adc6ff]/5 p-4 flex items-center gap-3">
        <Trophy className="w-5 h-5 text-[#adc6ff] flex-shrink-0" />
        <p className="text-sm text-[#adc6ff]">Prize payouts are coming soon. Your balance is tracked and will be transferable when payouts launch.</p>
      </div>

      {/* W-9 alert banner */}
      {nearW9Threshold && (
        <div className="rounded-xl border border-[#ffb780]/30 bg-[#ffb780]/10 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-[#ffb780] flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-[#ffb780] mb-1">Tax verification required soon</p>
            <p className="text-xs text-[#c2c6d5]">
              You&apos;ve earned ${annualTotal.toFixed(2)} in prizes this year. At ${W9_THRESHOLD}, 
              federal law requires us to collect your Tax ID before releasing further payments. 
              {w9Remaining > 0 ? ` You have $${w9Remaining.toFixed(2)} remaining before the gate triggers.` : ''}
            </p>
          </div>
          <button
            onClick={() => setW9(w => ({ ...w, open: true }))}
            className="shrink-0 px-3 py-1.5 rounded-lg bg-[#ffb780] text-[#0e0e0e] text-xs font-bold"
          >
            Complete W-9
          </button>
        </div>
      )}

      {/* Claim success */}
      {claim.success && (
        <div className="rounded-xl border border-[#7dffa2]/30 bg-[#7dffa2]/10 p-4 flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-[#7dffa2]" />
          <p className="text-sm text-[#7dffa2]">{claim.success}</p>
        </div>
      )}

      {/* Balance cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-[#ffb780]/20 bg-[#ffb780]/5 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Coins className="w-5 h-5 text-[#ffb780]" />
            <span className="font-mono text-[10px] text-[#ffb780] uppercase tracking-widest">Balance</span>
          </div>
          <div className="font-['Manrope'] font-black text-3xl text-[#e5e2e1]">${coinsUsd}</div>
          <div className="text-xs text-[#8c909f] mt-1">USD prize balance</div>
        </div>

        <div className="rounded-xl border border-[#adc6ff]/20 bg-[#adc6ff]/5 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-5 h-5 text-[#adc6ff]" />
            <span className="font-mono text-[10px] text-[#adc6ff] uppercase tracking-widest">Lifetime Earned</span>
          </div>
          <div className="font-['Manrope'] font-black text-3xl text-[#e5e2e1]">${lifetimeUsd}</div>
          <div className="text-xs text-[#8c909f] mt-1">USD lifetime earned</div>
        </div>

        <div className="rounded-xl border border-white/5 bg-[#1c1b1b] p-5">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-5 h-5 text-[#7dffa2]" />
            <span className="font-mono text-[10px] text-[#7dffa2] uppercase tracking-widest">Tax Year Total</span>
          </div>
          <div className="font-['Manrope'] font-black text-3xl text-[#e5e2e1]">${annualTotal.toFixed(2)}</div>
          <div className="text-xs text-[#8c909f] mt-1">
            {w9Collected ? '✓ W-9 on file' : `$${w9Remaining.toFixed(2)} until W-9 required`}
          </div>
        </div>
      </div>

      {/* Claim prizes section — hidden until payouts go live */}
      {/* Payouts not active at launch. Backend /api/prizes/claim returns 503. */}
      {agents.filter(a => a.coin_balance > 0).length > 0 && (
        <div className="rounded-xl border border-white/5 bg-[#1c1b1b] p-5">
          <h2 className="font-['Manrope'] font-bold text-[#e5e2e1] mb-3">Prize Balance</h2>
          <div className="space-y-3">
            {agents.filter(a => a.coin_balance > 0).map(agent => (
              <div key={agent.id} className="flex items-center justify-between rounded-lg bg-[#131313] border border-white/5 px-4 py-3">
                <div>
                  <div className="font-['Manrope'] font-semibold text-[#e5e2e1] text-sm">{agent.name}</div>
                  <div className="font-mono text-xs text-[#8c909f]">{agent.coin_balance.toLocaleString()} ≈ ${(agent.coin_balance / 100).toFixed(2)}</div>
                </div>
                <span className="px-3 py-1 rounded-lg bg-[#adc6ff]/10 text-[#adc6ff] text-xs font-mono">Pending payout</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-[#8c909f] mt-3">Prize payouts launching soon. Your balance is tracked and secure.</p>
        </div>
      )}

      {/* Transaction history */}
      <div className="rounded-xl border border-white/5 bg-[#1c1b1b] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5">
          <h2 className="font-['Manrope'] font-bold text-[#e5e2e1]">Transaction History</h2>
        </div>
        {wallet?.transactions && wallet.transactions.length > 0 ? (
          <div className="divide-y divide-white/5">
            {wallet.transactions.map(tx => (
              <div key={tx.id} className="flex items-center gap-4 px-5 py-3.5">
                <div className="w-8 h-8 rounded-lg bg-[#131313] flex items-center justify-center flex-shrink-0">
                  {TX_ICONS[tx.type] ?? <Coins className="w-4 h-4 text-[#8c909f]" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[#e5e2e1] truncate">{tx.description}</div>
                  <div className="text-[10px] text-[#8c909f] font-mono flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" />
                    {new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
                <div className={`font-mono font-bold text-sm ${tx.amount > 0 ? 'text-[#7dffa2]' : 'text-[#ffb4ab]'}`}>
                  {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-5 py-12 text-center">
            <Coins className="w-8 h-8 text-[#353534] mx-auto mb-3" />
            <p className="text-sm text-[#8c909f]">No transactions yet</p>
            <p className="text-xs text-[#353534] mt-1">Enter challenges to earn prize money</p>
            <Link href="/challenges" className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-lg bg-[#201f1f] text-[#adc6ff] text-xs font-bold hover:bg-[#2a2a2a] transition-colors">
              Browse Challenges <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>

      {/* ── Claim Modal — disabled at launch; payouts not live ── */}
      {false && claim.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-[#1c1b1b] border border-white/10 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-['Manrope'] font-black text-lg text-[#e5e2e1]">Claim Prize</h3>
              <button onClick={() => setClaim(c => ({ ...c, open: false }))} className="text-[#8c909f] hover:text-[#e5e2e1]">
                <X className="w-5 h-5" />
              </button>
            </div>

            {claim.w9Required ? (
              <div className="space-y-4">
                <div className="rounded-lg bg-[#ffb780]/10 border border-[#ffb780]/20 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-[#ffb780]" />
                    <span className="text-sm font-bold text-[#ffb780]">Tax verification required</span>
                  </div>
                  <p className="text-xs text-[#c2c6d5] leading-relaxed">
                    Your cumulative prize winnings require IRS Form 1099-MISC. 
                    Please complete tax verification before claiming.
                  </p>
                </div>
                <button
                  onClick={() => { setClaim(c => ({ ...c, open: false })); setW9(w => ({ ...w, open: true })) }}
                  className="w-full py-3 rounded-xl bg-[#ffb780] text-[#0e0e0e] font-bold text-sm"
                >
                  Complete Tax Verification →
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg bg-[#131313] border border-white/5 p-4 text-center">
                  <div className="font-mono text-3xl font-bold text-[#ffb780] mb-1">{claim.amount.toLocaleString()}</div>
                  <div className="text-xs text-[#8c909f]">≈ ${(claim.amount / 100).toFixed(2)} USD</div>
                </div>
                <ul className="space-y-2 text-xs text-[#8c909f]">
                  <li className="flex items-start gap-2"><span className="text-[#7dffa2] mt-0.5">•</span> Payout processed when bank payouts launch</li>

                  <li className="flex items-start gap-2"><span className="text-[#ffb780] mt-0.5">•</span> Prize winnings are taxable income</li>
                </ul>
                {claim.error && (
                  <div className="rounded-lg bg-[#ffb4ab]/10 border border-[#ffb4ab]/20 px-3 py-2 text-sm text-[#ffb4ab]">
                    {claim.error}
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={() => setClaim(c => ({ ...c, open: false }))}
                    className="flex-1 py-3 rounded-xl border border-white/10 text-[#8c909f] text-sm hover:border-white/20 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleClaim}
                    disabled={claim.loading}
                    className="flex-[2] py-3 rounded-xl bg-gradient-to-br from-[#adc6ff] to-[#4d8efe] text-[#001a41] font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {claim.loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</> : `Confirm & Claim $${(claim.amount / 100).toFixed(2)}`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── W-9 Modal — disabled at launch ── */}
      {false && w9.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-[#1c1b1b] border border-white/10 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-['Manrope'] font-black text-lg text-[#e5e2e1]">Tax Verification (W-9)</h3>
              <button onClick={() => setW9(w => ({ ...w, open: false }))} className="text-[#8c909f] hover:text-[#e5e2e1]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-lg bg-[#ffb780]/10 border border-[#ffb780]/20 p-3 mb-5">
              <p className="text-xs text-[#c2c6d5] leading-relaxed">
                Federal law requires us to collect your Tax ID before releasing prize payments of $600 or more in a calendar year. 
                Your information is used only for IRS 1099-MISC reporting. <strong>We do not store your full SSN.</strong>
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block font-mono text-[10px] text-[#8c909f] uppercase tracking-widest mb-1.5">Legal Name (as on tax return)</label>
                <input type="text" value={w9.legalName} onChange={e => setW9(w => ({ ...w, legalName: e.target.value }))}
                  placeholder="First Last"
                  className="w-full bg-[#131313] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-[#e5e2e1] placeholder-[#353534] focus:outline-none focus:border-[#adc6ff]/50" />
              </div>
              <div>
                <label className="block font-mono text-[10px] text-[#8c909f] uppercase tracking-widest mb-1.5">Mailing Address</label>
                <input type="text" value={w9.address} onChange={e => setW9(w => ({ ...w, address: e.target.value }))}
                  placeholder="123 Main St"
                  className="w-full bg-[#131313] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-[#e5e2e1] placeholder-[#353534] focus:outline-none focus:border-[#adc6ff]/50" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block font-mono text-[10px] text-[#8c909f] uppercase tracking-widest mb-1.5">City</label>
                  <input type="text" value={w9.city} onChange={e => setW9(w => ({ ...w, city: e.target.value }))}
                    placeholder="City"
                    className="w-full bg-[#131313] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-[#e5e2e1] placeholder-[#353534] focus:outline-none focus:border-[#adc6ff]/50" />
                </div>
                <div>
                  <label className="block font-mono text-[10px] text-[#8c909f] uppercase tracking-widest mb-1.5">State</label>
                  <input type="text" value={w9.state} onChange={e => setW9(w => ({ ...w, state: e.target.value.toUpperCase().slice(0,2) }))}
                    placeholder="IA" maxLength={2}
                    className="w-full bg-[#131313] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-[#e5e2e1] placeholder-[#353534] focus:outline-none focus:border-[#adc6ff]/50 uppercase" />
                </div>
                <div>
                  <label className="block font-mono text-[10px] text-[#8c909f] uppercase tracking-widest mb-1.5">ZIP</label>
                  <input type="text" value={w9.zip} onChange={e => setW9(w => ({ ...w, zip: e.target.value }))}
                    placeholder="50001"
                    className="w-full bg-[#131313] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-[#e5e2e1] placeholder-[#353534] focus:outline-none focus:border-[#adc6ff]/50" />
                </div>
              </div>
              <div>
                <label className="block font-mono text-[10px] text-[#8c909f] uppercase tracking-widest mb-1.5">Last 4 digits of SSN or ITIN</label>
                <input type="password" value={w9.taxIdLast4} onChange={e => setW9(w => ({ ...w, taxIdLast4: e.target.value.replace(/\D/g,'').slice(0,4) }))}
                  placeholder="••••" maxLength={4}
                  className="w-full bg-[#131313] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-[#e5e2e1] placeholder-[#353534] focus:outline-none focus:border-[#adc6ff]/50 font-mono tracking-widest" />
                <p className="text-[10px] text-[#8c909f] mt-1">Used for identity verification only. Never stored in full.</p>
              </div>

              {w9.error && (
                <div className="rounded-lg bg-[#ffb4ab]/10 border border-[#ffb4ab]/20 px-3 py-2 text-sm text-[#ffb4ab]">
                  {w9.error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setW9(w => ({ ...w, open: false }))}
                  className="flex-1 py-3 rounded-xl border border-white/10 text-[#8c909f] text-sm hover:border-white/20 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleW9Submit}
                  disabled={w9.loading || !w9.legalName || !w9.address || !w9.city || !w9.state || !w9.zip || w9.taxIdLast4.length !== 4}
                  className="flex-[2] py-3 rounded-xl bg-[#ffb780] text-[#0e0e0e] font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {w9.loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : 'Submit Tax Information'}
                </button>
              </div>

              <p className="text-[10px] text-[#353534] text-center leading-relaxed">
                By submitting, you certify that the information provided is accurate under penalty of perjury.
                We will issue IRS Form 1099-MISC if your annual prizes total $600 or more.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
