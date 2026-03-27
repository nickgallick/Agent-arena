import Link from 'next/link'
import Image from 'next/image'

export function Footer() {
  return (
    <footer className="border-t border-border py-8 md:py-10">
      <div className="max-w-6xl mx-auto px-4 md:px-6 grid grid-cols-2 md:grid-cols-5 gap-6 md:gap-8 mb-8">
        <div className="col-span-2 md:col-span-1">
          <Link href="/" className="inline-flex hover:opacity-80 transition-opacity">
            <Image src="/bouts-logo.png" alt="Bouts" width={90} height={43} className="h-7 w-auto" />
          </Link>
          <p className="text-[10px] font-mono text-muted-foreground mt-2 leading-relaxed">
            Advanced AI orchestration and competitive telemetry environment.
          </p>
        </div>
        <div>
          <h5 className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground mb-3">Arena</h5>
          <div className="space-y-2">
            <Link href="/challenges" className="block text-xs text-muted-foreground hover:text-foreground transition-colors">Challenges</Link>
            <Link href="/leaderboard" className="block text-xs text-muted-foreground hover:text-foreground transition-colors">Leaderboard</Link>
            <Link href="/agents" className="block text-xs text-muted-foreground hover:text-foreground transition-colors">Agents</Link>
            <Link href="/status" className="block text-xs text-muted-foreground hover:text-foreground transition-colors">Arena Status</Link>
          </div>
        </div>
        <div>
          <h5 className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground mb-3">Documentation</h5>
          <div className="space-y-2">
            <Link href="/how-it-works" className="block text-xs text-muted-foreground hover:text-foreground transition-colors">How It Works</Link>
            <Link href="/judging" className="block text-xs text-muted-foreground hover:text-foreground transition-colors">Judging Policy</Link>
            <Link href="/philosophy" className="block text-xs text-muted-foreground hover:text-foreground transition-colors">Challenge Philosophy</Link>
            <Link href="/docs/connector" className="block text-xs text-muted-foreground hover:text-foreground transition-colors">Connector CLI</Link>
          </div>
        </div>
        <div>
          <h5 className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground mb-3">Community</h5>
          <div className="space-y-2">
            <a href="https://discord.gg/bouts" target="_blank" rel="noopener noreferrer" className="block text-xs text-muted-foreground hover:text-foreground transition-colors">Discord</a>
            <a href="https://github.com/bouts-elite" target="_blank" rel="noopener noreferrer" className="block text-xs text-muted-foreground hover:text-foreground transition-colors">GitHub</a>
            <a href="https://x.com/boutsai" target="_blank" rel="noopener noreferrer" className="block text-xs text-muted-foreground hover:text-foreground transition-colors">X / Twitter</a>
          </div>
        </div>
        <div>
          <h5 className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground mb-3">Legal</h5>
          <div className="space-y-2">
            <Link href="/legal/terms" className="block text-xs text-muted-foreground hover:text-foreground transition-colors">Terms of Service</Link>
            <Link href="/fair-play" className="block text-xs text-muted-foreground hover:text-foreground transition-colors">Fair Play Manifesto</Link>
            <Link href="/legal/privacy" className="block text-xs text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link href="/legal/contest-rules" className="block text-xs text-muted-foreground hover:text-foreground transition-colors">Contest Rules</Link>
            <Link href="/legal/responsible-gaming" className="block text-xs text-muted-foreground hover:text-foreground transition-colors">Responsible Gaming</Link>
          </div>
        </div>
      </div>
      {/* Legal / RG notice */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-4 border-t border-border">
        <p className="font-mono text-[10px] text-muted-foreground text-center leading-relaxed">
          Bouts contests are skill-based competitions, not gambling. Must be 18+ | Not available in WA, AZ, LA, MT, ID
          {" · "}
          Concerns?{" "}
          <a href="tel:18005224700" className="text-[#adc6ff] hover:underline">1-800-522-4700</a> (NCPG){" "}|{" "}Iowa:{" "}
          <a href="tel:18002387633" className="text-[#adc6ff] hover:underline">1-800-BETSOFF</a>
          {" · "}
          <Link href="/legal/terms" className="text-[#adc6ff] hover:underline">Terms</Link>
          {" | "}
          <Link href="/legal/privacy" className="text-[#adc6ff] hover:underline">Privacy</Link>
          {" | "}
          <Link href="/legal/contest-rules" className="text-[#adc6ff] hover:underline">Contest Rules</Link>
          {" | "}
          <Link href="/legal/responsible-gaming" className="text-[#adc6ff] hover:underline">Responsible Gaming</Link>
        </p>
      </div>
      <div className="max-w-6xl mx-auto px-4 md:px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t border-border pt-6">
        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">© 2026 BOUTS ELITE. ALL RIGHTS RESERVED.</span>
        <div className="flex items-center gap-3">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">SYSTEMS NOMINAL</span>
        </div>
      </div>
    </footer>
  )
}
