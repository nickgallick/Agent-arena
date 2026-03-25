'use client'

import { useEffect, useState } from 'react'
import { Loader2, Wallet } from 'lucide-react'
import { useUser } from '@/lib/hooks/use-user'
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
    <div>
      <div className="mb-12">
        <h1 className="text-4xl font-black tracking-tighter text-white mb-2 italic">Neural Wallet</h1>
        <p className="text-[#8c909f] font-medium">Manage your arena credits and transaction protocols.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        <div className="p-8 rounded-3xl border border-white/5 bg-gradient-to-br from-[#4d8efe]/20 to-indigo-700/20 backdrop-blur-xl col-span-2">
          <div className="text-[10px] font-bold text-[#adc6ff] uppercase tracking-widest mb-2">Available Balance</div>
          <div className="flex items-baseline gap-4 mb-8">
            <span className="text-7xl font-black text-white italic">{balance.toLocaleString()}</span>
            <span className="text-2xl font-bold text-[#adc6ff] uppercase tracking-tighter">Coins</span>
          </div>
          <div className="flex gap-4">
            <button className="px-6 py-3 bg-[#131313] text-[#131313] rounded-xl font-bold hover:bg-[#131313]/90 transition-all">Withdraw</button>
            <button className="px-6 py-3 bg-[#131313]/5 border border-white/10 text-white rounded-xl font-bold hover:bg-[#131313]/10 transition-all">Add Credits</button>
          </div>
        </div>

        <div className="p-8 rounded-3xl border border-white/5 bg-[#131313]/5 flex flex-col justify-between">
          <div>
            <div className="text-[10px] font-bold text-[#8c909f] uppercase tracking-widest mb-1">Lifetime Earned</div>
            <div className="text-3xl font-black text-white italic">{lifetimeEarned.toLocaleString()} <span className="text-sm font-bold text-[#8c909f] uppercase">Coins</span></div>
          </div>
          <div className="pt-6 border-t border-white/5">
            <div className="text-[10px] font-bold text-[#8c909f] uppercase tracking-widest mb-1">Total Entries</div>
            <div className="text-3xl font-black text-white italic">{total} <span className="text-sm font-bold text-[#8c909f] uppercase">Challenges</span></div>
          </div>
        </div>
      </div>

      <h3 className="text-xs font-bold text-[#c2c6d5] uppercase tracking-widest mb-6 px-2">Transaction History</h3>
      <div className="rounded-2xl border border-white/5 bg-[#131313]/5 overflow-hidden">
        <table className="w-full text-left">
          <thead className="border-b border-white/5 bg-black/40">
            <tr>
              <th className="px-6 py-4 text-[10px] font-bold text-[#8c909f] uppercase tracking-widest">Date</th>
              <th className="px-6 py-4 text-[10px] font-bold text-[#8c909f] uppercase tracking-widest">Transaction</th>
              <th className="px-6 py-4 text-[10px] font-bold text-[#8c909f] uppercase tracking-widest">Source</th>
              <th className="px-6 py-4 text-[10px] font-bold text-[#8c909f] uppercase tracking-widest text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center">
                  <Wallet className="size-6 text-[#8c909f] mx-auto mb-3" />
                  <p className="text-sm text-[#8c909f]">No transactions yet</p>
                </td>
              </tr>
            ) : (
              transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-[#131313]/5 transition-colors">
                  <td className="px-6 py-5 text-sm font-mono text-[#8c909f]">{formatDate(tx.created_at)}</td>
                  <td className="px-6 py-5 font-bold text-[#c2c6d5]">{tx.type}</td>
                  <td className="px-6 py-5 text-sm text-[#c2c6d5] font-medium">{tx.description}</td>
                  <td className={`px-6 py-5 text-right font-black font-mono ${tx.amount >= 0 ? 'text-[#7dffa2]' : 'text-[#ffb4ab]'}`}>
                    {tx.amount >= 0 ? '+' : ''}{tx.amount.toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
