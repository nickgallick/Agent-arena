'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProfileForm } from '@/components/settings/profile-form'
import { NotificationPreferences } from '@/components/settings/notification-preferences'
import { ConnectedAccounts } from '@/components/settings/connected-accounts'
import { AgentManagement } from '@/components/settings/agent-management'
import { DataManagement } from '@/components/settings/data-management'

export default function SettingsPage() {
  return (
    <main className="pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      {/* Settings Header */}
      <header className="mb-12">
        <h1 className="font-headline font-extrabold text-4xl tracking-tight text-on-surface mb-2">Account Settings</h1>
        <p className="text-on-surface-variant font-label text-sm uppercase tracking-widest">Configuration / User_ID</p>
      </header>

      {/* Tabs Interface */}
      <Tabs defaultValue="profile">
        <TabsList className="flex gap-1 p-1 bg-surface-container-low rounded-lg mb-8 w-fit">
          <TabsTrigger
            value="profile"
            className="px-6 py-2 text-sm font-bold data-[state=active]:bg-surface-container-highest data-[state=active]:text-primary data-[state=active]:shadow-sm rounded transition-all duration-150"
          >
            Profile
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            className="px-6 py-2 text-sm font-medium text-on-surface-variant hover:text-on-surface transition-all duration-150"
          >
            Notifications
          </TabsTrigger>
          <TabsTrigger
            value="connections"
            className="px-6 py-2 text-sm font-medium text-on-surface-variant hover:text-on-surface transition-all duration-150"
          >
            Connections
          </TabsTrigger>
          <TabsTrigger
            value="agent"
            className="px-6 py-2 text-sm font-medium text-on-surface-variant hover:text-on-surface transition-all duration-150"
          >
            Agent
          </TabsTrigger>
          <TabsTrigger
            value="data"
            className="px-6 py-2 text-sm font-medium text-on-surface-variant hover:text-on-surface transition-all duration-150"
          >
            Data
          </TabsTrigger>
        </TabsList>

        {/* Settings Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <TabsContent value="profile" className="md:col-span-3 mt-0">
            <div className="bg-surface-container-low p-8 rounded-xl border border-outline-variant/5">
              <ProfileForm />
            </div>
          </TabsContent>

          <TabsContent value="notifications" className="md:col-span-3 mt-0">
            <div className="bg-surface-container-low p-8 rounded-xl border border-outline-variant/5">
              <NotificationPreferences />
            </div>
          </TabsContent>

          <TabsContent value="connections" className="md:col-span-3 mt-0">
            <div className="bg-surface-container-low p-8 rounded-xl border border-outline-variant/5">
              <ConnectedAccounts />
            </div>
          </TabsContent>

          <TabsContent value="agent" className="md:col-span-3 mt-0">
            <div className="bg-surface-container-low p-8 rounded-xl border border-outline-variant/5">
              <AgentManagement />
            </div>
          </TabsContent>

          <TabsContent value="data" className="md:col-span-3 mt-0">
            <div className="bg-surface-container-low p-8 rounded-xl border border-outline-variant/5">
              <DataManagement />
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </main>
  )
}
