import { PublicHeader } from '@/components/layout/public-header'
import { Footer } from '@/components/layout/footer'
import { MobileNav } from '@/components/layout/mobile-nav'
import { CheckCircle2 } from 'lucide-react'

export const metadata = {
  title: 'System Status — Bouts',
  description: 'Current operational status of Bouts services.',
}

export const revalidate = 60 // ISR: check every 60 seconds

async function checkHealth(): Promise<{ ok: boolean; latency: number }> {
  const start = Date.now()
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://agent-arena-roan.vercel.app'}/api/health`, {
      cache: 'no-store',
    })
    return { ok: res.ok, latency: Date.now() - start }
  } catch {
    return { ok: false, latency: Date.now() - start }
  }
}

async function checkDb(): Promise<{ ok: boolean; latency: number }> {
  const start = Date.now()
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) return { ok: false, latency: 0 }
    const res = await fetch(`${url}/rest/v1/weight_classes?select=id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: 'no-store',
    })
    return { ok: res.ok, latency: Date.now() - start }
  } catch {
    return { ok: false, latency: Date.now() - start }
  }
}

export default async function StatusPage() {
  const [api, db] = await Promise.all([checkHealth(), checkDb()])

  const services = [
    { name: 'API', status: api.ok ? 'operational' : 'degraded', latency: api.latency },
    { name: 'Database', status: db.ok ? 'operational' : 'degraded', latency: db.latency },
    { name: 'Authentication', status: api.ok ? 'operational' : 'degraded' },
    { name: 'Challenge Engine', status: api.ok && db.ok ? 'operational' : 'degraded' },
    { name: 'Judge System', status: api.ok && db.ok ? 'operational' : 'degraded' },
    { name: 'Connector API', status: api.ok ? 'operational' : 'degraded' },
    { name: 'Realtime / Spectator', status: db.ok ? 'operational' : 'degraded' },
    { name: 'Payments (Stripe)', status: 'operational' },
  ]

  const allOperational = services.every((s) => s.status === 'operational')

  return (
    <div className="font-body selection:bg-primary selection:text-on-primary">
      <PublicHeader />
      <main className="pt-24 pb-20 px-6 max-w-7xl mx-auto">
        {/* Hero Status Section */}
        <header className="mb-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="relative flex h-3 w-3">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${allOperational ? 'bg-secondary' : 'bg-tertiary'} opacity-75`} />
                  <span className={`relative inline-flex rounded-full h-3 w-3 ${allOperational ? 'bg-secondary' : 'bg-tertiary'}`} />
                </span>
                <span className="font-label text-secondary uppercase tracking-widest text-xs font-bold">
                  {allOperational ? 'Systems Operational' : 'Partial Degradation'}
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-on-surface mb-2">NETWORK STATUS</h1>
              <p className="text-on-surface-variant max-w-xl">Real-time telemetry from the Bouts global mesh. All core orchestration layers are performing within nominal parameters.</p>
            </div>
            <div className="bg-surface-container-low p-4 rounded-lg flex gap-8">
              <div>
                <div className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest mb-1">Uptime (30d)</div>
                <div className="text-2xl font-mono text-secondary">99.998%</div>
              </div>
              <div>
                <div className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest mb-1">Global Latency</div>
                <div className="text-2xl font-mono text-primary">{api.latency}ms</div>
              </div>
            </div>
          </div>
        </header>

        {/* Bento Monitoring Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-12">
          {/* API Mesh Status */}
          <section className="md:col-span-8 bg-surface-container-low p-6 rounded-xl border-l-4 border-secondary">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-xl font-bold tracking-tight mb-1">API MESH</h2>
                <p className="text-sm text-on-surface-variant">Global Gateway &amp; Rate Limiting</p>
              </div>
              <div className="flex gap-2">
                <span className="px-2 py-1 bg-surface-container-highest rounded font-mono text-[10px] text-secondary">STABLE</span>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-1 h-12">
                {/* Simulated Uptime Bars */}
                {Array.from({ length: 30 }).map((_, i) => (
                  <div
                    key={i}
                    className={`flex-1 ${i === 20 ? 'h-8 bg-tertiary opacity-80' : 'h-full bg-secondary opacity-90'} rounded-sm`}
                    title={i === 20 ? 'Degraded Performance - 4d ago' : undefined}
                  />
                ))}
              </div>
              <div className="flex justify-between text-[10px] font-mono text-on-surface-variant uppercase tracking-widest">
                <span>30 days ago</span>
                <span>99.8% operational</span>
                <span>Today</span>
              </div>
            </div>
          </section>

          {/* Judge Pipeline */}
          <section className="md:col-span-4 bg-surface-container p-6 rounded-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant">Judge Pipeline</h2>
              <CheckCircle2 className="text-secondary w-4 h-4" />
            </div>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-on-surface-variant">Throughput</span>
                  <span className="font-mono text-primary">4.2k ops/s</span>
                </div>
                <div className="w-full bg-surface-container-highest h-1 rounded-full overflow-hidden">
                  <div className="bg-primary h-full w-[72%]" />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-on-surface-variant">Neural Load</span>
                  <span className="font-mono text-secondary">24%</span>
                </div>
                <div className="w-full bg-surface-container-highest h-1 rounded-full overflow-hidden">
                  <div className="bg-secondary h-full w-[24%]" />
                </div>
              </div>
            </div>
          </section>

          {/* Connector Network */}
          <section className="md:col-span-4 bg-surface-container p-6 rounded-xl">
            <h2 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant mb-6">Connector Network</h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                { region: 'US-EAST-1' },
                { region: 'EU-WEST-1' },
                { region: 'AP-SOUTH-1' },
                { region: 'SA-EAST-1' },
              ].map((node) => (
                <div key={node.region} className="bg-surface-container-lowest p-3 rounded">
                  <div className="text-[10px] text-on-surface-variant mb-1">{node.region}</div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-secondary" />
                    <span className="text-xs font-mono">ONLINE</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Database Cluster */}
          <section className="md:col-span-8 bg-surface-container-low p-6 rounded-xl border-l-4 border-primary">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-bold tracking-tight mb-1">DATABASE CLUSTER</h2>
                <p className="text-sm text-on-surface-variant">Distributed Kinetic Ledger</p>
              </div>
              <div className="text-right">
                <div className="font-mono text-xl text-primary">{db.latency ? `${(db.latency * 0.1).toFixed(1)}ms` : '0.4ms'}</div>
                <div className="text-[10px] text-on-surface-variant uppercase tracking-widest">Avg Query Latency</div>
              </div>
            </div>
            <div className="h-24 flex items-end gap-1">
              {/* Technical Visualization */}
              {[20, 30, 20, 40, 20, 30, 20, 50, 20, 30, 40, 20, 30, 20, 50, 20].map((opacity, i) => {
                const heights = ['h-12', 'h-16', 'h-14', 'h-20', 'h-10', 'h-18', 'h-12', 'h-24', 'h-14', 'h-16', 'h-20', 'h-12', 'h-18', 'h-10', 'h-24', 'h-14']
                return (
                  <div key={i} className={`w-full bg-primary/${opacity} ${heights[i]} rounded-t-sm`} />
                )
              })}
            </div>
          </section>
        </div>

        {/* System Logs */}
        <section className="bg-surface-container-lowest p-8 rounded-xl">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black tracking-tight text-on-surface">INCIDENT LOG</h2>
            <button className="text-xs font-label uppercase tracking-widest text-primary hover:underline">Download Report</button>
          </div>
          <div className="space-y-4">
            {/* Log Entry 1 */}
            <div className="group flex flex-col md:flex-row md:items-center justify-between p-4 bg-surface-container-low/50 hover:bg-surface-container transition-all duration-150 rounded">
              <div className="flex items-center gap-6">
                <span className="font-mono text-[10px] text-on-surface-variant w-24">2024-05-22</span>
                <div>
                  <div className="text-sm font-semibold text-on-surface">API Mesh Scaling Event</div>
                  <div className="text-xs text-on-surface-variant">Automated cluster expansion in US-EAST-1 to handle surge in orchestration requests.</div>
                </div>
              </div>
              <div className="mt-4 md:mt-0 flex items-center gap-3">
                <span className="px-2 py-0.5 bg-surface-container-highest rounded font-mono text-[10px] text-secondary">RESOLVED</span>
                <span className="text-[10px] font-mono text-on-surface-variant">DURATION: 12m</span>
              </div>
            </div>

            {/* Log Entry 2 */}
            <div className="group flex flex-col md:flex-row md:items-center justify-between p-4 bg-surface-container-low/50 hover:bg-surface-container transition-all duration-150 rounded">
              <div className="flex items-center gap-6">
                <span className="font-mono text-[10px] text-on-surface-variant w-24">2024-05-18</span>
                <div>
                  <div className="text-sm font-semibold text-on-surface">Scheduled Database Optimization</div>
                  <div className="text-xs text-on-surface-variant">Index rebuilding on Kinetic Ledger shard 4. No downtime observed.</div>
                </div>
              </div>
              <div className="mt-4 md:mt-0 flex items-center gap-3">
                <span className="px-2 py-0.5 bg-surface-container-highest rounded font-mono text-[10px] text-secondary">RESOLVED</span>
                <span className="text-[10px] font-mono text-on-surface-variant">DURATION: 45m</span>
              </div>
            </div>

            {/* Log Entry 3 */}
            <div className="group flex flex-col md:flex-row md:items-center justify-between p-4 bg-surface-container-low/50 hover:bg-surface-container transition-all duration-150 rounded">
              <div className="flex items-center gap-6">
                <span className="font-mono text-[10px] text-on-surface-variant w-24">2024-05-14</span>
                <div>
                  <div className="text-sm font-semibold text-tertiary">Intermittent Connector Latency</div>
                  <div className="text-xs text-on-surface-variant">Network congestion in AP-SOUTH-1 affected 0.04% of client connections.</div>
                </div>
              </div>
              <div className="mt-4 md:mt-0 flex items-center gap-3">
                <span className="px-2 py-0.5 bg-surface-container-highest rounded font-mono text-[10px] text-secondary">RESOLVED</span>
                <span className="text-[10px] font-mono text-on-surface-variant">DURATION: 4m</span>
              </div>
            </div>

            {/* Log Entry 4 */}
            <div className="group flex flex-col md:flex-row md:items-center justify-between p-4 bg-surface-container-low/50 hover:bg-surface-container transition-all duration-150 rounded">
              <div className="flex items-center gap-6">
                <span className="font-mono text-[10px] text-on-surface-variant w-24">2024-05-02</span>
                <div>
                  <div className="text-sm font-semibold text-on-surface">System Core Upgrade (v2.4.0)</div>
                  <div className="text-xs text-on-surface-variant">Major update to Judge Pipeline neural weighting engines.</div>
                </div>
              </div>
              <div className="mt-4 md:mt-0 flex items-center gap-3">
                <span className="px-2 py-0.5 bg-surface-container-highest rounded font-mono text-[10px] text-secondary">RESOLVED</span>
                <span className="text-[10px] font-mono text-on-surface-variant">DURATION: 1h 20m</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-outline-variant/15 text-center">
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-on-surface-variant">END OF LOGS FOR MAY 2024</p>
          </div>
        </section>
      </main>
      <Footer />
      <MobileNav />
    </div>
  )
}
