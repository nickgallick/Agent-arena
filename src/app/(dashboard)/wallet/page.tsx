'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Plus, ArrowUpRight, Download, Filter, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface WalletData {
  balance: number
  lifetime_earned: number
}

interface Transaction {
  id: string
  type: string
  amount: number
  created_at: string
  description?: string
  reference?: string
  status?: string
}

export default function Wallet() {
  const [wallet, setWallet] = useState<WalletData | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/me')
      .then(r => {
        if (!r.ok) throw new Error('unauth')
        return r.json()
      })
      .then(data => {
        if (data.wallet) {
          setWallet({ balance: data.wallet.balance ?? 0, lifetime_earned: data.wallet.lifetime_earned ?? 0 })
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function handleDeposit() {
    toast.info('Deposit feature coming soon.')
  }

  function handleWithdraw() {
    toast.info('Withdraw feature coming soon.')
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <div className="flex-1 px-4 md:px-6 py-6 md:py-8 max-w-7xl mx-auto w-full pt-24">

        {/* Top Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8 md:mb-10">
          <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6 md:p-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">Available Credits</span>
            </div>
            {loading ? (
              <div className="flex items-center gap-3 mb-6 md:mb-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="flex items-baseline gap-3 mb-6 md:mb-8">
                <span className="text-3xl md:text-5xl font-display font-extrabold text-foreground">
                  {(wallet?.balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-lg md:text-xl font-display font-bold text-muted-foreground">$BT</span>
              </div>
            )}
            <div className="flex items-center gap-3 flex-wrap">
              <button onClick={handleDeposit} className="px-5 md:px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-2 hover:bg-primary/90 transition-colors">
                <Plus className="w-4 h-4" /> Deposit
              </button>
              <button onClick={handleWithdraw} className="px-5 md:px-6 py-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm font-semibold flex items-center gap-2 hover:bg-secondary/80 transition-colors">
                <ArrowUpRight className="w-4 h-4" /> Withdraw
              </button>
            </div>
          </div>

          <div className="flex flex-row lg:flex-col gap-5">
            <div className="flex-1 rounded-xl border border-border bg-card p-5">
              <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground block mb-2">Lifetime Earned</span>
              {loading ? (
                <div className="h-6 w-32 bg-secondary animate-pulse rounded" />
              ) : (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl md:text-2xl font-mono font-bold text-primary">
                      +{(wallet?.lifetime_earned ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-sm font-mono text-muted-foreground">$BT</span>
                  </div>
                  <span className="text-xs text-muted-foreground mt-1 block">All-time arena earnings</span>
                </>
              )}
            </div>

            <div className="flex-1 rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">Network Status</span>
              </div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-foreground">Arena Status</span>
                <span className="text-sm font-mono font-bold text-primary">Online</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-secondary mb-3">
                <div className="h-full rounded-full bg-primary" style={{ width: '100%' }} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">SYNCED</span>
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">99.9% UPTIME</span>
              </div>
            </div>
          </div>
        </div>

        {/* Transaction History */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-4 md:px-6 py-4 md:py-5 flex items-center justify-between border-b border-border">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-base md:text-lg font-bold text-foreground uppercase tracking-wider">Telemetry Records</h2>
            </div>
            <div className="flex items-center gap-2">
              <button className="w-9 h-9 rounded-lg border border-border flex items-center justify-center hover:bg-secondary transition-colors">
                <Filter className="w-4 h-4 text-muted-foreground" />
              </button>
              <button className="w-9 h-9 rounded-lg border border-border flex items-center justify-center hover:bg-secondary transition-colors">
                <Download className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          {transactions.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-muted-foreground text-sm">No transactions yet.</p>
              <p className="text-muted-foreground text-xs mt-1">Enter a challenge to start earning.</p>
            </div>
          ) : (
            <>
              {/* Table Header */}
              <div className="hidden md:grid grid-cols-5 px-6 py-3 border-b border-border">
                <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">Timestamp</span>
                <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">Operation</span>
                <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">Arena Context</span>
                <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground text-right">Magnitude</span>
                <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground text-right">Status</span>
              </div>
              {transactions.map((tx, i) => {
                const isPositive = tx.amount >= 0
                return (
                  <div key={tx.id} className="px-4 md:px-6 py-4 border-b border-border last:border-b-0">
                    <div className="md:hidden space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${isPositive ? 'bg-primary' : 'bg-red-400'}`} />
                          <span className="text-sm text-foreground">{tx.type}</span>
                        </div>
                        <span className={`text-sm font-mono font-bold ${isPositive ? 'text-primary' : 'text-foreground'}`}>
                          {isPositive ? '+' : ''}{tx.amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-muted-foreground">{new Date(tx.created_at).toLocaleDateString()}</span>
                        <span className="px-2 py-0.5 rounded border border-border text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{tx.status ?? 'VERIFIED'}</span>
                      </div>
                    </div>
                    <div className="hidden md:grid grid-cols-5 items-center">
                      <div>
                        <span className="text-sm font-mono text-foreground block">{new Date(tx.created_at).toLocaleDateString()}</span>
                        <span className="text-[10px] font-mono text-muted-foreground">{new Date(tx.created_at).toLocaleTimeString()} UTC</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${isPositive ? 'bg-primary' : 'bg-red-400'}`} />
                        <span className="text-sm text-foreground">{tx.type}</span>
                      </div>
                      <div>
                        <span className="px-2.5 py-1 rounded bg-secondary text-[11px] font-mono text-muted-foreground">{tx.reference ?? '-'}</span>
                      </div>
                      <div className="text-right">
                        <span className={`text-sm font-mono font-bold ${isPositive ? 'text-primary' : 'text-foreground'}`}>
                          {isPositive ? '+' : ''}{tx.amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="px-2.5 py-1 rounded border border-border text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{tx.status ?? 'VERIFIED'}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </>
          )}

          <div className="px-4 md:px-6 py-4 flex items-center justify-between border-t border-border">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              {transactions.length > 0 ? `DISPLAYING ${transactions.length} RECORDS` : 'NO RECORDS'}
            </span>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}
