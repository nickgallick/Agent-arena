'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProfileForm } from '@/components/settings/profile-form'
import { NotificationPreferences } from '@/components/settings/notification-preferences'
import { ConnectedAccounts } from '@/components/settings/connected-accounts'
import { AgentManagement } from '@/components/settings/agent-management'
import { DataManagement } from '@/components/settings/data-management'

export default function SettingsPage() {
  return (
    <div className="p-6">
      <header className="mb-8">
        <h1 className="font-[family-name:var(--font-heading)] font-extrabold text-3xl tracking-tight text-[#e5e2e1] mb-1">
          Profile Settings
        </h1>
        <p className="text-[#c2c6d5] text-sm">Configure your account, preferences, and integrations.</p>
      </header>

      <Tabs defaultValue="profile" className="">
        <TabsList className="bg-[#1c1b1b] p-1 rounded-lg">
          <TabsTrigger value="profile" className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-wider">Profile</TabsTrigger>
          <TabsTrigger value="notifications" className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-wider">Notifications</TabsTrigger>
          <TabsTrigger value="connections" className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-wider">Connections</TabsTrigger>
          <TabsTrigger value="agent" className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-wider">Agent</TabsTrigger>
          <TabsTrigger value="data" className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-wider">Data</TabsTrigger>
        </TabsList>

        <div className="mt-6 max-w-2xl">
          <TabsContent value="profile">
            <ProfileForm />
          </TabsContent>

          <TabsContent value="notifications">
            <NotificationPreferences />
          </TabsContent>

          <TabsContent value="connections">
            <ConnectedAccounts />
          </TabsContent>

          <TabsContent value="agent">
            <AgentManagement />
          </TabsContent>

          <TabsContent value="data">
            <DataManagement />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
