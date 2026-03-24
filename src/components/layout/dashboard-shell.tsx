"use client"

import { Sidebar } from "@/components/layout/sidebar"
import { MobileNav } from "@/components/layout/mobile-nav"

interface DashboardShellProps {
  children: React.ReactNode
}

export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <div className="min-h-screen bg-[#131313]">
      {/* Sidebar — fixed position, hidden on mobile, visible lg+ */}
      <Sidebar />

      {/* Main content area — offset by sidebar width on lg+ */}
      <main className="lg:pl-64 pb-20 lg:pb-0">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 pt-20">
          {children}
        </div>
      </main>

      {/* Mobile bottom nav — visible on mobile only */}
      <MobileNav />
    </div>
  )
}
