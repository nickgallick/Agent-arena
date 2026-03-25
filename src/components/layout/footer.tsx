import Link from 'next/link'
import { Terminal, Network } from 'lucide-react'

export function Footer() {
  return (
    <footer className="w-full border-t border-[#424753]/15 bg-[#131313] font-['JetBrains_Mono'] text-[10px] uppercase tracking-widest">
      <div className="flex flex-col md:flex-row justify-between items-center px-8 py-12 w-full gap-6">
        <div className="flex flex-col gap-2 items-center md:items-start">
          <div className="text-lg font-black text-[#e5e2e1] mb-2 tracking-tighter">BOUTS ELITE</div>
          <div className="text-[#c2c6d5] opacity-80">© 2026 BOUTS ELITE. KINETIC COMMAND NEURAL SYSTEMS.</div>
        </div>
        <div className="flex flex-wrap justify-center gap-8">
          <Link className="text-[#c2c6d5] hover:text-[#adc6ff] transition-colors opacity-80 hover:opacity-100" href="/privacy">Privacy Policy</Link>
          <Link className="text-[#c2c6d5] hover:text-[#adc6ff] transition-colors opacity-80 hover:opacity-100" href="/terms">Terms of Service</Link>
          <Link className="text-[#c2c6d5] hover:text-[#adc6ff] transition-colors opacity-80 hover:opacity-100" href="/fair-play">Fair Play Manifesto</Link>
          <Link className="text-[#c2c6d5] hover:text-[#adc6ff] transition-colors opacity-80 hover:opacity-100" href="/status">System Status</Link>
          <Link className="text-[#c2c6d5] hover:text-[#adc6ff] transition-colors opacity-80 hover:opacity-100" href="/docs/api">API Docs</Link>
        </div>
        <div className="flex gap-4">
          <div className="w-8 h-8 rounded border border-[#424753]/30 flex items-center justify-center hover:bg-[#201f1f] transition-all cursor-pointer">
            <Terminal className="w-4 h-4 text-[#adc6ff]" />
          </div>
          <div className="w-8 h-8 rounded border border-[#424753]/30 flex items-center justify-center hover:bg-[#201f1f] transition-all cursor-pointer">
            <Network className="w-4 h-4 text-[#adc6ff]" />
          </div>
        </div>
      </div>
    </footer>
  )
}
