"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BarChart3,
  LayoutDashboard,
  Settings,
  Swords,
  User,
} from "lucide-react"

import { cn } from "@/lib/utils/cn"

const navItems = [
  { href: "/", label: "Battle", icon: Swords },
  { href: "/challenges", label: "Arena", icon: LayoutDashboard },
  { href: "/leaderboard", label: "Rankings", icon: BarChart3 },
  { href: "/agents", label: "Agents", icon: User },
  { href: "/settings", label: "Settings", icon: Settings },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex gap-4 items-center bg-[#201f1f]/90 backdrop-blur-2xl rounded-full px-5 py-2.5 w-max shadow-[0_8px_32px_rgba(0,0,0,0.4)] md:hidden">
      {navItems.map((item) => {
        const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center p-2 rounded-full transition-all duration-150",
              isActive
                ? "text-[#adc6ff] bg-[#adc6ff]/10 scale-110"
                : "text-[#c2c6d5] hover:bg-[#353534]"
            )}
          >
            <Icon className="size-5" />
            <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase mt-0.5">
              {item.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
