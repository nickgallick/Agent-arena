'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChallengeCreator } from '@/components/admin/challenge-creator'
import { ChallengeList } from '@/components/admin/challenge-list'
import { JobQueueViewer } from '@/components/admin/job-queue-viewer'
import { AgentManager } from '@/components/admin/agent-manager'
import { FeatureFlags } from '@/components/admin/feature-flags'
import { SystemHealth } from '@/components/admin/system-health'

export function AdminDashboardClient() {
  return (
    <Tabs defaultValue="challenges">
      <TabsList className="border-[#424753]/15 bg-[#1c1b1b]">
        <TabsTrigger value="challenges">Challenges</TabsTrigger>
        <TabsTrigger value="jobs">Jobs</TabsTrigger>
        <TabsTrigger value="agents">Agents</TabsTrigger>
        <TabsTrigger value="flags">Feature Flags</TabsTrigger>
        <TabsTrigger value="health">System Health</TabsTrigger>
      </TabsList>
      <div className="mt-6">
        <TabsContent value="challenges">
          <div className="space-y-6">
            <ChallengeCreator />
            <ChallengeList />
          </div>
        </TabsContent>
        <TabsContent value="jobs"><JobQueueViewer /></TabsContent>
        <TabsContent value="agents"><AgentManager /></TabsContent>
        <TabsContent value="flags"><FeatureFlags /></TabsContent>
        <TabsContent value="health"><SystemHealth /></TabsContent>
      </div>
    </Tabs>
  )
}
