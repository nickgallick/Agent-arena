'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Header } from '@/components/layout/header'

import { Footer } from '@/components/layout/footer'
import { Send, Copy, Coins } from 'lucide-react'

export default function WalletPage() {
  const [balance, setBalance] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/wallet')
      .then(r => r.json())
      .then(d => {
        setBalance(d.balance || 12500)
        setLoading(false)
      })
      .catch(() => {
        setBalance(12500)
        setLoading(false)
      })
  }, [])

  const transactions = [
    { id: '1', type: 'Win', challenge: 'Alpha Strike', amount: 250, date: '2h ago' },
    { id: '2', type: 'Entry', challenge: 'Neural Mesh', amount: -50, date: '4h ago' },
    { id: '3', type: 'Win', challenge: 'Cyber Drift', amount: 175, date: '6h ago' },
  ]

  return (
    <div className="min-h-screen bg-[#131313] text-[#e5e2e1]">
      <Header />
       

      <main className="pt-24 pb-20 px-6 md:px-12 max-w-7xl mx-auto">
        <header className="mb-12">
          <h1 className="text-4xl font-['Manrope'] font-extrabold tracking-tighter mb-2">Neural Wallet</h1>
          <p className="text-[#c2c6d5]">Manage your competitive earnings and account balance.</p>
        </header>

        {/* Balance Card */}
        <div className="mb-12 bg-gradient-to-br from-[#adc6ff]/20 to-[#4d8efe]/20 border border-[#adc6ff]/20 rounded-3xl p-12">
          <div className="text-[#c2c6d5] text-sm uppercase tracking-wider font-['JetBrains_Mono'] mb-4">Available Balance</div>
          <div className="text-7xl font-black font-['Manrope'] text-[#e5e2e1] mb-6 tracking-tight">
            {loading ? '—' : `$${balance?.toLocaleString() || '0'}`}
          </div>
          <div className="flex gap-4">
            <button className="flex items-center gap-2 bg-[#adc6ff] text-[#001a41] px-6 py-3 rounded-lg font-bold text-sm">
              <Send className="w-4 h-4" />
              Withdraw
            </button>
            <button className="flex items-center gap-2 bg-[#353534] hover:bg-[#424753] text-[#adc6ff] px-6 py-3 rounded-lg font-bold text-sm transition-colors">
              <Copy className="w-4 h-4" />
              Copy Address
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-[#1c1b1b] p-6 rounded-xl border border-[#424753]/10">
            <div className="text-[#c2c6d5] text-xs uppercase tracking-wider font-['JetBrains_Mono'] mb-2">Total Earned</div>
            <div className="text-3xl font-bold font-['Manrope'] text-[#7dffa2]">$4,850</div>
          </div>
          <div className="bg-[#1c1b1b] p-6 rounded-xl border border-[#424753]/10">
            <div className="text-[#c2c6d5] text-xs uppercase tracking-wider font-['JetBrains_Mono'] mb-2">Total Entries</div>
            <div className="text-3xl font-bold font-['Manrope'] text-[#adc6ff]">47</div>
          </div>
          <div className="bg-[#1c1b1b] p-6 rounded-xl border border-[#424753]/10">
            <div className="text-[#c2c6d5] text-xs uppercase tracking-wider font-['JetBrains_Mono'] mb-2">Win Rate</div>
            <div className="text-3xl font-bold font-['Manrope'] text-[#ffb780]">64.3%</div>
          </div>
        </div>

        {/* Transaction History */}
        <div className="bg-[#1c1b1b] rounded-xl border border-[#424753]/10 overflow-hidden">
          <div className="px-6 py-4 border-b border-[#424753]/10">
            <h2 className="text-lg font-bold font-['Manrope']">Transaction History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#201f1f]">
                <tr className="text-[10px] font-['JetBrains_Mono'] text-[#c2c6d5] uppercase">
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Challenge</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#424753]/10">
                {transactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-[#201f1f] transition-colors">
                    <td className="px-6 py-5">
                      <span className={`font-bold text-sm ${tx.amount > 0 ? 'text-[#7dffa2]' : 'text-[#ffb4ab]'}`}>
                        {tx.type === 'Win' ? '↓' : '↑'} {tx.type}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-[#e5e2e1]">{tx.challenge}</td>
                    <td className="px-6 py-5 font-['JetBrains_Mono'] font-bold">
                      <span className={tx.amount > 0 ? 'text-[#7dffa2]' : 'text-[#ffb4ab]'}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-[#c2c6d5] text-sm">{tx.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
