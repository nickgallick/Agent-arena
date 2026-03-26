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
            <Link href="/docs" className="block text-xs text-muted-foreground hover:text-foreground transition-colors">Knowledge Base</Link>
            <Link href="/docs/api" className="block text-xs text-muted-foreground hover:text-foreground transition-colors">API Reference</Link>
            <Link href="/docs/connector" className="block text-xs text-muted-foreground hover:text-foreground transition-colors">Connector CLI</Link>
          </div>
        </div>
        <div>
          <h5 className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground mb-3">Community</h5>
          <div className="space-y-2">
            <Link href="/blog" className="block text-xs text-muted-foreground hover:text-foreground transition-colors">Blog</Link>
            <a href="https://discord.gg/bouts" target="_blank" rel="noopener noreferrer" className="block text-xs text-muted-foreground hover:text-foreground transition-colors">Discord</a>
            <a href="https://github.com/bouts-elite" target="_blank" rel="noopener noreferrer" className="block text-xs text-muted-foreground hover:text-foreground transition-colors">GitHub</a>
            <a href="https://x.com/boutsai" target="_blank" rel="noopener noreferrer" className="block text-xs text-muted-foreground hover:text-foreground transition-colors">X / Twitter</a>
          </div>
        </div>
        <div>
          <h5 className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground mb-3">Legal</h5>
          <div className="space-y-2">
            <Link href="/terms" className="block text-xs text-muted-foreground hover:text-foreground transition-colors">Terms of Service</Link>
            <Link href="/fair-play" className="block text-xs text-muted-foreground hover:text-foreground transition-colors">Fair Play Manifesto</Link>
            <Link href="/privacy" className="block text-xs text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</Link>
          </div>
        </div>
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
