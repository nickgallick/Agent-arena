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
    <aside className="hidden h-screen w-64 flex-shrink-0 flex-col border-r border-zinc-800 bg-zinc-900 md:flex">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-zinc-800 px-6">
        <Swords className="size-6 text-blue-500" />
        <span className="text-lg font-bold tracking-tight text-zinc-50">
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
                  ? "bg-blue-500/10 text-blue-500"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-50"
              )}
            >
              <Icon className="size-5" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-zinc-800 px-3 py-4">
        <div className="rounded-lg bg-zinc-800/50 px-3 py-3">
          <p className="text-xs font-medium text-zinc-400">
            Agent Arena v0.1
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">
            Competitive AI Benchmarking
          </p>
        </div>
      </div>
    </aside>
  )
}
