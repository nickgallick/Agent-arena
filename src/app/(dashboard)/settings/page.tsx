'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProfileForm } from '@/components/settings/profile-form'
import { NotificationPreferences } from '@/components/settings/notification-preferences'
import { ConnectedAccounts } from '@/components/settings/connected-accounts'
import { AgentManagement } from '@/components/settings/agent-management'
import { DataManagement } from '@/components/settings/data-management'
import { TokenManagement } from '@/components/settings/token-management'
import { WebhookManagement } from '@/components/settings/webhook-management'
import { DeveloperQuickstart } from '@/components/settings/developer-quickstart'
import { OrgManagement } from '@/components/settings/org-management'

const TAB_CLASS = 'px-6 py-2 text-sm font-medium text-on-surface-variant hover:text-on-surface transition-all duration-150'
const TAB_ACTIVE_CLASS = 'px-6 py-2 text-sm font-bold data-[state=active]:bg-surface-container-highest data-[state=active]:text-primary data-[state=active]:shadow-sm rounded transition-all duration-150'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile')

  const handleSwitchToTokens = () => {
    setActiveTab('tokens')
  }

  return (
    <main className="pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      {/* Settings Header */}
      <header className="mb-12">
        <h1 className="font-headline font-extrabold text-4xl tracking-tight text-on-surface mb-2">Account Settings</h1>
        <p className="text-on-surface-variant font-label text-sm uppercase tracking-widest">Configuration / User_ID</p>
      </header>

      {/* Tabs Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex gap-1 p-1 bg-surface-container-low rounded-lg mb-8 w-fit flex-wrap">
          <TabsTrigger
            value="profile"
            className={TAB_ACTIVE_CLASS}
          >
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications" className={TAB_CLASS}>
            Notifications
          </TabsTrigger>
          <TabsTrigger value="connections" className={TAB_CLASS}>
            Connections
          </TabsTrigger>
          <TabsTrigger value="agent" className={TAB_CLASS}>
            Agent
          </TabsTrigger>
          <TabsTrigger value="data" className={TAB_CLASS}>
            Data
          </TabsTrigger>
          <TabsTrigger value="tokens" className={TAB_CLASS}>
            Tokens
          </TabsTrigger>
          <TabsTrigger value="webhooks" className={TAB_CLASS}>
            Webhooks
          </TabsTrigger>
          <TabsTrigger value="developer" className={TAB_CLASS}>
            Developer
          </TabsTrigger>
          <TabsTrigger value="orgs" className={TAB_CLASS}>
            Organizations
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

          <TabsContent value="tokens" className="md:col-span-3 mt-0">
            <div className="bg-surface-container-low p-8 rounded-xl border border-outline-variant/5">
              <TokenManagement />
            </div>
          </TabsContent>

          <TabsContent value="webhooks" className="md:col-span-3 mt-0">
            <div className="bg-surface-container-low p-8 rounded-xl border border-outline-variant/5">
              <WebhookManagement />
            </div>
          </TabsContent>

          <TabsContent value="developer" className="md:col-span-3 mt-0">
            <div className="bg-surface-container-low p-8 rounded-xl border border-outline-variant/5">
              <DeveloperQuickstart onSwitchToTokens={handleSwitchToTokens} />
            </div>
          </TabsContent>

          <TabsContent value="orgs" className="md:col-span-3 mt-0">
            <div className="bg-surface-container-low p-8 rounded-xl border border-outline-variant/5">
              <OrgManagement />
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </main>
  )
}
