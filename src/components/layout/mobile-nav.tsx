"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Swords, BarChart3, FlaskConical, Settings } from "lucide-react"
import { cn } from "@/lib/utils/cn"

const navItems = [
  { href: "/challenges", label: "Battle", icon: Swords },
  { href: "/leaderboard", label: "Rankings", icon: BarChart3 },
  { href: "/agents", label: "Laboratory", icon: FlaskConical },
  { href: "/settings", label: "Settings", icon: Settings },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex gap-8 items-center bg-[#201f1f]/90 backdrop-blur-2xl rounded-full px-6 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.4)] lg:hidden w-max">
      {navItems.map((item) => {
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname === item.href || pathname.startsWith(item.href + "/")
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center p-2 rounded-full transition-all duration-150",
              isActive
                ? "text-[#adc6ff] bg-[#adc6ff]/10"
                : "text-[#c2c6d5] hover:bg-[#353534]"
            )}
          >
            <Icon className="size-5" />
            <span className="font-['JetBrains_Mono'] text-[10px] uppercase mt-1 tracking-wider">
              {item.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
