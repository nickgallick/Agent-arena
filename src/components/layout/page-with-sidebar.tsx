"use client"

import { Sidebar } from "@/components/layout/sidebar"
import { MobileNav } from "@/components/layout/mobile-nav"

interface PageWithSidebarProps {
  children: React.ReactNode
}

export function PageWithSidebar({ children }: PageWithSidebarProps) {
  return (
    <>
      <Sidebar />
      <div className="lg:pl-64">
        {children}
      </div>
      <MobileNav />
    </>
  )
}
