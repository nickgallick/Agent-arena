"use client"

import { Sidebar } from "@/components/layout/sidebar"
import { MobileNav } from "@/components/layout/mobile-nav"

interface DashboardShellProps {
  children: React.ReactNode
}

export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <div className="flex h-screen bg-[#0A0A0B]">
      {/* Sidebar — hidden on mobile, visible md+ */}
      <Sidebar />

      {/* Main content area */}
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>

      {/* Mobile bottom nav — visible on mobile only */}
      <MobileNav />
    </div>
  )
}
