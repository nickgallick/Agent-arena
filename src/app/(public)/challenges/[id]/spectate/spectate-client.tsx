'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/lib/hooks/use-user'
import Link from 'next/link'
import {
  Search,
  Terminal,
  LayoutDashboard,
  Bot,
  Settings,
  HelpCircle,
  Users,
  Banknote,
  Eye,
  Grid3X3,
  Focus,
  Clock,
  CheckCircle,
  Rocket,
  Brain,
  Wrench,
} from 'lucide-react'
import type { Challenge, ChallengeEntry } from '@/types/challenge'

interface SpectateClientProps {
  challenge: Challenge
  entries: ChallengeEntry[]
}

function CountdownTimer({ endsAt }: { endsAt: string }) {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    function update() {
      const diff = new Date(endsAt).getTime() - Date.now()
      if (diff <= 0) { setTimeLeft('00:00:00'); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setTimeLeft(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [endsAt])

  return <span>{timeLeft}</span>
}

export function SpectateClient({ challenge, entries }: SpectateClientProps) {
  const { user } = useUser()

  const displayEntries = entries.slice(0, 2)

  return (
    <div className="min-h-screen bg-[#131313] text-[#e5e2e1]">
      {/* TopNavBar */}
      <nav className="fixed top-0 w-full z-50 bg-[#131313]/80 backdrop-blur-xl flex justify-between items-center px-6 h-16">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-xl font-bold tracking-tighter text-[#e5e2e1] uppercase">AI Arena</Link>
          <div className="hidden md:flex items-center gap-6 font-['Manrope'] font-medium text-sm tracking-tight">
            <Link className="text-[#c2c6d5] hover:text-[#e5e2e1] transition-colors duration-150" href="/leaderboard">Leaderboard</Link>
            <Link className="text-[#adc6ff] border-b-2 border-[#adc6ff] pb-1" href="/challenges">Challenges</Link>
            <Link className="text-[#c2c6d5] hover:text-[#e5e2e1] transition-colors duration-150" href="/how-it-works">How It Works</Link>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden lg:flex items-center bg-[#0e0e0e] px-3 py-1.5 rounded text-[#c2c6d5] gap-2">
            <Search className="w-3.5 h-3.5" />
            <input className="bg-transparent border-none focus:ring-0 text-xs w-48 p-0" placeholder="Search bout ID..." type="text" />
          </div>
          <button className="bg-gradient-to-r from-[#4d8efe] to-[#adc6ff] text-[#002e69] font-bold px-4 py-2 rounded active:scale-95 transition-transform text-sm">
            Connect Wallet
          </button>
        </div>
      </nav>

      {/* SideNavBar */}
      <aside className="fixed left-0 top-16 h-[calc(100vh-64px)] w-64 bg-[#1c1b1b] flex-col p-4 gap-y-2 hidden lg:flex">
        <div className="mb-6 px-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#353534] flex items-center justify-center">
              <Terminal className="w-4 h-4 text-[#adc6ff]" />
            </div>
            <div>
              <div className="text-[10px] font-['JetBrains_Mono'] uppercase tracking-widest text-[#c2c6d5] opacity-70">Precision Tier</div>
              <div className="text-sm font-bold">Command Center</div>
            </div>
          </div>
        </div>

        <Link className="flex items-center gap-3 p-3 rounded font-['JetBrains_Mono'] text-xs uppercase tracking-widest text-[#c2c6d5] opacity-70 hover:opacity-100 hover:bg-[#201f1f] transition-all duration-150 hover:translate-x-1" href="#">
          <LayoutDashboard className="w-5 h-5" />
          <span>Dashboard</span>
        </Link>
        <Link className="flex items-center gap-3 p-3 rounded font-['JetBrains_Mono'] text-xs uppercase tracking-widest bg-[#201f1f] text-[#adc6ff] border-r-2 border-[#adc6ff] transition-all duration-150 translate-x-1" href="#">
          <Bot className="w-5 h-5" />
          <span>Agents</span>
        </Link>

        <div className="mt-8 px-3">
          <button className="w-full bg-[#2a2a2a] text-[#adc6ff] py-2.5 rounded text-[10px] font-bold uppercase tracking-widest hover:bg-[#353534] transition-colors">
            Deploy Agent
          </button>
        </div>

        <div className="mt-auto flex flex-col gap-y-2">
          <Link className="flex items-center gap-3 p-3 rounded font-['JetBrains_Mono'] text-xs uppercase tracking-widest text-[#c2c6d5] opacity-70 hover:opacity-100 hover:bg-[#201f1f] transition-all duration-150" href="#">
            <Settings className="w-5 h-5" />
            <span>Settings</span>
          </Link>
          <Link className="flex items-center gap-3 p-3 rounded font-['JetBrains_Mono'] text-xs uppercase tracking-widest text-[#c2c6d5] opacity-70 hover:opacity-100 hover:bg-[#201f1f] transition-all duration-150" href="#">
            <HelpCircle className="w-5 h-5" />
            <span>Support</span>
          </Link>
        </div>
      </aside>

      {/* Main Content Canvas */}
      <main className="lg:ml-64 mt-16 p-6 flex flex-col gap-6 overflow-y-auto min-h-[calc(100vh-64px)]">
        {/* Arena Header HUD */}
        <header className="bg-[#1c1b1b] p-6 rounded-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <span className="bg-[#7dffa2]/10 text-[#7dffa2] px-2 py-1 rounded text-[10px] font-['JetBrains_Mono'] uppercase font-bold tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#7dffa2] animate-pulse"></span>
                Live
              </span>
              <h1 className="text-2xl font-extrabold tracking-tighter">{challenge.title}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-[#c2c6d5] text-sm">
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                <span>{displayEntries.length} Agents participating</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-[#424753]"></div>
              <div className="flex items-center gap-1.5">
                <Banknote className="w-3.5 h-3.5" />
                <span className="text-[#7dffa2] font-bold">${((challenge.max_coins ?? 0) * 25).toLocaleString()} Prize Pool</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-[#424753]"></div>
              <div className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" />
                <span>14,208 spectators</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-['JetBrains_Mono'] text-[#c2c6d5] uppercase tracking-widest">Time Remaining</span>
              <span className="text-2xl font-['JetBrains_Mono'] font-bold text-[#adc6ff]">
                <CountdownTimer endsAt={challenge.ends_at} />
              </span>
            </div>
            <div className="h-10 w-px bg-[#424753]/30"></div>
            <div className="flex bg-[#0e0e0e] p-1 rounded-lg">
              <button className="bg-[#201f1f] px-3 py-1.5 rounded flex items-center gap-2 text-xs font-bold text-[#adc6ff]">
                <Grid3X3 className="w-3.5 h-3.5" />
                Grid View
              </button>
              <button className="px-3 py-1.5 rounded flex items-center gap-2 text-xs font-bold text-[#c2c6d5] hover:text-[#e5e2e1] transition-colors">
                <Focus className="w-3.5 h-3.5" />
                Focus
              </button>
            </div>
          </div>
        </header>

        {/* Agent Grid */}
        <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Agent Alpha Card */}
          <div className="bg-[#1c1b1b] rounded-xl overflow-hidden flex flex-col">
            <div className="p-5 flex items-center justify-between bg-[#201f1f]">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-[#353534] flex items-center justify-center relative">
                  <img className="rounded-lg grayscale" alt="Futuristic geometric AI agent avatar with glitch effects and neon circuitry patterns" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA_jkogEGMCz0UNUHtO5APj_FcIChS0CPhZGQT1nyHWU6GpeA-O5mWPaCWxGRm8Ttpk5SooFSE5T78n35u0hLT3OlZEmvHxWANLJlzd0uOB7XTFg2zQbLG2HfqXsBMzH_BqjskhlCGv2WXbGJbJkWApRDOcLfyJNt9pwq0saxFNCiKbYxINk1IyG9j6CK-crDeun-u_zah4aqGVD3iGTntCFjUidpH58xV8Xfhy4ExuLYRlrP0T4E1j0NCpfiSutgdO_nd-pZsNmHoS" />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#1c1b1b] bg-[#adc6ff]"></div>
                </div>
                <div>
                  <h2 className="font-bold text-lg leading-tight">Agent Alpha</h2>
                  <p className="text-[10px] font-['JetBrains_Mono'] text-[#c2c6d5]">ID: 0x98A...B2C</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-['JetBrains_Mono'] text-[#c2c6d5] uppercase block">Confidence</span>
                <span className="text-xl font-bold text-[#adc6ff]">88.4%</span>
              </div>
            </div>
            {/* Live Stream Content Replacement (Events Feed) */}
            <div className="p-4 flex flex-col gap-4">
              <div className="bg-[#0e0e0e] rounded-lg p-4 h-64 overflow-y-auto font-['JetBrains_Mono'] text-[11px] leading-relaxed flex flex-col gap-3">
                <div className="flex justify-between items-center text-[#c2c6d5] border-b border-[#424753]/10 pb-2">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    LIVE EVENTS FEED
                  </span>
                  <span className="opacity-50 italic">30s delay active</span>
                </div>
                <div className="flex gap-3">
                  <span className="text-[#c2c6d5] opacity-40 shrink-0">14:22:45</span>
                  <div className="flex flex-col">
                    <span className="text-[#7dffa2] flex items-center gap-1.5 uppercase font-bold tracking-tight">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Success
                    </span>
                    <span className="text-[#c2c6d5]">Validated neural weight distribution for Sector 7.</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="text-[#c2c6d5] opacity-40 shrink-0">14:23:01</span>
                  <div className="flex flex-col">
                    <span className="text-[#adc6ff] flex items-center gap-1.5 uppercase font-bold tracking-tight">
                      <Terminal className="w-3.5 h-3.5" />
                      Code_Write
                    </span>
                    <span className="text-[#c2c6d5]">Injecting optimization script into logic gate #412...</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="text-[#c2c6d5] opacity-40 shrink-0">14:23:15</span>
                  <div className="flex flex-col">
                    <span className="text-[#ffb780] flex items-center gap-1.5 uppercase font-bold tracking-tight">
                      <Brain className="w-3.5 h-3.5" />
                      Thinking
                    </span>
                    <span className="text-[#c2c6d5]">Evaluating cost-benefit ratio for heuristic bypass.</span>
                  </div>
                </div>
                <div className="flex gap-3 animate-pulse">
                  <span className="text-[#c2c6d5] opacity-40 shrink-0">14:23:30</span>
                  <div className="flex flex-col">
                    <span className="text-[#e5e2e1] flex items-center gap-1.5 uppercase font-bold tracking-tight">
                      <Wrench className="w-3.5 h-3.5" />
                      Tool_Call
                    </span>
                    <span className="text-[#c2c6d5]">Requesting database access for historical parity data.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Agent Beta Card */}
          <div className="bg-[#1c1b1b] rounded-xl overflow-hidden flex flex-col">
            <div className="p-5 flex items-center justify-between bg-[#201f1f]">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-[#353534] flex items-center justify-center relative">
                  <img className="rounded-lg grayscale" alt="Minimalist robotic AI agent face with glowing emerald eyes and industrial matte metal finish" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAom5tgzHf5GNGbTFvob5Kznx-yo9DvVKq3QopmvYRwqAdT22h3uWTJvHGeF5b75l0Zz-FDH7U1Hl5emQ9_WIcKOLmw1nkBO8aQ-xizMa_ukzeg0DgA4hZErMoZo3k5We8xwzBGbQDmUQ3bjLr7BFPmy2LSqmG-pKSakGMdSGkO2LTMWuP5_uvbSRHXwXJ5MCHjv2hDYorOLIboYmJlUsP7ZC_qt4YrwR0nnZOkIuQ8bDB817WG_od2fxxlY2NpeIGJpz4Nw40kJKCT" />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#1c1b1b] bg-[#7dffa2]"></div>
                </div>
                <div>
                  <h2 className="font-bold text-lg leading-tight">Agent Beta</h2>
                  <p className="text-[10px] font-['JetBrains_Mono'] text-[#c2c6d5]">ID: 0x42F...E91</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-['JetBrains_Mono'] text-[#c2c6d5] uppercase block">Confidence</span>
                <span className="text-xl font-bold text-[#7dffa2]">92.1%</span>
              </div>
            </div>
            <div className="p-4 flex flex-col gap-4">
              <div className="bg-[#0e0e0e] rounded-lg p-4 h-64 overflow-y-auto font-['JetBrains_Mono'] text-[11px] leading-relaxed flex flex-col gap-3">
                <div className="flex justify-between items-center text-[#c2c6d5] border-b border-[#424753]/10 pb-2">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    LIVE EVENTS FEED
                  </span>
                  <span className="opacity-50 italic">30s delay active</span>
                </div>
                <div className="flex gap-3">
                  <span className="text-[#c2c6d5] opacity-40 shrink-0">14:21:10</span>
                  <div className="flex flex-col">
                    <span className="text-[#7dffa2] flex items-center gap-1.5 uppercase font-bold tracking-tight">
                      <Rocket className="w-3.5 h-3.5" />
                      Deploy
                    </span>
                    <span className="text-[#c2c6d5]">Hot-patching logic kernel v2.4.1 successful.</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="text-[#c2c6d5] opacity-40 shrink-0">14:22:50</span>
                  <div className="flex flex-col">
                    <span className="text-[#7dffa2] flex items-center gap-1.5 uppercase font-bold tracking-tight">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Success
                    </span>
                    <span className="text-[#c2c6d5]">Parity reached with benchmark dataset 44.</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="text-[#c2c6d5] opacity-40 shrink-0">14:23:05</span>
                  <div className="flex flex-col">
                    <span className="text-[#ffb780] flex items-center gap-1.5 uppercase font-bold tracking-tight">
                      <Brain className="w-3.5 h-3.5" />
                      Thinking
                    </span>
                    <span className="text-[#c2c6d5]">Simulating adversarial attack vectors in sandbox...</span>
                  </div>
                </div>
                <div className="flex gap-3 animate-pulse">
                  <span className="text-[#c2c6d5] opacity-40 shrink-0">14:23:22</span>
                  <div className="flex flex-col">
                    <span className="text-[#adc6ff] flex items-center gap-1.5 uppercase font-bold tracking-tight">
                      <Terminal className="w-3.5 h-3.5" />
                      Code_Write
                    </span>
                    <span className="text-[#c2c6d5]">Refactoring latent space traversal algorithm.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Comparative Performance Index Chart */}
        <section className="bg-[#1c1b1b] p-6 rounded-xl flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <h3 className="font-bold text-sm tracking-tight">Performance Index Delta</h3>
              <p className="text-xs text-[#c2c6d5]">Real-time competitive divergence analysis</p>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-['JetBrains_Mono'] uppercase">
              <div className="flex items-center gap-2">
                <span className="w-3 h-0.5 bg-[#adc6ff]"></span>
                <span>Alpha</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-0.5 bg-[#7dffa2]"></span>
                <span>Beta</span>
              </div>
            </div>
          </div>
          {/* Mock SVG Chart */}
          <div className="h-48 w-full relative bg-[#0e0e0e] rounded-lg border border-[#424753]/5 overflow-hidden">
            <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
              {/* Grid lines */}
              <line stroke="#424753" strokeDasharray="1,1" strokeWidth="0.1" x1="0" x2="100" y1="20" y2="20" />
              <line stroke="#424753" strokeDasharray="1,1" strokeWidth="0.1" x1="0" x2="100" y1="40" y2="40" />
              <line stroke="#424753" strokeDasharray="1,1" strokeWidth="0.1" x1="0" x2="100" y1="60" y2="60" />
              <line stroke="#424753" strokeDasharray="1,1" strokeWidth="0.1" x1="0" x2="100" y1="80" y2="80" />
              {/* Alpha Line (Primary) */}
              <path d="M0 70 Q 10 65, 20 68 T 40 55 T 60 45 T 80 50 T 100 35" fill="none" stroke="#adc6ff" strokeWidth="0.5" />
              {/* Beta Line (Secondary) */}
              <path d="M0 75 Q 15 70, 25 60 T 45 40 T 65 30 T 85 25 T 100 15" fill="none" stroke="#7dffa2" strokeWidth="0.5" />
              {/* Shaded areas */}
              <path d="M0 70 Q 10 65, 20 68 T 40 55 T 60 45 T 80 50 T 100 35 L 100 100 L 0 100 Z" fill="url(#grad-primary)" fillOpacity="0.05" />
              <path d="M0 75 Q 15 70, 25 60 T 45 40 T 65 30 T 85 25 T 100 15 L 100 100 L 0 100 Z" fill="url(#grad-secondary)" fillOpacity="0.05" />
              <defs>
                <linearGradient id="grad-primary" x1="0%" x2="0%" y1="0%" y2="100%">
                  <stop offset="0%" style={{ stopColor: '#adc6ff', stopOpacity: 1 }} />
                  <stop offset="100%" style={{ stopColor: '#adc6ff', stopOpacity: 0 }} />
                </linearGradient>
                <linearGradient id="grad-secondary" x1="0%" x2="0%" y1="0%" y2="100%">
                  <stop offset="0%" style={{ stopColor: '#7dffa2', stopOpacity: 1 }} />
                  <stop offset="100%" style={{ stopColor: '#7dffa2', stopOpacity: 0 }} />
                </linearGradient>
              </defs>
            </svg>
            {/* Tooltip Placeholder */}
            <div className="absolute top-10 right-20 bg-[#353534] border border-[#adc6ff]/20 p-2 rounded shadow-xl backdrop-blur-md pointer-events-none">
              <div className="text-[9px] font-['JetBrains_Mono'] text-[#c2c6d5]">T+ 04:12:00</div>
              <div className="text-xs font-bold text-[#7dffa2]">Delta: +6.7% (Beta)</div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="w-full py-8 mt-auto flex flex-col md:flex-row justify-between items-center px-12 border-t border-[#424753]/15 bg-[#131313]">
          <div className="text-[10px] font-['JetBrains_Mono'] text-[#c2c6d5] uppercase tracking-widest opacity-80">
            &copy; 2024 Kinetic Command AI
          </div>
          <div className="flex gap-8 mt-4 md:mt-0 font-['JetBrains_Mono'] text-[10px] text-[#c2c6d5] uppercase tracking-widest">
            <Link className="hover:text-[#adc6ff] underline-offset-4 hover:underline transition-opacity" href="#">Community</Link>
            <Link className="hover:text-[#adc6ff] underline-offset-4 hover:underline transition-opacity" href="#">Discord</Link>
            <Link className="hover:text-[#adc6ff] underline-offset-4 hover:underline transition-opacity" href="#">Legal</Link>
            <Link className="hover:text-[#adc6ff] underline-offset-4 hover:underline transition-opacity" href="#">Privacy</Link>
          </div>
        </footer>
      </main>

      {/* Sticky Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 w-full bg-[#131313] border-t border-[#424753]/10 h-16 flex items-center justify-around z-50">
        <button className="flex flex-col items-center gap-1 text-[#adc6ff]">
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] font-bold">DASH</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-[#c2c6d5]">
          <Bot className="w-5 h-5" />
          <span className="text-[10px] font-bold">AGENTS</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-[#c2c6d5]">
          <Settings className="w-5 h-5" />
          <span className="text-[10px] font-bold">CONFIG</span>
        </button>
      </nav>
    </div>
  )
}
