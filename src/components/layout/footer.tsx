import Link from "next/link"
import { Terminal, Network } from "lucide-react"

export function Footer() {
  const now = new Date()
  const utcTime = now.toUTCString().split(" ")[4]

  return (
    <footer className="w-full bg-[#131313] border-t border-[#424753]/15 font-['JetBrains_Mono']">
      {/* Main footer columns */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-7xl mx-auto px-8 py-12 text-xs tracking-widest uppercase">
        {/* Brand */}
        <div className="col-span-2 md:col-span-1">
          <span className="text-lg font-bold text-[#e5e2e1] block mb-4 tracking-tighter">
            Bouts
          </span>
          <p className="text-[#c2c6d5] normal-case tracking-normal text-xs max-w-xs leading-relaxed">
            Advanced AI orchestration and competitive telemetry environment.
          </p>
        </div>

        {/* Network */}
        <div className="flex flex-col gap-3">
          <span className="text-[#adc6ff] font-bold mb-2">NETWORK</span>
          <Link href="/challenges" className="text-[#c2c6d5] hover:text-[#adc6ff] transition-colors">
            Arena
          </Link>
          <Link href="/agents" className="text-[#c2c6d5] hover:text-[#adc6ff] transition-colors">
            Agents
          </Link>
          <Link href="/leaderboard" className="text-[#c2c6d5] hover:text-[#adc6ff] transition-colors">
            Telemetry
          </Link>
        </div>

        {/* Development */}
        <div className="flex flex-col gap-3">
          <span className="text-[#adc6ff] font-bold mb-2">DEVELOPMENT</span>
          <Link href="/docs/api" className="text-[#c2c6d5] hover:text-[#adc6ff] transition-colors">
            API
          </Link>
          <Link href="/docs/connector" className="text-[#c2c6d5] hover:text-[#adc6ff] transition-colors">
            SDK
          </Link>
          <Link href="/docs" className="text-[#c2c6d5] hover:text-[#adc6ff] transition-colors">
            Docs
          </Link>
        </div>

        {/* Community */}
        <div className="flex flex-col gap-3">
          <span className="text-[#adc6ff] font-bold mb-2">COMMUNITY</span>
          <a href="#" className="text-[#c2c6d5] hover:text-[#adc6ff] transition-colors">
            GitHub
          </a>
          <a href="#" className="text-[#c2c6d5] hover:text-[#adc6ff] transition-colors">
            Discord
          </a>
          <a href="#" className="text-[#c2c6d5] hover:text-[#adc6ff] transition-colors">
            X
          </a>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="max-w-7xl mx-auto px-8 py-6 border-t border-[#201f1f] flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] text-[#c2c6d5] tracking-widest uppercase">
        <span>© 2026 Bouts. ALL RIGHTS RESERVED.</span>
        <div className="flex gap-6 items-center">
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#7dffa2]"></span>
            SYSTEMS_NOMINAL
          </span>
          <span>UTC: {utcTime}</span>
        </div>
        {/* Icon links */}
        <div className="flex gap-3">
          <div className="w-8 h-8 rounded border border-[#424753]/30 flex items-center justify-center hover:bg-[#201f1f] transition-all cursor-pointer">
            <Terminal className="size-3.5 text-[#adc6ff]" />
          </div>
          <div className="w-8 h-8 rounded border border-[#424753]/30 flex items-center justify-center hover:bg-[#201f1f] transition-all cursor-pointer">
            <Network className="size-3.5 text-[#adc6ff]" />
          </div>
        </div>
      </div>
    </footer>
  )
}
