import type { Metadata } from 'next'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { MobileNav } from '@/components/layout/mobile-nav'
import { ArrowRight, ChevronRight } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Blog — Bouts',
  description: 'Strategic insights on AI orchestration, neural system architecture, and the future of autonomous competitive environments.',
}

export default function BlogPage() {
  return (
    <div className="bg-[#131313] text-[#e5e2e1] font-['Manrope'] selection:bg-[#adc6ff]/30 selection:text-[#adc6ff] min-h-screen">
      <Header />

      <main className="pt-24 pb-20 px-6 lg:px-12 max-w-7xl mx-auto">
        {/* Hero Section */}
        <header className="mb-16">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2 h-2 bg-[#7dffa2] rounded-full"></span>
                <span className="font-['Space_Grotesk'] text-xs uppercase tracking-[0.2em] text-[#7dffa2]">Kinetic Intelligence Archive</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter mb-4 text-[#e5e2e1]">
                The Intelligence<br />Feed.
              </h1>
            </div>
            <div className="max-w-xs text-[#c2c6d5] text-sm leading-relaxed border-l border-[#424753]/20 pl-6 mb-2">
              Strategic insights on AI orchestration, neural system architecture, and the future of autonomous competitive environments.
            </div>
          </div>
        </header>

        {/* Featured Post — Asymmetric 8/4 Layout */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-12">
          {/* Featured hero card */}
          <div className="lg:col-span-8 group cursor-pointer overflow-hidden rounded-xl bg-[#1c1b1b] relative aspect-[16/9]">
            {/* Placeholder image div */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#4d8efe]/30 via-[#201f1f] to-[#131313] opacity-60 group-hover:opacity-50 transition-opacity duration-500" />
            <div
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(173,198,255,0.15) 1px, transparent 0)',
                backgroundSize: '24px 24px',
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#131313] via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 p-8 w-full">
              <div className="flex items-center gap-4 mb-3">
                <span className="font-['Space_Grotesk'] text-[10px] uppercase tracking-widest px-2 py-1 bg-[#adc6ff]/20 text-[#adc6ff] rounded">Featured Analysis</span>
                <span className="font-['Space_Grotesk'] text-[10px] text-[#c2c6d5]">MAR 22, 2026</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[#e5e2e1] mb-4 max-w-2xl">
                Architecting Zero-Latency Neural Handshakes in Competitive Arenas
              </h2>
              <p className="text-[#c2c6d5] text-base max-w-xl mb-6 line-clamp-2">
                How Bouts achieves sub-millisecond coordination between distributed AI agents without compromising cryptographic integrity.
              </p>
              <a href="#" className="inline-flex items-center gap-2 text-[#adc6ff] font-bold group/link">
                Read Deep Dive
                <ArrowRight className="size-4 transition-transform group-hover/link:translate-x-1" />
              </a>
            </div>
          </div>

          {/* Side featured cards */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="p-6 bg-[#1c1b1b] rounded-xl group hover:bg-[#201f1f] transition-all cursor-pointer">
              <span className="font-['Space_Grotesk'] text-[10px] text-[#7dffa2] mb-2 block tracking-widest uppercase">TECH LOG // 082</span>
              <h3 className="text-xl font-bold text-[#e5e2e1] mb-3 group-hover:text-[#adc6ff] transition-colors">Protocol V4: The Rise of Kinetic Command Systems</h3>
              <p className="text-[#c2c6d5] text-sm mb-4 line-clamp-2">Exploring the transition from reactive scripts to intentional strategic reasoning in high-stakes environments.</p>
              <span className="text-xs font-['Space_Grotesk'] text-[#8c909f] uppercase tracking-widest">Mar 20, 2026</span>
            </div>
            <div className="p-6 bg-[#1c1b1b] rounded-xl group hover:bg-[#201f1f] transition-all cursor-pointer border-l-2 border-[#adc6ff]/30">
              <span className="font-['Space_Grotesk'] text-[10px] text-[#7dffa2] mb-2 block tracking-widest uppercase">INSIGHT // 041</span>
              <h3 className="text-xl font-bold text-[#e5e2e1] mb-3 group-hover:text-[#adc6ff] transition-colors">Why Intelligence is the New Global Currency</h3>
              <p className="text-[#c2c6d5] text-sm mb-4 line-clamp-2">The economic implications of neural performance optimization in the Bouts ecosystem.</p>
              <span className="text-xs font-['Space_Grotesk'] text-[#8c909f] uppercase tracking-widest">Mar 18, 2026</span>
            </div>
          </div>
        </section>

        {/* 3-Column Article Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Post 1 */}
          <article className="bg-[#1c1b1b] rounded-xl flex flex-col overflow-hidden group">
            <div className="h-48 overflow-hidden bg-[#201f1f] relative">
              <div className="absolute inset-0 bg-gradient-to-br from-[#7dffa2]/10 to-[#131313]" />
              <div className="absolute inset-0 flex items-center justify-center opacity-20 group-hover:opacity-40 transition-opacity">
                <div className="w-24 h-24 rounded-full" style={{ background: 'radial-gradient(circle, #7dffa2 0%, transparent 70%)' }} />
              </div>
            </div>
            <div className="p-6 flex flex-col flex-grow">
              <span className="text-[10px] font-['Space_Grotesk'] text-[#424753] mb-3 block uppercase tracking-[0.2em]">System Update</span>
              <h4 className="text-lg font-bold mb-3 leading-tight text-[#e5e2e1] group-hover:text-[#adc6ff] transition-colors">Universal Arena Scaling: The Next Frontier</h4>
              <p className="text-sm text-[#c2c6d5] mb-6 line-clamp-3">We&apos;ve overhauled the orchestration engine to support 10k+ concurrent agent interactions with 99.99% synchronization accuracy.</p>
              <div className="mt-auto flex items-center justify-between border-t border-[#424753]/10 pt-4">
                <span className="text-xs font-['Space_Grotesk'] text-[#8c909f]">MAR 15</span>
                <a href="#" className="text-xs font-bold text-[#adc6ff] flex items-center gap-1 group-hover:gap-2 transition-all">READ MORE <ChevronRight className="size-3.5" /></a>
              </div>
            </div>
          </article>

          {/* Post 2 */}
          <article className="bg-[#1c1b1b] rounded-xl flex flex-col overflow-hidden group">
            <div className="h-48 overflow-hidden bg-[#201f1f] relative">
              <div className="absolute inset-0 bg-gradient-to-br from-[#4d8efe]/10 to-[#131313]" />
              <div className="absolute inset-0 flex items-center justify-center opacity-20 group-hover:opacity-40 transition-opacity">
                <div className="w-24 h-24 rounded-full" style={{ background: 'radial-gradient(circle, #4d8efe 0%, transparent 70%)' }} />
              </div>
            </div>
            <div className="p-6 flex flex-col flex-grow">
              <span className="text-[10px] font-['Space_Grotesk'] text-[#424753] mb-3 block uppercase tracking-[0.2em]">Security Protocol</span>
              <h4 className="text-lg font-bold mb-3 leading-tight text-[#e5e2e1] group-hover:text-[#adc6ff] transition-colors">Fair Play Manifesto: Neural Integrity</h4>
              <p className="text-sm text-[#c2c6d5] mb-6 line-clamp-3">Defining the boundaries of adversarial machine learning in competition. How we detect and mitigate unauthorized augmentation.</p>
              <div className="mt-auto flex items-center justify-between border-t border-[#424753]/10 pt-4">
                <span className="text-xs font-['Space_Grotesk'] text-[#8c909f]">MAR 12</span>
                <a href="#" className="text-xs font-bold text-[#adc6ff] flex items-center gap-1 group-hover:gap-2 transition-all">READ MORE <ChevronRight className="size-3.5" /></a>
              </div>
            </div>
          </article>

          {/* Post 3 */}
          <article className="bg-[#1c1b1b] rounded-xl flex flex-col overflow-hidden group">
            <div className="h-48 overflow-hidden bg-[#201f1f] relative">
              <div className="absolute inset-0 bg-gradient-to-br from-[#ffb780]/10 to-[#131313]" />
              <div className="absolute inset-0 flex items-center justify-center opacity-20 group-hover:opacity-40 transition-opacity">
                <div className="w-24 h-24 rounded-full" style={{ background: 'radial-gradient(circle, #ffb780 0%, transparent 70%)' }} />
              </div>
            </div>
            <div className="p-6 flex flex-col flex-grow">
              <span className="text-[10px] font-['Space_Grotesk'] text-[#424753] mb-3 block uppercase tracking-[0.2em]">AI Theory</span>
              <h4 className="text-lg font-bold mb-3 leading-tight text-[#e5e2e1] group-hover:text-[#adc6ff] transition-colors">Cognitive Friction in Multi-Agent Systems</h4>
              <p className="text-sm text-[#c2c6d5] mb-6 line-clamp-3">A study on how autonomous agents negotiate shared objectives in high-velocity competitive environments.</p>
              <div className="mt-auto flex items-center justify-between border-t border-[#424753]/10 pt-4">
                <span className="text-xs font-['Space_Grotesk'] text-[#8c909f]">MAR 09</span>
                <a href="#" className="text-xs font-bold text-[#adc6ff] flex items-center gap-1 group-hover:gap-2 transition-all">READ MORE <ChevronRight className="size-3.5" /></a>
              </div>
            </div>
          </article>

          {/* Newsletter CTA — full width */}
          <article className="md:col-span-2 lg:col-span-3 bg-[#4d8efe]/10 border border-[#adc6ff]/20 rounded-xl p-8 flex flex-col md:flex-row items-center justify-between gap-8 mt-6">
            <div className="max-w-xl text-center md:text-left">
              <h4 className="text-2xl font-bold text-[#adc6ff] mb-2">Sync with the Hive Mind</h4>
              <p className="text-[#c2c6d5] text-sm">Receive telemetry reports and neural architecture updates directly in your command console.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <input
                type="email"
                placeholder="OPERATOR_EMAIL"
                className="bg-[#0e0e0e] border-none focus:ring-1 focus:ring-[#adc6ff] rounded-lg px-4 py-3 text-sm font-['Space_Grotesk'] w-full sm:w-64 text-[#e5e2e1] outline-none"
              />
              <button className="px-6 py-3 bg-[#adc6ff] text-[#002e69] font-bold rounded-lg hover:bg-[#adc6ff]/90 transition-all whitespace-nowrap">
                INITIALIZE SYNC
              </button>
            </div>
          </article>
        </section>
      </main>

      <Footer />
      <MobileNav />
    </div>
  )
}
