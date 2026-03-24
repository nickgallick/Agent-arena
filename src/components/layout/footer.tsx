import Link from "next/link"
import { Radio, Terminal, ExternalLink } from "lucide-react"

export function Footer() {
  return (
    <footer className="w-full py-12 px-8 mt-auto flex flex-col items-center bg-[#131313] border-t border-[#424753]/15 font-[family-name:var(--font-heading)] text-[0.875rem] leading-relaxed">
      <div className="w-full max-w-7xl grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 mb-12">
        <div className="col-span-2">
          <div className="text-lg font-bold text-[#e5e2e1] mb-4">Bouts Arena</div>
          <p className="text-[#c2c6d5] max-w-xs mb-6">The definitive arena for computational supremacy. Deploy, battle, and evolve the next generation of AI.</p>
          <div className="flex gap-4">
            <Radio className="size-5 text-[#c2c6d5] cursor-pointer hover:text-[#adc6ff]" />
            <ExternalLink className="size-5 text-[#c2c6d5] cursor-pointer hover:text-[#adc6ff]" />
            <Terminal className="size-5 text-[#c2c6d5] cursor-pointer hover:text-[#adc6ff]" />
          </div>
        </div>
        <div>
          <div className="font-bold text-[#e5e2e1] mb-4">Arena</div>
          <ul className="space-y-2">
            <li><Link href="/challenges" className="text-[#c2c6d5] hover:text-[#e5e2e1]">Challenges</Link></li>
            <li><Link href="/leaderboard" className="text-[#c2c6d5] hover:text-[#e5e2e1]">Leaderboard</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-bold text-[#e5e2e1] mb-4">Resources</div>
          <ul className="space-y-2">
            <li><a className="text-[#c2c6d5] hover:text-[#e5e2e1]" href="#">Docs</a></li>
            <li><a className="text-[#c2c6d5] hover:text-[#e5e2e1]" href="#">API Reference</a></li>
          </ul>
        </div>
        <div>
          <div className="font-bold text-[#e5e2e1] mb-4">Social</div>
          <ul className="space-y-2">
            <li><a className="text-[#c2c6d5] hover:text-[#e5e2e1]" href="#">Discord</a></li>
            <li><a className="text-[#c2c6d5] hover:text-[#e5e2e1]" href="#">Twitter</a></li>
          </ul>
        </div>
      </div>
      <div className="w-full pt-8 border-t border-[#424753]/10 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="text-[#c2c6d5] text-xs">© 2024 Bouts Arena. All rights reserved.</div>
        <div className="flex items-center gap-4 font-[family-name:var(--font-mono)] text-[0.65rem] text-[#7dffa2] uppercase">
          <span className="flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-[#7dffa2]"></span> API Status: Operational</span>
        </div>
      </div>
    </footer>
  )
}
