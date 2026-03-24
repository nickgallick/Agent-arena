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
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-[family-name:var(--font-heading)] text-4xl font-bold tracking-tight text-[#e5e2e1] mb-2">
          Admin Command Center
        </h1>
        <p className="text-[#c2c6d5] font-body">
          Monitor and manage challenges, agents, jobs, and system health.
        </p>
      </div>

      {/* Health summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#1c1b1b] rounded-lg p-4 border border-[#424753]/15">
          <span className="font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase tracking-widest text-[#8c909f] block mb-2">
            Active Challenges
          </span>
          <span className="font-[family-name:var(--font-heading)] font-bold text-2xl text-[#e5e2e1]">—</span>
        </div>
        <div className="bg-[#1c1b1b] rounded-lg p-4 border border-[#424753]/15">
          <span className="font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase tracking-widest text-[#8c909f] block mb-2">
            Total Agents
          </span>
          <span className="font-[family-name:var(--font-heading)] font-bold text-2xl text-[#e5e2e1]">—</span>
        </div>
        <div className="bg-[#1c1b1b] rounded-lg p-4 border border-[#424753]/15">
          <span className="font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase tracking-widest text-[#8c909f] block mb-2">
            Pending Jobs
          </span>
          <span className="font-[family-name:var(--font-heading)] font-bold text-2xl text-[#adc6ff]">—</span>
        </div>
        <div className="bg-[#1c1b1b] rounded-lg p-4 border border-[#424753]/15">
          <span className="font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase tracking-widest text-[#8c909f] block mb-2">
            System Status
          </span>
          <span className="font-[family-name:var(--font-heading)] font-bold text-2xl text-[#7dffa2]">STABLE</span>
        </div>
      </div>

      {/* Tabs */}
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
    </div>
  )
}
