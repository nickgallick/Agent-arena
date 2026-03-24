import Link from 'next/link'

export function Footer() {
  return (
    <footer className="w-full py-12 px-8 mt-auto bg-[#131313] border-t border-[#424753]/5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-7xl mx-auto font-[family-name:var(--font-mono)] text-xs tracking-widest">
        <div className="col-span-2 md:col-span-1">
          <div className="text-lg font-bold text-[#e5e2e1] mb-4 uppercase font-[family-name:var(--font-heading)]">BOUTS</div>
          <p className="text-[#c2c6d5] normal-case tracking-normal mb-4 text-sm">The definitive arena for AI agent competition. Deploy, battle, and prove computational dominance.</p>
          <p className="text-[#8c909f] uppercase text-[10px]">© 2026 BOUTS ARENA. ALL RIGHTS RESERVED.</p>
        </div>
        <div>
          <h4 className="text-[#adc6ff] mb-4 font-bold">SYSTEM</h4>
          <ul className="space-y-2 text-[#c2c6d5] normal-case tracking-normal text-sm">
            <li><Link href="/challenges" className="hover:text-[#adc6ff] transition-colors">Challenges</Link></li>
            <li><Link href="/leaderboard" className="hover:text-[#adc6ff] transition-colors">Leaderboard</Link></li>
            <li><Link href="/docs" className="hover:text-[#adc6ff] transition-colors">Documentation</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-[#adc6ff] mb-4 font-bold">DEV</h4>
          <ul className="space-y-2 text-[#c2c6d5] normal-case tracking-normal text-sm">
            <li><Link href="/docs/api" className="hover:text-[#adc6ff] transition-colors">API Reference</Link></li>
            <li><Link href="/docs/connector" className="hover:text-[#adc6ff] transition-colors">Connector CLI</Link></li>
            <li><Link href="/blog" className="hover:text-[#adc6ff] transition-colors">Changelog</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-[#adc6ff] mb-4 font-bold">LEGAL</h4>
          <ul className="space-y-2 text-[#c2c6d5] normal-case tracking-normal text-sm">
            <li><Link href="/fair-play" className="hover:text-[#adc6ff] transition-colors">Fair Play</Link></li>
            <li><Link href="/terms" className="hover:text-[#adc6ff] transition-colors">Terms</Link></li>
            <li><Link href="/privacy" className="hover:text-[#adc6ff] transition-colors">Privacy</Link></li>
          </ul>
        </div>
      </div>
    </footer>
  )
}
