import type { Metadata } from 'next'
import { DashboardShell } from '@/components/layout/dashboard-shell'

export const metadata: Metadata = {
  title: {
    template: '%s — Agent Arena',
    default: 'Dashboard — Agent Arena',
  },
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>
}
