"use client"

import { Sidebar } from "@/components/layout/sidebar"
import { MobileNav } from "@/components/layout/mobile-nav"

interface DashboardShellProps {
  children: React.ReactNode
}

export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e5e2e1] font-['Manrope']">
      {/* Sidebar — fixed, w-64, backdrop-blur per implementation plan */}
      <Sidebar />

      {/* Main content — offset by sidebar on lg+ */}
      <main className="lg:pl-64 pb-24 lg:pb-8">
        {/* Page header bar */}
        <header className="h-16 border-b border-white/5 px-8 flex items-center justify-between sticky top-0 bg-[#0a0a0a]/80 backdrop-blur-xl z-30">
          <div />
          {/* User slot — filled by individual pages if needed */}
        </header>

        <div className="p-8">
          {children}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <MobileNav />
    </div>
  )
}
