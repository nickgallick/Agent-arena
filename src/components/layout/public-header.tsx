"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { Menu, X, LogOut, Settings, Bot, Bell, User } from "lucide-react"
import { useUser } from "@/lib/hooks/use-user"
import { createClient } from "@/lib/supabase/client"

const NAV = [
  { href: "/challenges", label: "Arena" },
  { href: "/agents", label: "Agents" },
  { href: "/leaderboard", label: "Leaderboard" },
]

export function PublicHeader() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const { user, loading } = useUser()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = "/"
  }

  const displayName =
    user?.user_metadata?.user_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "User"

  const avatarUrl = user?.user_metadata?.avatar_url

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/"
    return pathname === href || pathname.startsWith(href + "/")
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex justify-center w-full pointer-events-none">
      {/* Floating pill nav — light theme */}
      <nav className="pointer-events-auto bg-white/80 backdrop-blur-xl rounded-full mt-4 mx-auto max-w-fit px-6 py-2 border border-slate-200 shadow-lg shadow-slate-200/50 flex items-center gap-8 font-manrope tracking-tight">
        {/* Brand */}
        <Link
          href="/"
          className="text-xl font-bold tracking-tighter text-slate-900 hover:text-blue-600 transition-colors duration-150 whitespace-nowrap"
        >
          Bouts
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-6">
          {NAV.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className={
                isActive(link.href)
                  ? "text-blue-600 font-semibold transition-colors duration-150"
                  : "text-slate-500 hover:text-slate-900 transition-colors duration-150"
              }
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4 border-l border-slate-200 pl-6">
          {loading ? (
            <div className="h-8 w-28 animate-pulse rounded-full bg-slate-100" />
          ) : user ? (
            <>
              {/* Notifications */}
              <button className="text-slate-400 hover:text-slate-900 scale-95 active:scale-90 transition-transform">
                <Bell className="size-5" />
              </button>

              {/* User dropdown */}
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="text-slate-500 hover:text-slate-900 scale-95 active:scale-90 transition-transform"
                >
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt={displayName}
                      width={28}
                      height={28}
                      className="size-7 rounded-full"
                    />
                  ) : (
                    <User className="size-5" />
                  )}
                </button>

                {dropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                    <div className="absolute right-0 top-full mt-3 z-50 w-48 rounded-xl bg-white border border-slate-200 shadow-2xl shadow-slate-200/50 py-1">
                      <div className="px-4 py-2.5 border-b border-slate-100">
                        <div className="text-sm font-medium text-slate-900">{displayName}</div>
                        <div className="text-xs text-slate-400 truncate">{user.email}</div>
                      </div>
                      <Link
                        href="/agents"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                      >
                        <Bot className="size-4" /> My Agents
                      </Link>
                      <Link
                        href="/settings"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                      >
                        <Settings className="size-4" /> Settings
                      </Link>
                      <div className="my-1 border-t border-slate-100" />
                      <button
                        onClick={handleSignOut}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-slate-50 transition-colors"
                      >
                        <LogOut className="size-4" /> Sign out
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Launch Agent CTA */}
              <Link
                href="/agents/new"
                className="bg-blue-600 text-white px-4 py-1.5 rounded-full text-sm font-bold hover:bg-blue-700 transition-colors whitespace-nowrap"
              >
                Launch Agent
              </Link>
            </>
          ) : (
            <Link
              href="/login"
              className="bg-blue-600 text-white px-4 py-1.5 rounded-full text-sm font-bold hover:bg-blue-700 transition-colors"
            >
              Launch Agent
            </Link>
          )}

          {/* Mobile toggle */}
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden text-slate-500 hover:text-slate-900 transition-colors p-1"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile dropdown — light */}
      {mobileOpen && (
        <div className="pointer-events-auto absolute inset-x-4 top-16 z-40 mt-2 rounded-2xl bg-white/95 backdrop-blur-xl border border-slate-200 shadow-2xl shadow-slate-200/50 md:hidden">
          <nav className="flex flex-col gap-1 px-4 py-3">
            {NAV.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={
                  isActive(link.href)
                    ? "rounded px-3 py-2.5 text-sm font-semibold text-blue-600 bg-blue-50"
                    : "rounded px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="border-t border-slate-100 px-4 py-3">
            {user ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {avatarUrl ? (
                    <Image src={avatarUrl} alt="" width={28} height={28} className="size-7 rounded-full" />
                  ) : (
                    <div className="size-7 rounded-full bg-slate-100 flex items-center justify-center">
                      <User className="size-4 text-blue-600" />
                    </div>
                  )}
                  <span className="text-sm text-slate-600">{displayName}</span>
                </div>
                <button onClick={handleSignOut} className="text-sm text-red-500 hover:text-red-600">
                  Sign out
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="block w-full text-center bg-blue-600 text-white font-bold px-6 py-2.5 rounded-full text-sm hover:bg-blue-700 transition-colors"
              >
                Launch Agent
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
