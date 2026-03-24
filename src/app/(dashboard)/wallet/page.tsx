'use client'

import { useEffect, useState } from 'react'
import { Coins, ArrowUpRight, ArrowDownRight, Loader2, Wallet, Download, SlidersHorizontal } from 'lucide-react'
import { useUser } from '@/lib/hooks/use-user'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/utils/format'

interface Transaction {
  id: string
  type: string
  description: string
  amount: number
  created_at: string
}

interface WalletData {
  balance: number
  lifetime_earned: number
  lifetime_spent: number
  transactions: Transaction[]
  total: number
}

export default function WalletPage() {
  const { user, loading: userLoading } = useUser()
  const [wallet, setWallet] = useState<WalletData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userLoading) return
    if (!user) {
      setLoading(false)
      return
    }

    async function fetchWallet() {
      try {
        const res = await fetch('/api/wallet?limit=50')
        if (!res.ok) {
          setLoading(false)
          return
        }
        const data = await res.json()
        setWallet(data)
      } catch (err) {
        console.error('[WalletPage] Failed to load wallet:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchWallet()
  }, [user, userLoading])

  if (userLoading || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-[#8c909f]" />
      </div>
    )
  }

  const balance = wallet?.balance ?? 0
  const lifetimeEarned = wallet?.lifetime_earned ?? 0
  const transactions = wallet?.transactions ?? []
  const total = wallet?.total ?? 0

  return (
    <div className="bg-background text-on-background font-body selection:bg-primary/30 antialiased">
      <div className="pb-32 space-y-8">
        {/* Hero Wallet Section: Asymmetric Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Balance Card: High Density Primary Display */}
          <div className="lg:col-span-8 bg-surface-container-low rounded-xl p-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-primary/10 transition-colors duration-500" />
            <div className="relative z-10 flex flex-col justify-between h-full space-y-12">
              <div>
                <div className="flex items-center gap-2 mb-2 text-on-surface-variant">
                  <Wallet className="w-4 h-4" />
                  <span className="font-label text-xs uppercase tracking-widest">Available Credits</span>
                </div>
                <div className="flex items-baseline gap-4">
                  <h1 className="text-6xl md:text-7xl font-bold tracking-tighter text-on-surface">{balance.toLocaleString()}</h1>
                  <span className="text-primary font-headline font-bold text-2xl tracking-widest">BET</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 pt-8">
                <button className="flex items-center gap-2 bg-primary text-on-primary px-8 py-3 rounded font-bold hover:brightness-110 active:scale-95 transition-all">
                  <Coins className="w-5 h-5" />
                  Deposit
                </button>
                <button className="flex items-center gap-2 bg-surface-container-high text-primary px-8 py-3 rounded font-bold hover:bg-surface-container-highest active:scale-95 transition-all">
                  <ArrowUpRight className="w-5 h-5" />
                  Withdraw
                </button>
              </div>
            </div>
          </div>

          {/* Stats Column */}
          <div className="lg:col-span-4 space-y-6">
            {/* Lifetime Earned */}
            <div className="bg-surface-container rounded-xl p-6 relative overflow-hidden">
              <div className="flex flex-col gap-1">
                <span className="text-on-surface-variant font-label text-xs uppercase tracking-widest">Lifetime Earned</span>
                <div className="text-3xl font-bold text-secondary">
                  +{lifetimeEarned.toLocaleString()} <span className="text-sm font-medium text-on-surface-variant">BET</span>
                </div>
                <div className="flex items-center gap-2 mt-2 text-xs text-on-surface-variant font-label">
                  <span className="text-secondary-fixed-dim">+12.4%</span> since last cycle
                </div>
              </div>
              <div className="absolute -bottom-4 -right-4 opacity-5">
                <svg className="w-20 h-20" viewBox="0 0 24 24" fill="currentColor"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" /></svg>
              </div>
            </div>

            {/* Asset Breakdown Chip */}
            <div className="bg-surface-container rounded-xl p-6">
              <span className="text-on-surface-variant font-label text-xs uppercase tracking-widest block mb-4">Command Node Health</span>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-on-surface-variant">Active Nodes</span>
                  <span className="font-mono text-secondary">03</span>
                </div>
                <div className="w-full bg-surface-container-lowest h-1.5 rounded-full overflow-hidden">
                  <div className="bg-secondary h-full w-[85%]" />
                </div>
                <div className="flex justify-between items-center text-[10px] font-mono uppercase text-on-surface-variant">
                  <span>Synced 100%</span>
                  <span>Latency: 22ms</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Transaction History: Production Grade Data Grid */}
        <div className="bg-surface-container-low rounded-xl overflow-hidden">
          <div className="p-6 border-b border-outline-variant/10 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <svg className="text-primary w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10" /><polyline points="23 20 23 14 17 14" /><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" /></svg>
              <h2 className="text-lg font-bold font-headline uppercase tracking-tight">Telemetry Records</h2>
            </div>
            <div className="flex gap-2">
              <button className="bg-surface-container-high p-2 rounded hover:bg-surface-container-highest transition-colors">
                <SlidersHorizontal className="w-4 h-4" />
              </button>
              <button className="bg-surface-container-high p-2 rounded hover:bg-surface-container-highest transition-colors">
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface-container-lowest text-[10px] uppercase font-label tracking-widest text-on-surface-variant">
                <tr>
                  <th className="px-6 py-4 font-medium">Timestamp</th>
                  <th className="px-6 py-4 font-medium">Operation</th>
                  <th className="px-6 py-4 font-medium">Arena Context</th>
                  <th className="px-6 py-4 font-medium text-right">Magnitude</th>
                  <th className="px-6 py-4 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/5">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Wallet className="w-6 h-6 text-on-surface-variant" />
                        <p className="text-sm text-on-surface-variant">No transactions yet</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-surface-container transition-colors duration-150 group">
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium font-mono">{formatDate(tx.created_at)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            'w-2 h-2 rounded-full',
                            tx.amount >= 0
                              ? 'bg-secondary shadow-[0_0_8px_rgba(125,255,162,0.4)]'
                              : 'bg-error shadow-[0_0_8px_rgba(255,180,171,0.4)]'
                          )} />
                          <span className="text-sm font-semibold">{tx.type}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-xs bg-surface-container-highest px-2 py-1 rounded font-mono text-on-surface-variant">{tx.description}</span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <span className={cn(
                          'font-bold font-mono',
                          tx.amount >= 0 ? 'text-secondary' : 'text-error'
                        )}>
                          {tx.amount >= 0 ? '+' : ''}{tx.amount.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <span className="text-[10px] uppercase font-bold text-on-surface-variant bg-surface-container-high px-2 py-1 rounded border border-outline-variant/10">Verified</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination/Footer of Table */}
          <div className="px-6 py-4 bg-surface-container-lowest flex justify-between items-center text-[10px] font-mono uppercase text-on-surface-variant">
            <span>Displaying {transactions.length} of {total.toLocaleString()} sequences</span>
            <div className="flex gap-4">
              <button className="hover:text-primary transition-colors">Previous_Page</button>
              <button className="hover:text-primary transition-colors">Next_Page</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
