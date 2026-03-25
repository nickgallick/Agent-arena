'use client'

import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Plus, ArrowUpRight, Download, Filter } from 'lucide-react'

const telemetryRecords = [
  { date: '2024.05.22', time: '14:22:01 UTC', operation: 'Arena Victory', dotColor: 'bg-primary', context: '#DELTA-912-QUANTUM', magnitude: '+1,250.00', status: 'VERIFIED' },
  { date: '2024.05.21', time: '09:12:44 UTC', operation: 'Node Maintenance', dotColor: 'bg-blue-400', context: 'SYS_UPGRADE_V4', magnitude: '-250.00', status: 'SUCCESS' },
  { date: '2024.05.20', time: '22:01:10 UTC', operation: 'Staking Yield', dotColor: 'bg-primary', context: 'VAL_POOL_ALPHA', magnitude: '+42.15', status: 'VERIFIED' },
  { date: '2024.05.19', time: '18:45:32 UTC', operation: 'Arena Loss', dotColor: 'bg-red-400', context: '#SIGMA-002-VOID', magnitude: '-500.00', status: 'VERIFIED' },
]

export default function Wallet() {
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
            <div className="flex items-baseline gap-3 mb-6 md:mb-8">
              <span className="text-3xl md:text-5xl font-display font-extrabold text-foreground">12,850.42</span>
              <span className="text-lg md:text-xl font-display font-bold text-muted-foreground">BET</span>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <button className="px-5 md:px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-2 hover:bg-primary/90 transition-colors">
                <Plus className="w-4 h-4" /> Deposit
              </button>
              <button className="px-5 md:px-6 py-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm font-semibold flex items-center gap-2 hover:bg-secondary/80 transition-colors">
                <ArrowUpRight className="w-4 h-4" /> Withdraw
              </button>
            </div>
          </div>

          <div className="flex flex-row lg:flex-col gap-5">
            <div className="flex-1 rounded-xl border border-border bg-card p-5">
              <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground block mb-2">Lifetime Earned</span>
              <div className="flex items-baseline gap-2">
                <span className="text-xl md:text-2xl font-mono font-bold text-primary">+48,291.00</span>
                <span className="text-sm font-mono text-muted-foreground">BET</span>
              </div>
              <span className="text-xs text-primary mt-1 block">+12.4% since last cycle</span>
            </div>

            <div className="flex-1 rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">Command Node Health</span>
              </div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-foreground">Active Nodes</span>
                <span className="text-sm font-mono font-bold text-primary">03</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-secondary mb-3">
                <div className="h-full rounded-full bg-primary" style={{ width: '100%' }} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">SYNCED 100%</span>
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">LATENCY: 22MS</span>
              </div>
            </div>
          </div>
        </div>

        {/* Telemetry Records */}
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

          {/* Table Header */}
          <div className="hidden md:grid grid-cols-5 px-6 py-3 border-b border-border">
            <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">Timestamp</span>
            <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">Operation</span>
            <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">Arena Context</span>
            <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground text-right">Magnitude</span>
            <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground text-right">Status</span>
          </div>

          {/* Rows */}
          {telemetryRecords.map((record, i) => (
            <div key={i} className="px-4 md:px-6 py-4 border-b border-border last:border-b-0">
              {/* Mobile */}
              <div className="md:hidden space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${record.dotColor}`} />
                    <span className="text-sm text-foreground">{record.operation}</span>
                  </div>
                  <span className={`text-sm font-mono font-bold ${record.magnitude.startsWith('+') ? 'text-primary' : 'text-foreground'}`}>{record.magnitude}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-muted-foreground">{record.date} {record.time}</span>
                  <span className="px-2 py-0.5 rounded border border-border text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{record.status}</span>
                </div>
              </div>
              {/* Desktop */}
              <div className="hidden md:grid grid-cols-5 items-center">
                <div>
                  <span className="text-sm font-mono text-foreground block">{record.date}</span>
                  <span className="text-[10px] font-mono text-muted-foreground">{record.time}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${record.dotColor}`} />
                  <span className="text-sm text-foreground">{record.operation}</span>
                </div>
                <div>
                  <span className="px-2.5 py-1 rounded bg-secondary text-[11px] font-mono text-muted-foreground">{record.context}</span>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-mono font-bold ${record.magnitude.startsWith('+') ? 'text-primary' : 'text-foreground'}`}>{record.magnitude}</span>
                </div>
                <div className="text-right">
                  <span className="px-2.5 py-1 rounded border border-border text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{record.status}</span>
                </div>
              </div>
            </div>
          ))}

          <div className="px-4 md:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-t border-border">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">DISPLAYING 4 OF 2,492 SEQUENCES</span>
            <div className="flex items-center gap-4">
              <button className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">Previous_Page</button>
              <button className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">Next_Page</button>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}
