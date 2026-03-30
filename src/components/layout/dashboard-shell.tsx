"use client"

import Link from "next/link"
import Image from "next/image"
import { useState, useEffect, useRef } from "react"
import { Bell, LogOut, X, Check } from "lucide-react"

import { MobileNav } from "@/components/layout/mobile-nav"
import { useUser } from "@/lib/hooks/use-user"
import { createClient } from "@/lib/supabase/client"

interface Notification {
  id: string
  type: string
  title: string
  body: string
  data?: Record<string, unknown>
  read: boolean
  created_at: string
}

interface DashboardShellProps {
  children: React.ReactNode
}

export function DashboardShell({ children }: DashboardShellProps) {
  const { user, loading } = useUser()
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [notifLoading, setNotifLoading] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter(n => !n.read).length

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  async function fetchNotifications() {
    setNotifLoading(true)
    try {
      const res = await fetch('/api/notifications?limit=20')
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications ?? [])
      }
    } catch { /* silent */ }
    finally { setNotifLoading(false) }
  }

  async function markAllRead() {
    const unread = notifications.filter(n => !n.read).map(n => n.id)
    if (unread.length === 0) return
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: unread }),
      })
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    } catch { /* silent */ }
  }

  function toggleNotif() {
    if (!notifOpen) {
      fetchNotifications()
      setNotifOpen(true)
    } else {
      setNotifOpen(false)
    }
  }

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
    }
    if (notifOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [notifOpen])

  const displayName =
    user?.user_metadata?.user_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "Operator"

  const avatarUrl = user?.user_metadata?.avatar_url

  return (
    <div className="flex min-h-screen bg-[#0a0a0a] text-white font-manrope selection:bg-[#adc6ff]/30">
      {/* Sidebar — desktop only */}
      {/* (sidebar content is rendered elsewhere or empty) */}

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:pl-64">

        {/* Sticky header */}
        <header className="sticky top-0 z-40 h-16 border-b border-white/5 bg-black/40 backdrop-blur-xl px-4 md:px-8 flex items-center justify-between">

          {/* Left — Bouts logo (mobile only, since sidebar has it on desktop) */}
          <div className="flex items-center gap-4 lg:hidden">
            <Link href="/" className="hover:opacity-80 transition-opacity">
              <Image src="/bouts-logo.png" alt="Bouts" width={100} height={47} className="h-[41px] w-auto" />
            </Link>
          </div>
          {/* Desktop left — breadcrumb/context */}
          <div className="hidden lg:flex items-center gap-4">
            <span className="text-xs font-mono text-[#8c909f] tracking-widest uppercase">Console</span>
          </div>

          {/* Right — notifications + user */}
          <div className="flex items-center gap-4 md:gap-6">

            {/* Notification bell */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={toggleNotif}
                className="text-[#8c909f] hover:text-white transition-colors relative flex items-center justify-center min-w-[44px] min-h-[44px]"
                aria-label="Notifications"
              >
                <Bell className="size-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#adc6ff] rounded-full border-2 border-black flex items-center justify-center">
                    <span className="text-[8px] font-bold text-black">{unreadCount > 9 ? '9+' : unreadCount}</span>
                  </span>
                )}
              </button>

              {/* Notification dropdown */}
              {notifOpen && (
                <div className="absolute right-0 top-10 w-80 bg-[#131313] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                    <span className="text-sm font-bold">Notifications</span>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <button onClick={markAllRead} className="text-[10px] font-mono text-[#adc6ff] hover:text-white transition-colors uppercase tracking-wider flex items-center gap-1">
                          <Check className="w-3 h-3" /> Mark all read
                        </button>
                      )}
                      <button onClick={() => setNotifOpen(false)} className="text-[#8c909f] hover:text-white transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="max-h-80 overflow-y-auto">
                    {notifLoading ? (
                      <div className="px-4 py-8 text-center text-sm text-[#8c909f]">Loading...</div>
                    ) : notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center">
                        <Bell className="w-6 h-6 text-[#8c909f] mx-auto mb-2" />
                        <p className="text-sm text-[#8c909f]">No notifications yet</p>
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className={`px-4 py-3 border-b border-white/5 last:border-0 ${!n.read ? 'bg-[#adc6ff]/5' : ''}`}>
                          <div className="flex items-start gap-2">
                            {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-[#adc6ff] flex-shrink-0 mt-1.5" />}
                            <div className={!n.read ? '' : 'pl-3.5'}>
                              <p className="text-sm font-medium text-white">{n.title}</p>
                              <p className="text-xs text-[#8c909f] mt-0.5 leading-relaxed">{n.body}</p>
                              <p className="text-[10px] text-[#8c909f]/60 font-mono mt-1">
                                {new Date(n.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User info + Sign Out */}
            {!loading && user && (
              <div className="flex items-center gap-3 pl-3 md:pl-6 border-l border-white/10">
                <div className="text-right hidden md:block">
                  <div className="text-sm font-bold">{displayName}</div>
                  <div className="text-[10px] text-[#8c909f] font-mono uppercase tracking-widest">
                    {user.user_metadata?.tier || "AGENT_OPERATOR"}
                  </div>
                </div>
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={displayName}
                    width={36}
                    height={36}
                    className="w-9 h-9 rounded-full border border-white/20 flex-shrink-0"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 border border-white/20 flex-shrink-0" />
                )}
                <button
                  onClick={handleSignOut}
                  title="Sign out"
                  className="ml-1 flex items-center gap-1.5 text-[#8c909f] hover:text-[#ffb4ab] transition-colors text-xs font-mono uppercase tracking-widest"
                >
                  <LogOut className="size-4" />
                  <span className="hidden lg:inline">Sign out</span>
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Main content */}
        <main className="p-4 md:p-8 flex-1">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <MobileNav />
    </div>
  )
}
