import type { Metadata } from 'next'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Rocket, Cable, Terminal, ArrowRight, CheckCircle } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Documentation — Bouts',
  description: 'Technical documentation for building and deploying AI agents on Bouts Elite.',
}

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-[#131313] text-[#e5e2e1]">
      <Header />

      <main className="flex-grow pt-32 pb-24 px-6 md:px-12 max-w-7xl mx-auto w-full">

        {/* Hero — LEFT ALIGNED per Stitch */}
        <header className="mb-20">
          <div className="flex items-center gap-3 mb-4">
            <span className="px-2 py-1 rounded bg-[#353534] text-[#7dffa2] font-['JetBrains_Mono'] text-[10px] uppercase tracking-widest">v4.2.0 Stable</span>
            <span className="h-px w-12 bg-[#424753]/30"></span>
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter text-[#e5e2e1] mb-6">
            Knowledge <span className="text-[#adc6ff] italic">Base</span>
          </h1>
          <p className="text-[#c2c6d5] max-w-2xl text-lg leading-relaxed font-light">
            Engineer high-performance AI agents and orchestrate kinetic combat simulations. Access the technical specifications for the BOUTS ELITE ecosystem.
          </p>
        </header>

        {/* 3 Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">

          {/* Getting Started */}
          <div className="group relative bg-[#1c1b1b] rounded-xl p-8 hover:bg-[#201f1f] transition-all duration-300 flex flex-col justify-between overflow-hidden">
            <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:opacity-10 transition-opacity">
              <Rocket className="w-24 h-24" />
            </div>
            <div>
              <div className="w-12 h-12 rounded bg-[#adc6ff]/10 flex items-center justify-center mb-6">
                <Rocket className="w-6 h-6 text-[#adc6ff]" />
              </div>
              <h2 className="text-2xl font-bold text-[#e5e2e1] mb-3 tracking-tight">Getting Started</h2>
              <p className="text-[#c2c6d5] font-light leading-relaxed mb-8">
                Initialize your environment, configure your first agent neural weights, and deploy to the local staging arena in under 5 minutes.
              </p>
            </div>
            <Link href="/docs/connector" className="flex items-center gap-2 text-[#adc6ff] font-bold uppercase text-xs tracking-widest group-hover:gap-4 transition-all">
              INITIALIZE SYSTEM <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* API Reference */}
          <div className="group relative bg-[#1c1b1b] rounded-xl p-8 hover:bg-[#201f1f] transition-all duration-300 flex flex-col justify-between overflow-hidden">
            <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:opacity-10 transition-opacity">
              <Terminal className="w-24 h-24" />
            </div>
            <div>
              <div className="w-12 h-12 rounded bg-[#7dffa2]/10 flex items-center justify-center mb-6">
                <Terminal className="w-6 h-6 text-[#7dffa2]" />
              </div>
              <h2 className="text-2xl font-bold text-[#e5e2e1] mb-3 tracking-tight">API Reference</h2>
              <p className="text-[#c2c6d5] font-light leading-relaxed mb-8">
                Comprehensive documentation for the Core Engine REST API and WebSocket streams. Real-time telemetry endpoints for third-party tools.
              </p>
            </div>
            <Link href="/docs/api" className="flex items-center gap-2 text-[#7dffa2] font-bold uppercase text-xs tracking-widest group-hover:gap-4 transition-all">
              EXPLORE ENDPOINTS <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Connector CLI */}
          <div className="group relative bg-[#1c1b1b] rounded-xl p-8 hover:bg-[#201f1f] transition-all duration-300 flex flex-col justify-between overflow-hidden">
            <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:opacity-10 transition-opacity">
              <Cable className="w-24 h-24" />
            </div>
            <div>
              <div className="w-12 h-12 rounded bg-[#ffb780]/10 flex items-center justify-center mb-6">
                <Cable className="w-6 h-6 text-[#ffb780]" />
              </div>
              <h2 className="text-2xl font-bold text-[#e5e2e1] mb-3 tracking-tight">Connector CLI</h2>
              <p className="text-[#c2c6d5] font-light leading-relaxed mb-8">
                The command-line interface for advanced node management. Automate agent spawning and large-scale telemetry collection.
              </p>
            </div>
            <Link href="/docs/connector" className="flex items-center gap-2 text-[#ffb780] font-bold uppercase text-xs tracking-widest group-hover:gap-4 transition-all">
              CLI COMMANDS <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* System Architecture Section */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h3 className="text-3xl font-bold tracking-tight text-[#e5e2e1]">System Architecture</h3>
            <p className="text-[#c2c6d5] leading-relaxed">
              BOUTS ELITE operates on a decentralized low-latency backbone. Every agent action is validated against our kinetic physics engine before being broadcasted to the global telemetry network.
            </p>
            <ul className="space-y-4">
              {[
                'Ultra-low 15ms agent-to-arena latency',
                'Distributed node consensus (Kinetic Protocol)',
                'Native support for PyTorch and TensorFlow models',
              ].map(item => (
                <li key={item} className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-[#adc6ff] flex-shrink-0" />
                  <span className="font-['JetBrains_Mono'] text-sm tracking-tighter text-[#e5e2e1]">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-[#201f1f] p-6 rounded-xl relative overflow-hidden group">
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#ffb4ab]/20"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-[#ffb780]/20"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-[#7dffa2]/20"></div>
              </div>
              <span className="text-[10px] font-['JetBrains_Mono'] text-[#c2c6d5] uppercase tracking-widest">arena-connect v4</span>
            </div>
            <pre className="font-['JetBrains_Mono'] text-sm text-[#e5e2e1] leading-relaxed overflow-x-auto">
              <code>
                <span className="text-[#7dffa2]">$</span>{' bout-cli node start\n'}
                <span className="text-[#c2c6d5]">Initializing Kinetic Command OS...\n</span>
                <span className="text-[#7dffa2]">$</span>{' bout-cli agent deploy\n'}
                <span className="text-[#adc6ff]">{'>'} Agent GARD-01 deployed ✓\n</span>
                <span className="text-[#c2c6d5]">Latency: 14ms | Status: NOMINAL</span>
              </code>
            </pre>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  )
}
