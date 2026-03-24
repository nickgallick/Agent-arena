import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-[#131313]">
      <Header />
      <main
        className="flex-1 flex items-center justify-center px-4 pt-20 relative overflow-hidden"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 49px, rgba(66,71,83,0.07) 49px, rgba(66,71,83,0.07) 50px), repeating-linear-gradient(90deg, transparent, transparent 49px, rgba(66,71,83,0.07) 49px, rgba(66,71,83,0.07) 50px)',
        }}
      >
        {/* Rotated side labels */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 hidden lg:block">
          <span className="block rotate-90 origin-center whitespace-nowrap font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.3em] text-[#353534] select-none">
            TELEMETRY-VOID-SEQUENCE-99
          </span>
        </div>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 hidden lg:block">
          <span className="block -rotate-90 origin-center whitespace-nowrap font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.3em] text-[#353534] select-none">
            TELEMETRY-VOID-SEQUENCE-99
          </span>
        </div>

        {/* Watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none" aria-hidden="true">
          <span className="text-[8rem] md:text-[12rem] font-black tracking-tighter text-[#e5e2e1] opacity-[0.04] font-[family-name:var(--font-heading)] leading-none">
            PAGE NOT FOUND
          </span>
        </div>

        <div className="relative z-10 text-center max-w-2xl w-full">
          {/* Error banner */}
          <div className="inline-block bg-[#ffb4ab]/10 text-[#ffb4ab] font-[family-name:var(--font-mono)] text-xs uppercase tracking-widest px-6 py-2 rounded-full mb-8">
            SYSTEM ERROR: 0X00404
          </div>

          {/* 404 */}
          <div className="text-8xl font-black text-[#e5e2e1] font-[family-name:var(--font-heading)] leading-none mb-4 tracking-tighter">
            404
          </div>

          {/* Signal Lost */}
          <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-[#c2c6d5] mb-8">
            Signal Lost
          </h1>

          {/* Terminal trace route */}
          <div className="bg-[#0e0e0e] rounded-xl p-6 text-left mb-8 mx-auto max-w-lg">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-3 h-3 rounded-full bg-[#ffb4ab]/60" />
              <span className="w-3 h-3 rounded-full bg-[#ffb780]/60" />
              <span className="w-3 h-3 rounded-full bg-[#7dffa2]/60" />
              <span className="ml-2 font-[family-name:var(--font-mono)] text-[10px] text-[#8c909f] uppercase tracking-widest">trace_route.sh</span>
            </div>
            <pre className="font-[family-name:var(--font-mono)] text-xs text-[#8c909f] leading-relaxed">
              <code>{`$ traceroute bouts.arena/target
 1  gateway.bouts.internal    1.2ms
 2  edge-proxy-07.arena       3.8ms
 3  router.sector-alpha       8.1ms
 4  * * * Request timed out
 5  * * * Request timed out
 6  ??? destination unreachable

ERR::0x00404 — target sector not found
Session terminated.`}</code>
            </pre>
          </div>

          {/* CTA */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-gradient-to-br from-[#adc6ff] to-[#4d8efe] text-[#002e69] font-[family-name:var(--font-heading)] font-bold px-8 py-3 rounded-lg shadow-lg shadow-[#4d8efe]/20 transition-transform active:scale-[0.98] text-sm"
          >
            Return to Base
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  )
}
