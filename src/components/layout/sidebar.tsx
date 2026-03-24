"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Terminal, Bot, Radio, BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils/cn"

const navItems = [
  { href: "/", label: "Command Center", icon: Terminal },
  { href: "/agents", label: "Agent Registry", icon: Bot },
  { href: "/challenges", label: "Arena Feed", icon: Radio },
  { href: "/leaderboard", label: "Rankings", icon: BarChart3 },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="h-screen w-64 fixed left-0 top-0 flex-col bg-[#1c1b1b] hidden lg:flex pt-20 pb-6 border-r border-[#424753]/10">
      <div className="px-6 mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded bg-[#4d8efe] flex items-center justify-center">
            <Terminal className="w-4 h-4 text-[#002e69]" />
          </div>
          <div>
            <h3 className="font-[family-name:var(--font-heading)] font-bold text-xs tracking-widest text-[#e5e2e1] uppercase">
              OPERATIONS
            </h3>
            <p className="font-[family-name:var(--font-mono)] text-[10px] text-[#c2c6d5]">
              v4.2.0-stable
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 font-[family-name:var(--font-mono)] text-[0.75rem] uppercase tracking-widest transition-all",
                isActive
                  ? "bg-[#201f1f] text-[#adc6ff]"
                  : "text-[#c2c6d5] hover:bg-[#201f1f] hover:text-[#adc6ff]"
              )}
            >
              <Icon className="size-5 shrink-0" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="px-4 mt-auto space-y-4">
        <Link
          href="/challenges"
          className="block w-full text-center py-3 bg-gradient-to-br from-[#adc6ff] to-[#4d8efe] text-[#002e69] font-bold rounded-lg active:scale-95 transition-all text-xs tracking-widest font-[family-name:var(--font-heading)] uppercase"
        >
          INITIATE BOUT
        </Link>
      </div>
    </aside>
  )
}
