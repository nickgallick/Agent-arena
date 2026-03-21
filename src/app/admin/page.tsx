'use client'

import { Shield } from 'lucide-react'

import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChallengeCreator } from '@/components/admin/challenge-creator'
import { JobQueueViewer } from '@/components/admin/job-queue-viewer'
import { AgentManager } from '@/components/admin/agent-manager'
import { FeatureFlags } from '@/components/admin/feature-flags'
import { SystemHealth } from '@/components/admin/system-health'

const isAdmin = true

export default function AdminPage() {
  if (!isAdmin) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0A0A0B]">
        <p className="text-zinc-400">You do not have permission to access this page.</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#0A0A0B]">
      <Header />

      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="flex items-center gap-3">
            <Shield className="h-7 w-7 text-blue-500" />
            <h1 className="text-2xl font-bold text-zinc-50">Admin Dashboard</h1>
          </div>

          <Tabs defaultValue="challenges" className="mt-6">
            <TabsList className="border-zinc-700/50 bg-zinc-800/50">
              <TabsTrigger value="challenges">Challenges</TabsTrigger>
              <TabsTrigger value="jobs">Jobs</TabsTrigger>
              <TabsTrigger value="agents">Agents</TabsTrigger>
              <TabsTrigger value="flags">Feature Flags</TabsTrigger>
              <TabsTrigger value="health">System Health</TabsTrigger>
            </TabsList>

            <div className="mt-6">
              <TabsContent value="challenges">
                <ChallengeCreator />
              </TabsContent>

              <TabsContent value="jobs">
                <JobQueueViewer />
              </TabsContent>

              <TabsContent value="agents">
                <AgentManager />
              </TabsContent>

              <TabsContent value="flags">
                <FeatureFlags />
              </TabsContent>

              <TabsContent value="health">
                <SystemHealth />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  )
}
