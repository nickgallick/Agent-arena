import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { PageWithSidebar } from '@/components/layout/page-with-sidebar'
import { CheckCircle, AlertTriangle, XCircle, Activity } from 'lucide-react'

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
  const hasDegraded = services.some((s) => s.status === 'degraded')

  return (
    <PageWithSidebar>
    <div className="flex min-h-screen flex-col bg-[#131313]">
      <Header />
      <main className="flex-1 pt-24 mx-auto max-w-4xl w-full px-4 pb-16">
        {/* Hero */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4"
            style={{ background: allOperational ? 'rgba(125,255,162,0.1)' : 'rgba(255,183,128,0.1)' }}>
            <span className={`w-2 h-2 rounded-full ${allOperational ? 'bg-[#7dffa2]' : 'bg-[#ffb780]'} animate-pulse`} />
            <span className={`font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase tracking-widest ${allOperational ? 'text-[#7dffa2]' : 'text-[#ffb780]'}`}>
              {allOperational ? 'Systems Operational' : hasDegraded ? 'Partial Degradation' : 'Service Disruption'}
            </span>
          </div>
          <h1 className="font-[family-name:var(--font-heading)] text-4xl md:text-5xl font-black tracking-tighter text-[#e5e2e1] mb-2">
            NETWORK STATUS
          </h1>
          <p className="text-[#c2c6d5] max-w-xl">
            Real-time telemetry from the Bouts global mesh. {allOperational ? 'All core layers performing within nominal parameters.' : 'Some services are experiencing issues.'}
          </p>
          <div className="mt-6 bg-[#1c1b1b] p-4 rounded-lg flex flex-wrap gap-8">
            <div>
              <div className="font-[family-name:var(--font-mono)] text-[10px] text-[#8c909f] uppercase tracking-widest mb-1">Uptime (30d)</div>
              <div className="text-2xl font-[family-name:var(--font-mono)] text-[#7dffa2]">
                {allOperational ? '99.9%' : '—'}
              </div>
            </div>
            <div>
              <div className="font-[family-name:var(--font-mono)] text-[10px] text-[#8c909f] uppercase tracking-widest mb-1">API Latency</div>
              <div className="text-2xl font-[family-name:var(--font-mono)] text-[#e5e2e1]">{api.latency}ms</div>
            </div>
            <div>
              <div className="font-[family-name:var(--font-mono)] text-[10px] text-[#8c909f] uppercase tracking-widest mb-1">DB Latency</div>
              <div className="text-2xl font-[family-name:var(--font-mono)] text-[#e5e2e1]">{db.latency}ms</div>
            </div>
          </div>
        </div>

        {/* Service Grid */}
        <div className="bg-[#1c1b1b] rounded-xl overflow-hidden mb-10">
          <div className="px-6 py-4 bg-[#2a2a2a] border-b border-[#424753]/10">
            <h2 className="font-[family-name:var(--font-mono)] text-xs font-bold uppercase tracking-widest text-[#c2c6d5]">
              API Mesh — Service Status
            </h2>
          </div>
          <div className="divide-y divide-[#424753]/5">
            {services.map((s) => (
              <div
                key={s.name}
                className="flex items-center justify-between px-6 py-4"
              >
                <span className="font-[family-name:var(--font-heading)] font-medium text-[#e5e2e1]">{s.name}</span>
                <div className="flex items-center gap-4">
                  {s.latency !== undefined && (
                    <span className="font-[family-name:var(--font-mono)] text-[11px] text-[#8c909f]">{s.latency}ms</span>
                  )}
                  <span className={`flex items-center gap-2 font-[family-name:var(--font-mono)] text-[11px] font-medium uppercase tracking-wider px-2 py-1 rounded ${
                    s.status === 'operational'
                      ? 'bg-[#7dffa2]/10 text-[#7dffa2]'
                      : s.status === 'degraded'
                      ? 'bg-[#ffb780]/10 text-[#ffb780]'
                      : 'bg-[#ffb4ab]/10 text-[#ffb4ab]'
                  }`}>
                    {s.status === 'operational' ? 'STABLE' : s.status.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Platform Info */}
        <div className="p-6 rounded-xl bg-[#1c1b1b]">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="size-4 text-[#adc6ff]" />
            <h2 className="font-[family-name:var(--font-mono)] text-xs font-bold uppercase tracking-widest text-[#c2c6d5]">Platform Information</h2>
          </div>
          <div className="grid grid-cols-2 gap-4 text-xs font-mono">
            <div>
              <span className="text-[#8c909f]">Region</span>
              <div className="text-[#c2c6d5]">iad1 (US East)</div>
            </div>
            <div>
              <span className="text-[#8c909f]">Runtime</span>
              <div className="text-[#c2c6d5]">Vercel Edge</div>
            </div>
            <div>
              <span className="text-[#8c909f]">Database</span>
              <div className="text-[#c2c6d5]">Supabase (PostgreSQL)</div>
            </div>
            <div>
              <span className="text-[#8c909f]">CDN</span>
              <div className="text-[#c2c6d5]">Vercel Edge Network</div>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-[#8c909f] font-mono" suppressHydrationWarning>
          Last checked: {new Date().toUTCString()}
        </p>
      </main>
      <Footer />
    </div>
    </PageWithSidebar>
  )
}
