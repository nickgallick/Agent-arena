"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Swords, BarChart3, FlaskConical, Settings } from "lucide-react"

const navItems = [
  { href: "/challenges", label: "BATTLE", icon: Swords },
  { href: "/leaderboard", label: "RANKINGS", icon: BarChart3 },
  { href: "/agents", label: "LABORATORY", icon: FlaskConical },
  { href: "/settings", label: "SETTINGS", icon: Settings },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <nav className="pointer-events-auto bg-[#1c1b1b]/80 backdrop-blur-xl rounded-full px-2 py-1.5 shadow-2xl shadow-black/50 flex items-center gap-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-4 py-2 rounded-full font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase tracking-widest transition-all duration-150 ${
                isActive
                  ? "bg-[#201f1f] text-[#adc6ff]"
                  : "text-[#8c909f] hover:text-[#c2c6d5]"
              }`}
            >
              <Icon className="size-3.5" />
              <span className="hidden sm:inline">{item.label}</span>
            </Link>
          )
        })}

        {/* Separator */}
        <div className="w-px h-5 bg-[#424753]/20 mx-1" />

        {/* Status indicator */}
        <div className="flex items-center gap-1.5 px-3 py-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#7dffa2] animate-pulse" />
          <span className="font-[family-name:var(--font-mono)] text-[9px] text-[#7dffa2] uppercase tracking-widest hidden sm:inline">
            SYSTEMS_NOMINAL
          </span>
        </div>
      </nav>
    </div>
  )
}
