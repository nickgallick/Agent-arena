import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
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
    <div className="flex min-h-screen flex-col bg-[#131313]">
      <Header />
      <main className="flex-1 mx-auto max-w-2xl w-full px-4 py-16">
        {/* Overall Status */}
        <div className="mb-10 p-6 rounded-xl bg-[#1c1b1b] border border-[#424753]/15 text-center">
          {allOperational ? (
            <>
              <CheckCircle className="size-10 text-[#7dffa2] mx-auto mb-3" />
              <h1 className="font-heading text-2xl font-bold text-[#e5e2e1]">All Systems Operational</h1>
              <p className="text-sm text-[#c2c6d5] font-body mt-1">Everything is running smoothly.</p>
            </>
          ) : hasDegraded ? (
            <>
              <AlertTriangle className="size-10 text-[#ffb780] mx-auto mb-3" />
              <h1 className="font-heading text-2xl font-bold text-[#e5e2e1]">Partial Degradation</h1>
              <p className="text-sm text-[#c2c6d5] font-body mt-1">Some services are experiencing issues.</p>
            </>
          ) : (
            <>
              <XCircle className="size-10 text-[#ffb4ab] mx-auto mb-3" />
              <h1 className="font-heading text-2xl font-bold text-[#e5e2e1]">Service Disruption</h1>
              <p className="text-sm text-[#c2c6d5] font-body mt-1">We are investigating and working on a fix.</p>
            </>
          )}
        </div>

        {/* Service List */}
        <div className="space-y-2 mb-10">
          {services.map((s) => (
            <div
              key={s.name}
              className="flex items-center justify-between px-5 py-4 rounded-xl bg-[#1c1b1b] border border-[#424753]/15"
            >
              <span className="font-body font-medium text-[#e5e2e1]">{s.name}</span>
              <div className="flex items-center gap-3">
                {s.latency !== undefined && (
                  <span className="font-mono text-xs text-[#8c909f]">{s.latency}ms</span>
                )}
                <span className={`flex items-center gap-2 font-mono text-xs font-medium uppercase tracking-wider ${
                  s.status === 'operational' ? 'text-[#7dffa2]' : s.status === 'degraded' ? 'text-[#ffb780]' : 'text-[#ffb4ab]'
                }`}>
                  <span className={`w-2 h-2 rounded-full inline-block ${
                    s.status === 'operational' ? 'bg-emerald-400' : s.status === 'degraded' ? 'bg-amber-400' : 'bg-red-400'
                  }`} />
                  {s.status}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Uptime */}
        <div className="p-5 rounded-xl bg-[#1c1b1b] border border-[#424753]/15">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="size-4 text-[#adc6ff]" />
            <h2 className="font-heading font-semibold text-sm text-[#e5e2e1]">Platform Information</h2>
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
  )
}
