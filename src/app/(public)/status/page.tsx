'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Footer } from '@/components/layout/footer'
import { CheckCircle2, AlertCircle } from 'lucide-react'

function InfoNav({ activeItem }: { activeItem: string }) {
  const infoLinks = [
    { label: 'Blog', href: '/blog' },
    { label: 'Fair Play', href: '/fair-play' },
    { label: 'Status', href: '/status' },
    { label: 'Terms', href: '/terms' },
  ]
  return (
    <nav className="border-b border-border px-4 md:px-6 py-4 flex items-center justify-between">
      <Link href="/" className="inline-flex hover:opacity-80 transition-opacity"><Image src="/bouts-logo.png" alt="Bouts" width={110} height={52} className="h-8 w-auto" /></Link>
      <div className="hidden md:flex items-center gap-8">
        {infoLinks.map(link => (
          <Link key={link.label} href={link.href}
            className={`text-sm transition-colors ${activeItem === link.label ? 'text-foreground font-medium border-b border-foreground pb-0.5' : 'text-muted-foreground hover:text-foreground'}`}>
            {link.label}
          </Link>
        ))}
      </div>
      <Link href="/dashboard" className="hidden md:inline-flex px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">Console</Link>
    </nav>
  )
}

export default function Status() {
  const incidents = [
    { date: '2024-05-22', title: 'API Mesh Scaling Event', desc: 'Automated cluster expansion to handle surge in requests.', status: 'RESOLVED', duration: '12m' },
    { date: '2024-05-18', title: 'Scheduled Database Optimization', desc: 'Index rebuilding on Kinetic Ledger. No downtime observed.', status: 'RESOLVED', duration: '45m' },
    { date: '2024-05-14', title: 'Intermittent Connector Latency', desc: 'Network congestion in AP-SOUTH-1 affected 0.04% of connections.', status: 'RESOLVED', duration: '4m', highlight: true },
    { date: '2024-05-02', title: 'System Core Upgrade (v2.4.0)', desc: 'Major update to Judge Pipeline neural weighting engines.', status: 'RESOLVED', duration: '1h 20m' },
  ]

  const regions = [
    { name: 'US-EAST-1', status: 'ONLINE' },
    { name: 'EU-WEST-1', status: 'ONLINE' },
    { name: 'AP-SOUTH-1', status: 'ONLINE' },
    { name: 'SA-EAST-1', status: 'ONLINE' },
  ]

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <InfoNav activeItem="Status" />
      <main className="flex-1 px-4 md:px-6 py-8 md:py-12 max-w-6xl mx-auto w-full">

        {/* Hero */}
        <div className="flex flex-col md:flex-row items-start justify-between gap-6 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2.5 h-2.5 rounded-full bg-primary" />
              <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-primary font-bold">Systems Operational</span>
            </div>
            <h1 className="font-display text-3xl md:text-5xl font-extrabold text-foreground uppercase tracking-wide mb-4">Network Status</h1>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-lg">
              Real-time telemetry from the BOUTS ELITE global mesh. All core orchestration layers are performing within nominal parameters.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card px-6 py-4">
            <div className="flex items-center gap-8">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block mb-1">Uptime (30d)</span>
                <span className="text-2xl font-mono font-bold text-primary">99.998%</span>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block mb-1">Global Latency</span>
                <span className="text-2xl font-mono font-bold text-foreground">14ms</span>
              </div>
            </div>
          </div>
        </div>

        {/* API Mesh + Judge Pipeline */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
          <div className="lg:col-span-2 rounded-xl border border-l-2 border-l-primary border-border bg-card p-4 md:p-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-display text-lg font-bold text-foreground uppercase tracking-wider">API Mesh</h3>
                <span className="text-xs text-muted-foreground">Global Gateway & Rate Limiting</span>
              </div>
              <span className="px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-primary/15 text-primary">STABLE</span>
            </div>
            <div className="flex items-end gap-1 h-14 mb-2">
              {Array.from({ length: 30 }).map((_, i) => (
                <div key={i} className={`flex-1 rounded-sm ${i === 22 ? 'bg-amber-500' : 'bg-primary'}`} style={{ height: `${70 + Math.random() * 30}%` }} />
              ))}
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              <span>30 days ago</span>
              <span>99.8% operational</span>
              <span>Today</span>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-bold text-foreground uppercase tracking-wider">Judge Pipeline</h3>
              <CheckCircle2 className="w-5 h-5 text-primary" />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Throughput</span>
                <span className="text-sm font-mono font-bold text-foreground">4.2k ops/s</span>
              </div>
              <div className="border-t border-border" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Neural Load</span>
                <span className="text-sm font-mono font-bold text-primary">24%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Connector + Database */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-12">
          <div className="rounded-xl border border-l-2 border-l-primary border-border bg-card p-4 md:p-6">
            <h3 className="font-display text-lg font-bold text-foreground uppercase tracking-wider mb-5">Connector Network</h3>
            <div className="grid grid-cols-2 gap-3">
              {regions.map(r => (
                <div key={r.name} className="rounded-lg border border-border p-3">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block mb-1">{r.name}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-primary" />
                    <span className="text-sm font-mono font-bold text-foreground">{r.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-l-2 border-l-primary border-border bg-card p-4 md:p-6">
            <div className="mb-3">
              <h3 className="font-display text-lg font-bold text-foreground uppercase tracking-wider">Database Cluster</h3>
              <span className="text-xs text-muted-foreground">Distributed Kinetic Ledger</span>
            </div>
            <div className="mb-3">
              <span className="text-2xl font-mono font-bold text-foreground block">0.4ms</span>
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Avg Query Latency</span>
            </div>
            <div className="flex items-end gap-1 h-20">
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className="flex-1 rounded-sm bg-muted-foreground/30" style={{ height: `${20 + Math.random() * 80}%` }} />
              ))}
            </div>
          </div>
        </div>

        {/* Incident Log */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl md:text-2xl font-extrabold text-foreground uppercase tracking-wider">Incident Log</h2>
            <button className="text-[10px] font-mono uppercase tracking-wider text-primary font-bold hover:text-primary/80">Download Report</button>
          </div>
          <div className="space-y-3">
            {incidents.map((inc, i) => (
              <div key={i} className="rounded-xl border border-border bg-card px-4 md:px-6 py-4 flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
                <span className="text-sm font-mono text-muted-foreground flex-shrink-0">{inc.date}</span>
                <div className="flex-1">
                  <h4 className={`text-sm font-bold mb-0.5 ${inc.highlight ? 'text-amber-400' : 'text-foreground'}`}>{inc.title}</h4>
                  <p className="text-xs text-muted-foreground">{inc.desc}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-primary/15 text-primary">{inc.status}</span>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">DURATION: {inc.duration}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">END OF LOGS FOR MAY 2024</span>
          </div>
        </div>

      </main>
      <Footer />
    </div>
  )
}
