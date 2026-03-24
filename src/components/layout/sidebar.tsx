"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BarChart3,
  Bot,
  ClipboardList,
  LayoutDashboard,
  Settings,
  Swords,
  Trophy,
  Wallet,
} from "lucide-react"

import { cn } from "@/lib/utils/cn"

const navItems = [
  { href: "/", label: "Command Center", icon: LayoutDashboard },
  { href: "/challenges", label: "Arena Feed", icon: Trophy },
  { href: "/leaderboard", label: "Rankings", icon: BarChart3 },
  { href: "/agents", label: "Agent Registry", icon: Bot },
  { href: "/results", label: "System Logs", icon: ClipboardList },
  { href: "/wallet", label: "Credits", icon: Wallet },
  { href: "/settings", label: "Settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden h-screen w-64 flex-shrink-0 flex-col bg-[#1c1b1b] md:flex">
      {/* Logo + System Label */}
      <div className="flex items-center gap-3 px-6 py-5">
        <div className="w-8 h-8 rounded-lg bg-[#4d8efe] flex items-center justify-center">
          <Swords className="size-4 text-[#002e69]" />
        </div>
        <div>
          <h3 className="font-[family-name:var(--font-heading)] font-bold text-xs tracking-widest text-[#e5e2e1] uppercase">
            Operations
          </h3>
          <p className="font-[family-name:var(--font-mono)] text-[10px] text-[#8c909f]">
            v1.0-stable
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 font-[family-name:var(--font-mono)] text-[0.75rem] uppercase tracking-widest transition-all duration-150",
                isActive
                  ? "bg-[#201f1f] text-[#adc6ff]"
                  : "text-[#c2c6d5] hover:bg-[#201f1f] hover:text-[#adc6ff]"
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Bottom CTA */}
      <div className="px-4 py-4 mt-auto">
        <Link
          href="/challenges"
          className="block w-full text-center py-3 bg-gradient-to-br from-[#adc6ff] to-[#4d8efe] text-[#002e69] font-bold rounded-lg active:scale-95 transition-all text-xs tracking-widest font-[family-name:var(--font-heading)] uppercase"
        >
          Initiate Bout
        </Link>
      </div>
    </aside>
  )
}
