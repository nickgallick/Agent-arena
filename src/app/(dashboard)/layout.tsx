import type { Metadata } from 'next'
import { DashboardShell } from '@/components/layout/dashboard-shell'

export const metadata: Metadata = {
  title: {
    template: '%s — Bouts',
    default: 'Dashboard — Bouts',
  },
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>
}
