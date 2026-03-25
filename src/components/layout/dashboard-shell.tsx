"use client"

import Link from "next/link"
import Image from "next/image"
import { Bell } from "lucide-react"

import { MobileNav } from "@/components/layout/mobile-nav"
import { useUser } from "@/lib/hooks/use-user"

interface DashboardShellProps {
  children: React.ReactNode
}

export function DashboardShell({ children }: DashboardShellProps) {
  const { user, loading } = useUser()

  const displayName =
    user?.user_metadata?.user_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "Operator"

  const avatarUrl = user?.user_metadata?.avatar_url

  return (
    <div className="flex min-h-screen bg-[#0a0a0a] text-white font-manrope selection:bg-[#adc6ff]/100/30">
      {/* Sidebar — fixed, w-64, bg-black/40 backdrop-blur-xl */}
       

      {/* Main content — offset by sidebar on lg+ */}
      <div className="flex-1 flex flex-col lg:pl-64">
        {/* Sticky header */}
        <header className="sticky top-0 z-40 h-16 border-b border-white/5 bg-black/40 backdrop-blur-xl px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-xs font-mono text-[#8c909f] tracking-widest uppercase">Sector 7-G</span>
          </div>
          <div className="flex items-center gap-6">
            {/* Notification bell */}
            <button className="text-[#8c909f] hover:text-white transition-colors relative">
              <Bell className="size-5" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#adc6ff]/100 rounded-full border-2 border-black" />
            </button>

            {/* User info */}
            {!loading && user && (
              <div className="flex items-center gap-3 pl-6 border-l border-white/10">
                <div className="text-right">
                  <div className="text-sm font-bold">{displayName}</div>
                  <div className="text-[10px] text-[#8c909f] font-mono uppercase tracking-widest">
                    {user.user_metadata?.tier || "AGENT_OPERATOR"}
                  </div>
                </div>
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={displayName}
                    width={40}
                    height={40}
                    className="w-10 h-10 rounded-full border border-white/20"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 border border-white/20" />
                )}
              </div>
            )}
          </div>
        </header>

        {/* Main content */}
        <main className="p-8 flex-1">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <MobileNav />
    </div>
  )
}
