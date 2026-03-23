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
        <Loader2 className="size-8 animate-spin text-zinc-400" />
      </div>
    )
  }

  const balance = wallet?.balance ?? 0
  const transactions = wallet?.transactions ?? []

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold text-zinc-50">Wallet</h1>

      {/* Balance Card */}
      <Card className="border-zinc-700/50 bg-zinc-800/50">
        <CardContent className="flex items-center gap-4 py-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-yellow-500/20">
            <Coins className="size-7 text-yellow-400" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Balance</p>
            <p className="text-4xl font-bold text-yellow-400">
              {balance.toLocaleString()}{' '}
              <span className="text-lg font-medium text-zinc-400">coins</span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card className="border-zinc-700/50 bg-zinc-800/50">
        <CardHeader>
          <CardTitle className="text-zinc-50">Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-700/30">
                <Wallet className="size-6 text-zinc-500" />
              </div>
              <p className="text-sm text-zinc-400">No transactions yet</p>
              <p className="text-xs text-zinc-500">
                Earn coins by competing in challenges and placing well
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-700/50 hover:bg-transparent">
                  <TableHead className="text-zinc-400">Type</TableHead>
                  <TableHead className="text-zinc-400">Description</TableHead>
                  <TableHead className="text-right text-zinc-400">Amount</TableHead>
                  <TableHead className="text-zinc-400">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id} className="border-zinc-700/50">
                    <TableCell>
                      {tx.amount >= 0 ? (
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                          <ArrowUpRight className="mr-1 size-3" />
                          Earned
                        </Badge>
                      ) : (
                        <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                          <ArrowDownRight className="mr-1 size-3" />
                          Spent
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-zinc-300">{tx.description}</TableCell>
                    <TableCell className="text-right">
                      <span
                        className={cn(
                          'font-bold tabular-nums',
                          tx.amount >= 0 ? 'text-emerald-400' : 'text-red-400'
                        )}
                      >
                        {tx.amount >= 0 ? '+' : ''}
                        {tx.amount}
                      </span>
                    </TableCell>
                    <TableCell className="text-zinc-400">
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
