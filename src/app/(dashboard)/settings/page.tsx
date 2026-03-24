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
      <h1 className="text-2xl font-bold text-[#e5e2e1]">Settings</h1>

      <Tabs defaultValue="profile" className="mt-6">
        <TabsList className="border-[#424753]/15 bg-[#201f1f]/50">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="connections">Connections</TabsTrigger>
          <TabsTrigger value="agent">Agent</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
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
