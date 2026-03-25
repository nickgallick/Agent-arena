"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { Menu, X, LogOut, Settings, Bot, Bell, User } from "lucide-react"
import { useUser } from "@/lib/hooks/use-user"
import { createClient } from "@/lib/supabase/client"

const navLinks = [
  { href: "/challenges", label: "Arena" },
  { href: "/agents", label: "Agents" },
  { href: "/leaderboard", label: "Bouts" },
  { href: "/leaderboard", label: "Telemetry" },
]

// Deduplicated nav links (Bouts + Telemetry both point to leaderboard; show distinct labels)
const NAV = [
  { href: "/challenges", label: "Arena" },
  { href: "/agents", label: "Agents" },
  { href: "/leaderboard", label: "Bouts" },
  { href: "/docs", label: "Telemetry" },
]

export function Header() {
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

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex justify-center w-full pointer-events-none">
      {/* Floating pill nav */}
      <nav className="pointer-events-auto bg-[#131313]/80 backdrop-blur-xl rounded-full mt-4 mx-auto max-w-fit px-6 py-2 border border-white/5 shadow-2xl shadow-blue-900/10 flex items-center gap-8 font-['Manrope'] tracking-tight">
        {/* Brand */}
        <Link
          href="/"
          className="text-xl font-bold tracking-tighter text-[#e5e2e1] hover:text-[#adc6ff] transition-colors duration-150 whitespace-nowrap"
        >
          Bouts
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-6">
          {NAV.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(link.href + "/")
            return (
              <Link
                key={link.href + link.label}
                href={link.href}
                className={
                  isActive
                    ? "text-[#adc6ff] font-semibold transition-colors duration-150"
                    : "text-[#c2c6d5] hover:text-[#adc6ff] transition-colors duration-150"
                }
              >
                {link.label}
              </Link>
            )
          })}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4 border-l border-white/5 pl-6">
          {loading ? (
            <div className="h-8 w-28 animate-pulse rounded-full bg-[#201f1f]" />
          ) : user ? (
            <>
              {/* Notifications */}
              <button className="text-[#c2c6d5] hover:text-[#adc6ff] scale-95 active:scale-90 transition-transform">
                <Bell className="size-5" />
              </button>

              {/* User dropdown */}
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="text-[#c2c6d5] hover:text-[#adc6ff] scale-95 active:scale-90 transition-transform"
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
                    <div className="absolute right-0 top-full mt-3 z-50 w-48 rounded-xl bg-[#201f1f] border border-white/5 shadow-2xl shadow-black/50 py-1">
                      <div className="px-4 py-2.5 border-b border-white/5">
                        <div className="text-sm font-medium text-[#e5e2e1]">{displayName}</div>
                        <div className="text-xs text-[#8c909f] truncate">{user.email}</div>
                      </div>
                      <Link
                        href="/agents"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-[#c2c6d5] hover:bg-[#2a2a2a] transition-colors"
                      >
                        <Bot className="size-4" /> My Agents
                      </Link>
                      <Link
                        href="/settings"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-[#c2c6d5] hover:bg-[#2a2a2a] transition-colors"
                      >
                        <Settings className="size-4" /> Settings
                      </Link>
                      <div className="my-1 border-t border-white/5" />
                      <button
                        onClick={handleSignOut}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-[#ffb4ab] hover:bg-[#2a2a2a] transition-colors"
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
                className="bg-gradient-to-br from-[#adc6ff] to-[#4d8efe] text-[#002e69] px-4 py-1.5 rounded text-sm font-bold scale-95 active:scale-90 transition-transform whitespace-nowrap"
              >
                Launch Agent
              </Link>
            </>
          ) : (
            <Link
              href="/login"
              className="bg-gradient-to-br from-[#adc6ff] to-[#4d8efe] text-[#002e69] px-4 py-1.5 rounded text-sm font-bold scale-95 active:scale-90 transition-transform"
            >
              Launch Agent
            </Link>
          )}

          {/* Mobile toggle */}
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden text-[#c2c6d5] hover:text-[#e5e2e1] transition-colors p-1"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="pointer-events-auto absolute inset-x-4 top-16 z-40 mt-2 rounded-2xl bg-[#131313]/95 backdrop-blur-xl border border-white/5 shadow-2xl shadow-black/50 md:hidden">
          <nav className="flex flex-col gap-1 px-4 py-3">
            {NAV.map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(link.href + "/")
              return (
                <Link
                  key={link.href + link.label}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={
                    isActive
                      ? "rounded px-3 py-2.5 text-sm font-semibold text-[#adc6ff] bg-[#201f1f]"
                      : "rounded px-3 py-2.5 text-sm text-[#c2c6d5] hover:bg-[#201f1f] hover:text-[#e5e2e1]"
                  }
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>
          <div className="border-t border-white/5 px-4 py-3">
            {user ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {avatarUrl ? (
                    <Image src={avatarUrl} alt="" width={28} height={28} className="size-7 rounded-full" />
                  ) : (
                    <div className="size-7 rounded-full bg-[#353534] flex items-center justify-center">
                      <User className="size-4 text-[#adc6ff]" />
                    </div>
                  )}
                  <span className="text-sm text-[#c2c6d5]">{displayName}</span>
                </div>
                <button onClick={handleSignOut} className="text-sm text-[#ffb4ab] hover:text-[#ffb4ab]/80">
                  Sign out
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="block w-full text-center bg-gradient-to-br from-[#adc6ff] to-[#4d8efe] text-[#002e69] font-bold px-6 py-2.5 rounded text-sm"
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
