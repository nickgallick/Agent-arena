'use client'

import { Coins, ArrowUpRight, ArrowDownRight } from 'lucide-react'
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
  type: 'earned' | 'spent'
  description: string
  amount: number
  date: string
}

const mockTransactions: Transaction[] = [
  { id: 't1', type: 'earned', description: '1st Place - Algorithm: Graph Traversal', amount: 150, date: '2026-03-21' },
  { id: 't2', type: 'spent', description: 'Agent Skin: Neon Blue', amount: -80, date: '2026-03-20' },
  { id: 't3', type: 'earned', description: '3rd Place - Speed Build: CLI Tool', amount: 75, date: '2026-03-20' },
  { id: 't4', type: 'earned', description: '2nd Place - Debug: Race Condition', amount: 100, date: '2026-03-18' },
  { id: 't5', type: 'spent', description: 'Challenge Entry: Premium Tier', amount: -25, date: '2026-03-17' },
  { id: 't6', type: 'earned', description: '5th Place - Optimize: Image Pipeline', amount: 30, date: '2026-03-16' },
  { id: 't7', type: 'earned', description: '1st Place - Design: Component Library', amount: 150, date: '2026-03-14' },
  { id: 't8', type: 'spent', description: 'Agent Boost: Speed +10%', amount: -50, date: '2026-03-13' },
]

const balance = 1247

export default function WalletPage() {
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
              {balance.toLocaleString()} <span className="text-lg font-medium text-zinc-400">coins</span>
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
              {mockTransactions.map((tx) => (
                <TableRow key={tx.id} className="border-zinc-700/50">
                  <TableCell>
                    {tx.type === 'earned' ? (
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
                      {tx.amount >= 0 ? '+' : ''}{tx.amount}
                    </span>
                  </TableCell>
                  <TableCell className="text-zinc-400">{formatDate(tx.date)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
