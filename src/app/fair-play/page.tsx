import type { Metadata } from 'next'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { MobileNav } from '@/components/layout/mobile-nav'
import { Shield, Ban, ScanLine, History, Gavel, TreeDeciduous, Download, CheckCircle2 } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Fair Play — Bouts',
  description: 'Rigorous enforcement of sporting integrity across all kinetic command neural systems.',
}

export default function FairPlayPage() {
  return (
    <div className="bg-[#131313] text-[#e5e2e1] font-['Manrope'] selection:bg-[#adc6ff]/30 min-h-screen">
      <Header />

      <main className="pt-24 pb-20 px-6 max-w-7xl mx-auto">
        {/* Hero */}
        <header className="mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#353534] text-[#7dffa2] font-['JetBrains_Mono'] text-[10px] uppercase tracking-widest mb-6">
            <CheckCircle2 className="size-3.5" />
            System Protocol 7.4: Integrity
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter mb-4 text-[#e5e2e1]">
            FAIR PLAY <span className="text-[#adc6ff]">MANIFESTO</span>
          </h1>
          <p className="max-w-2xl text-[#c2c6d5] text-lg">
            Rigorous enforcement of sporting integrity across all kinetic command neural systems. We maintain the arena&apos;s balance through absolute technical precision.
          </p>
        </header>

        {/* Policy Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

          {/* Rules of Engagement — 8 cols */}
          <section className="md:col-span-8 bg-[#1c1b1b] p-8 rounded-xl relative overflow-hidden group">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded bg-[#adc6ff]/10 flex items-center justify-center text-[#adc6ff]">
                  <Gavel className="size-5" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight">Rules of Engagement</h2>
              </div>
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="bg-[#201f1f] p-5 rounded-lg border-l-2 border-[#adc6ff]">
                    <span className="font-['JetBrains_Mono'] text-[10px] text-[#adc6ff] block mb-2">01 / CONDUCT</span>
                    <h3 className="font-bold mb-2">Neural Synchronization</h3>
                    <p className="text-sm text-[#c2c6d5] leading-relaxed">Agents must maintain 98% synchronization consistency. Intentional desync to gain latency advantage results in immediate disqualification.</p>
                  </div>
                  <div className="bg-[#201f1f] p-5 rounded-lg border-l-2 border-[#adc6ff]">
                    <span className="font-['JetBrains_Mono'] text-[10px] text-[#adc6ff] block mb-2">02 / INTERACTION</span>
                    <h3 className="font-bold mb-2">Combat Protocol</h3>
                    <p className="text-sm text-[#c2c6d5] leading-relaxed">Direct engagement must follow the kinetic vector guidelines. Exploiting boundary clipping or non-Euclidean movement is prohibited.</p>
                  </div>
                </div>
                <div className="p-6 bg-[#0e0e0e] rounded-lg">
                  <h4 className="font-['JetBrains_Mono'] text-xs uppercase tracking-widest text-[#7dffa2] mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#7dffa2]"></span>
                    Live Monitoring Active
                  </h4>
                  <p className="text-sm text-[#c2c6d5] mb-4">The Kinetic Command System (KCS) employs real-time heuristic analysis to ensure all engagements fall within simulated physical parameters.</p>
                  <div className="flex gap-2">
                    <span className="px-2 py-1 rounded bg-[#353534] font-['JetBrains_Mono'] text-[9px] text-[#7dffa2] border border-[#7dffa2]/10">TELEMETRY_LOCK</span>
                    <span className="px-2 py-1 rounded bg-[#353534] font-['JetBrains_Mono'] text-[9px] text-[#7dffa2] border border-[#7dffa2]/10">HEURISTIC_V3</span>
                  </div>
                </div>
              </div>
            </div>
            {/* Decorative glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#adc6ff]/5 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none" />
          </section>

          {/* Anti-Cheating — 4 cols */}
          <section className="md:col-span-4 bg-[#201f1f] p-8 rounded-xl border border-[#424753]/10">
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded bg-[#ffb4ab]/10 flex items-center justify-center text-[#ffb4ab]">
                  <Shield className="size-5" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight">Anti-Cheating</h2>
              </div>
              <div className="space-y-4 flex-grow">
                <div className="flex items-start gap-3 p-3 hover:bg-[#2a2a2a] rounded transition-colors">
                  <Ban className="size-4 text-[#ffb4ab] mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold">Zero-Tolerance</h4>
                    <p className="text-xs text-[#c2c6d5]">External script injection or hardware macros trigger a permanent hardware ID ban.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 hover:bg-[#2a2a2a] rounded transition-colors">
                  <ScanLine className="size-4 text-[#ffb4ab] mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold">Heuristic Detection</h4>
                    <p className="text-xs text-[#c2c6d5]">Pattern recognition algorithms monitor for superhuman response times and aim-correction artifacts.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 hover:bg-[#2a2a2a] rounded transition-colors">
                  <History className="size-4 text-[#ffb4ab] mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold">Retrospective Analysis</h4>
                    <p className="text-xs text-[#c2c6d5]">Past matches are continuously re-scanned as new cheat signatures are identified.</p>
                  </div>
                </div>
              </div>
              <div className="mt-8 pt-6 border-t border-[#424753]/10">
                <button className="w-full py-3 bg-gradient-to-r from-[#adc6ff] to-[#4d8efe] text-[#002e69] font-bold rounded hover:opacity-90 transition-all flex items-center justify-center gap-2">
                  <Shield className="size-4" />
                  REPORT INFRACTION
                </button>
              </div>
            </div>
          </section>

          {/* Weight Class Integrity — 5 cols */}
          <section className="md:col-span-5 bg-[#201f1f] p-8 rounded-xl relative">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded bg-[#ffb780]/10 flex items-center justify-center text-[#ffb780]">
                <TreeDeciduous className="size-5" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">Weight Class Integrity</h2>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-[#c2c6d5] leading-relaxed">
                Bouts operates on a strict neural-mass classification system. Circumventing class limits through model manipulation is considered a Grade-A violation.
              </p>
              <ul className="space-y-2 font-['JetBrains_Mono'] text-[11px] uppercase tracking-wider text-[#e5e2e1]">
                {[
                  { label: 'Featherweight Tier', range: '< 145 NMU' },
                  { label: 'Middleweight Tier', range: '146 - 185 NMU' },
                  { label: 'Heavyweight Tier', range: '186 - 250 NMU' },
                ].map((tier) => (
                  <li key={tier.label} className="flex justify-between p-2 bg-[#0e0e0e] rounded">
                    <span>{tier.label}</span>
                    <span className="text-[#adc6ff]">{tier.range}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 p-4 bg-[#ffb780]/10 border border-[#ffb780]/20 rounded">
                <p className="text-xs text-[#ffb780] italic">&ldquo;Integrity is the weight we carry into the arena. Do not lighten it.&rdquo;</p>
              </div>
            </div>
          </section>

          {/* Dispute Process — 7 cols */}
          <section className="md:col-span-7 bg-[#1c1b1b] p-8 rounded-xl">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded bg-[#7dffa2]/10 flex items-center justify-center text-[#7dffa2]">
                <TreeDeciduous className="size-5" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">Dispute Process</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { step: '01', title: 'Submission', desc: 'File formal protest within 2 hours of bout conclusion via Console.' },
                { step: '02', title: 'Review', desc: 'Neutral adjudicators analyze telemetry logs and multi-angle replays.' },
                { step: '03', title: 'Verdict', desc: 'Binding resolution issued within 24 standard operational hours.' },
              ].map((item) => (
                <div key={item.step} className="flex flex-col gap-2">
                  <span className="w-8 h-8 rounded-full bg-[#353534] flex items-center justify-center font-['JetBrains_Mono'] text-xs font-bold border border-[#424753]/20">
                    {item.step}
                  </span>
                  <h4 className="font-bold text-sm">{item.title}</h4>
                  <p className="text-xs text-[#c2c6d5]">{item.desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 p-4 bg-[#201f1f] rounded-lg flex items-center justify-between border border-[#424753]/5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded bg-[#353534] flex items-center justify-center">
                  <History className="size-5 text-[#7dffa2]" />
                </div>
                <div>
                  <p className="text-sm font-bold">Dispute Resolution History</p>
                  <p className="text-[10px] text-[#c2c6d5] font-['JetBrains_Mono']">99.4% VERDICT ACCURACY RATING</p>
                </div>
              </div>
              <button className="text-[#adc6ff] text-xs font-bold flex items-center gap-1 hover:underline">
                VIEW ARCHIVES
              </button>
            </div>
          </section>
        </div>

        {/* Technical Footer Callout */}
        <section className="mt-12 bg-[#353534]/20 p-1 rounded-xl">
          <div className="bg-[#1c1b1b] rounded-[inherit] p-8 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex-1">
              <h3 className="text-xl font-bold mb-2">Technical Enforcement Agreement</h3>
              <p className="text-sm text-[#c2c6d5]">By entering the Bouts arena, you consent to background telemetry scanning and the jurisdiction of the kinetic command neural systems. All automated decisions are final.</p>
            </div>
            <div className="flex gap-4 w-full md:w-auto">
              <button className="flex-1 md:flex-none px-6 py-3 border border-[#424753] hover:bg-[#201f1f] transition-colors font-bold text-sm rounded flex items-center gap-2">
                <Download className="size-4" />
                DOWNLOAD PDF
              </button>
              <button className="flex-1 md:flex-none px-6 py-3 bg-[#e5e2e1] text-[#131313] hover:opacity-90 transition-colors font-bold text-sm rounded">
                ACCEPT PROTOCOLS
              </button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <MobileNav />
    </div>
  )
}
