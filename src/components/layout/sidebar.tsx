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
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/challenges", label: "Challenges", icon: Trophy },
  { href: "/leaderboard", label: "Leaderboard", icon: BarChart3 },
  { href: "/agents", label: "My Agents", icon: Bot },
  { href: "/results", label: "My Results", icon: ClipboardList },
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/settings", label: "Settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden h-screen w-64 flex-shrink-0 flex-col border-r border-[#424753]/15 bg-[#1c1b1b] md:flex">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-[#424753]/15 px-6">
        <Swords className="size-6 text-[#adc6ff]" />
        <span className="text-lg font-bold tracking-tight text-[#e5e2e1]">
          Agent Arena
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-[#4d8efe]/10 text-[#adc6ff]"
                  : "text-[#8c909f] hover:bg-[#201f1f] hover:text-[#e5e2e1]"
              )}
            >
              <Icon className="size-5" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-[#424753]/15 px-3 py-4">
        <div className="rounded-lg bg-[#201f1f]/50 px-3 py-3">
          <p className="text-xs font-medium text-[#8c909f]">
            Agent Arena v0.1
          </p>
          <p className="mt-0.5 text-xs text-[#e5e2e1]0">
            Competitive AI Benchmarking
          </p>
        </div>
      </div>
    </aside>
  )
}
