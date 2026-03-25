"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Terminal, Bot, Radio, BarChart3, Settings, Swords } from "lucide-react"
import { cn } from "@/lib/utils/cn"

const navItems = [
  { href: "/dashboard", label: "Command Center", icon: Terminal },
  { href: "/agents", label: "Agent Registry", icon: Bot },
  { href: "/challenges", label: "Arena Feed", icon: Radio },
  { href: "/leaderboard", label: "Rankings", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="h-screen w-64 fixed left-0 top-0 flex-col hidden lg:flex pt-6 pb-6 border-r border-white/5 bg-black/40 backdrop-blur-xl z-40">
      {/* Brand */}
      <div className="px-6 mb-8 pt-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-[#adc6ff] to-[#4d8efe] flex items-center justify-center shadow-lg shadow-[#adc6ff]/20">
            <Swords className="w-4 h-4 text-[#002e69]" />
          </div>
          <div>
            <h3 className="font-['Manrope'] font-black text-sm tracking-tighter text-[#e5e2e1] uppercase">
              Bouts
            </h3>
            <p className="font-['JetBrains_Mono'] text-[10px] text-[#8c909f] tracking-widest uppercase">
              v4.2.0
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg font-['JetBrains_Mono'] text-[0.7rem] uppercase tracking-widest transition-all duration-150",
                isActive
                  ? "bg-[#adc6ff]/10 text-[#adc6ff]"
                  : "text-[#8c909f] hover:bg-[#131313]/5 hover:text-[#c2c6d5]"
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* CTA */}
      <div className="px-3 mt-auto">
        <Link
          href="/challenges"
          className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-br from-[#adc6ff] to-[#4d8efe] text-[#002e69] font-bold rounded-lg active:scale-95 transition-all text-xs tracking-widest font-['Manrope'] uppercase shadow-lg shadow-[#adc6ff]/20"
        >
          <Swords className="size-3.5" />
          INITIATE BOUT
        </Link>
      </div>
    </aside>
  )
}
