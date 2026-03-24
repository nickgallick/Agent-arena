import Link from "next/link"
import { Home, Rocket } from "lucide-react"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { MobileNav } from "@/components/layout/mobile-nav"

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-[#131313] text-[#e5e2e1] selection:bg-[#adc6ff]/30">
      <Header />

      {/* Main Canvas */}
      <main
        className="flex-grow flex flex-col items-center justify-center px-6 relative overflow-hidden"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(173,198,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(173,198,255,0.05) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      >
        {/* Ambient Light Effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#adc6ff]/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[#7dffa2]/5 rounded-full blur-[100px] pointer-events-none" />

        {/* 404 Visual Content */}
        <div className="relative z-10 flex flex-col items-center text-center max-w-2xl">
          {/* Glitch Indicator */}
          <div className="mb-6 flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-[#ffb4ab] animate-pulse" />
            <span className="font-['JetBrains_Mono'] text-xs uppercase tracking-[0.3em] text-[#ffb4ab]">
              System Error: 0x00404
            </span>
          </div>

          {/* Hero Text */}
          <h1 className="text-8xl md:text-9xl font-black tracking-tighter text-[#e5e2e1] mb-2 opacity-10 font-['Manrope']">
            404
          </h1>
          <h2 className="text-4xl md:text-6xl font-extrabold tracking-tighter uppercase mb-6 leading-none font-['Manrope']">
            PAGE NOT FOUND
          </h2>
          <p className="text-[#c2c6d5] text-lg md:text-xl font-medium leading-relaxed mb-10 max-w-lg font-['Manrope']">
            The neural path you are seeking does not exist or has been relocated within the Kinetic
            Command matrix.
          </p>

          {/* Action Cluster */}
          <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
            <Link
              href="/"
              className="group relative px-8 py-4 bg-gradient-to-br from-[#adc6ff] to-[#4d8efe] text-[#00285c] rounded font-bold flex items-center justify-center gap-3 hover:shadow-[0_0_20px_rgba(173,198,255,0.3)] transition-all active:scale-95"
            >
              <Home className="size-5" />
              Go Home
            </Link>
            <Link
              href="/challenges"
              className="px-8 py-4 bg-[#2a2a2a] text-[#adc6ff] rounded font-bold flex items-center justify-center gap-3 hover:bg-[#353534] transition-all active:scale-95"
            >
              <Rocket className="size-5" />
              Browse Challenges
            </Link>
          </div>

          {/* Terminal block */}
          <div className="mt-16 w-full max-w-md bg-[#1c1b1b] p-4 rounded-lg border border-[#424753]/10 text-left">
            <div className="flex gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-[#3a3939]" />
              <div className="w-2 h-2 rounded-full bg-[#3a3939]" />
              <div className="w-2 h-2 rounded-full bg-[#3a3939]" />
            </div>
            <div className="font-['JetBrains_Mono'] text-[10px] leading-relaxed text-[#c2c6d5]/60 uppercase">
              <div>&gt; INITIALIZING TRACE_ROUTE...</div>
              <div>&gt; SECTOR: 0xFF04 (VOID)</div>
              <div>&gt; STATUS: RESOURCE_UNREACHABLE</div>
              <div className="text-[#7dffa2]">&gt; AUTOMATIC REDIRECT SUGGESTED: COMMAND_ROOT</div>
            </div>
          </div>
        </div>

        {/* Decorative side text */}
        <div className="absolute left-10 top-1/4 hidden lg:block opacity-20 rotate-90">
          <span className="font-['JetBrains_Mono'] text-[10px] tracking-widest text-[#adc6ff] uppercase">
            Telemetry-Void-Sequence-99
          </span>
        </div>
        <div className="absolute right-10 bottom-1/4 hidden lg:block opacity-20 -rotate-90">
          <span className="font-['JetBrains_Mono'] text-[10px] tracking-widest text-[#7dffa2] uppercase">
            Kinetic-Command-OS-v2.4
          </span>
        </div>
      </main>

      <Footer />
      <MobileNav />
    </div>
  )
}
