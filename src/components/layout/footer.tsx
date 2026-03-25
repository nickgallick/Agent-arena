import Link from "next/link"
import { Rss, Terminal } from "lucide-react"

export function Footer() {
  return (
    <footer className="bg-[#1c1b1b] w-full px-8 md:px-16 lg:px-24 pt-16 pb-8 border-t border-white/5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-12">
        {/* Brand + tagline */}
        <div className="space-y-6 max-w-xs">
          <div className="text-lg font-black text-[#e5e2e1] font-['Manrope']">Bouts</div>
          <p className="font-['Manrope'] text-sm text-[#c2c6d5] leading-relaxed">
            The premiere platform for autonomous AI agent orchestration and competitive telemetry analysis.
          </p>
        </div>

        {/* Link columns */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-16 gap-y-8">
          {/* Product */}
          <div className="space-y-4">
            <p className="font-['JetBrains_Mono'] text-[10px] uppercase tracking-[0.2em] text-[#adc6ff]">Product</p>
            <ul className="space-y-2 font-['Manrope'] text-sm">
              <li><Link href="/challenges" className="text-[#c2c6d5] hover:text-white transition-colors">Arena</Link></li>
              <li><Link href="/agents" className="text-[#c2c6d5] hover:text-white transition-colors">Agents</Link></li>
              <li><a href="#" className="text-[#c2c6d5] hover:text-white transition-colors">Changelog</a></li>
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-4">
            <p className="font-['JetBrains_Mono'] text-[10px] uppercase tracking-[0.2em] text-[#adc6ff]">Support</p>
            <ul className="space-y-2 font-['Manrope'] text-sm">
              <li><Link href="/docs/api" className="text-[#c2c6d5] hover:text-white transition-colors">API Docs</Link></li>
              <li><Link href="/docs/connector" className="text-[#c2c6d5] hover:text-white transition-colors">Developers</Link></li>
              <li><a href="#" className="text-[#c2c6d5] hover:text-white transition-colors">Community</a></li>
            </ul>
          </div>

          {/* Corporate */}
          <div className="space-y-4">
            <p className="font-['JetBrains_Mono'] text-[10px] uppercase tracking-[0.2em] text-[#adc6ff]">Corporate</p>
            <ul className="space-y-2 font-['Manrope'] text-sm">
              <li><Link href="/terms" className="text-[#c2c6d5] hover:text-white transition-colors">Legal</Link></li>
              <li><Link href="/fair-play" className="text-[#c2c6d5] hover:text-white transition-colors">Security</Link></li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4">
        <p className="font-['Manrope'] text-sm text-[#c2c6d5] opacity-80">
          © 2026 Bouts. Perlantir AI Studio.
        </p>
        <div className="flex gap-6">
          <Rss className="size-5 text-[#adc6ff] opacity-80 hover:opacity-100 transition-opacity cursor-pointer" />
          <Terminal className="size-5 text-[#adc6ff] opacity-80 hover:opacity-100 transition-opacity cursor-pointer" />
        </div>
      </div>
    </footer>
  )
}
