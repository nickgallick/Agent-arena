'use client'

import { useEffect, useState } from 'react'
import { Coins, ArrowUpRight, ArrowDownRight, Loader2, Wallet } from 'lucide-react'
import { useUser } from '@/lib/hooks/use-user'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
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
  const transactions = wallet?.transactions ?? []

  return (
    <div className="space-y-6 p-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="font-[family-name:var(--font-mono)] text-[0.65rem] text-[#8c909f] uppercase tracking-widest">Credits Hub</span>
        </div>
        <h1 className="font-[family-name:var(--font-heading)] text-2xl font-extrabold tracking-tight text-[#e5e2e1]">Credits</h1>
      </div>

      {/* Balance Card */}
      <div className="bg-[#1c1b1b] rounded-xl p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl opacity-10" style={{ background: '#adc6ff' }} />
        <div className="relative flex items-center gap-5">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#adc6ff]/15">
            <Coins className="size-7 text-[#adc6ff]" />
          </div>
          <div>
            <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-[#8c909f] mb-1">Available Balance</p>
            <p className="font-[family-name:var(--font-mono)] text-4xl font-bold text-[#adc6ff]">
              {balance.toLocaleString()}{' '}
              <span className="text-lg font-medium text-[#8c909f]">credits</span>
            </p>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <Card className="border-[#424753]/15 bg-[#1c1b1b]">
        <CardHeader>
          <CardTitle className="font-[family-name:var(--font-heading)] text-[#e5e2e1] tracking-tight">Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#2a2a2a]/30">
                <Wallet className="size-6 text-[#e5e2e1]0" />
              </div>
              <p className="text-sm text-[#8c909f]">No transactions yet</p>
              <p className="text-xs text-[#e5e2e1]0">
                Earn coins by competing in challenges and placing well
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-[#424753]/15 hover:bg-transparent">
                  <TableHead className="text-[#8c909f]">Type</TableHead>
                  <TableHead className="text-[#8c909f]">Description</TableHead>
                  <TableHead className="text-right text-[#8c909f]">Amount</TableHead>
                  <TableHead className="text-[#8c909f]">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id} className="border-[#424753]/15">
                    <TableCell>
                      {tx.amount >= 0 ? (
                        <Badge className="bg-emerald-500/20 text-[#7dffa2] border-emerald-500/30">
                          <ArrowUpRight className="mr-1 size-3" />
                          Earned
                        </Badge>
                      ) : (
                        <Badge className="bg-red-500/20 text-[#ffb4ab] border-red-500/30">
                          <ArrowDownRight className="mr-1 size-3" />
                          Spent
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-[#c2c6d5]">{tx.description}</TableCell>
                    <TableCell className="text-right">
                      <span
                        className={cn(
                          'font-bold tabular-nums',
                          tx.amount >= 0 ? 'text-[#7dffa2]' : 'text-[#ffb4ab]'
                        )}
                      >
                        {tx.amount >= 0 ? '+' : ''}
                        {tx.amount}
                      </span>
                    </TableCell>
                    <TableCell className="text-[#8c909f]">
                      {formatDate(tx.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
