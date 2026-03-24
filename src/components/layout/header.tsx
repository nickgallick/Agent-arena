"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { Menu, X, User, LogOut, Settings, Bot } from "lucide-react"
import { useUser } from "@/lib/hooks/use-user"
import { createClient } from "@/lib/supabase/client"

const navLinks = [
  { href: "/challenges", label: "Arena" },
  { href: "/agents", label: "Agents" },
  { href: "/leaderboard", label: "Telemetry" },
  { href: "/docs", label: "Docs" },
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
    <header className="fixed top-0 w-full z-50 bg-[#131313]/80 backdrop-blur-xl h-16 px-8 flex justify-between items-center">
      {/* Left: Brand + Desktop Nav */}
      <div className="flex items-center gap-8">
        <Link
          href="/"
          className="text-xl font-black tracking-tighter text-[#e5e2e1] uppercase hover:text-[#adc6ff] transition-colors duration-150 font-['Manrope']"
        >
          BOUTS ELITE
        </Link>
        <nav className="hidden md:flex gap-6 items-center font-['Manrope'] font-medium tracking-tight">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(link.href + "/")
            return (
              <Link
                key={link.href}
                href={link.href}
                className={
                  isActive
                    ? "text-[#adc6ff] border-b border-[#adc6ff] pb-0.5"
                    : "text-[#c2c6d5] hover:text-[#adc6ff] transition-colors duration-150"
                }
              >
                {link.label}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Right: CTA + User */}
      <div className="flex items-center gap-4">
        {loading ? (
          <div className="h-8 w-28 animate-pulse rounded bg-[#201f1f]" />
        ) : user ? (
          <div className="relative flex items-center gap-3">
            {/* Connect Node button for logged-in users */}
            <Link
              href="/dashboard"
              className="active:scale-95 transition-transform bg-gradient-to-br from-[#adc6ff] to-[#4d8efe] text-[#002e69] px-5 py-2 rounded font-bold text-sm whitespace-nowrap"
            >
              Command Center
            </Link>
            {/* Avatar / dropdown */}
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 text-sm font-medium text-[#c2c6d5] hover:text-[#e5e2e1] transition-colors duration-150"
            >
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={displayName}
                  width={32}
                  height={32}
                  className="size-8 rounded bg-[#353534] object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded bg-[#353534] flex items-center justify-center">
                  <User className="size-4 text-[#adc6ff]" />
                </div>
              )}
            </button>

            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                <div className="absolute right-0 top-full mt-2 z-50 w-48 rounded-xl bg-[#201f1f] shadow-2xl shadow-black/50 py-1 backdrop-blur-xl">
                  <Link
                    href="/agents"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-[#c2c6d5] hover:bg-[#2a2a2a] transition-colors duration-150"
                  >
                    <Bot className="size-4" /> My Agents
                  </Link>
                  <Link
                    href="/settings"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-[#c2c6d5] hover:bg-[#2a2a2a] transition-colors duration-150"
                  >
                    <Settings className="size-4" /> Settings
                  </Link>
                  <div className="my-1 border-t border-[#424753]/15" />
                  <button
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-[#ffb4ab] hover:bg-[#2a2a2a] transition-colors duration-150"
                  >
                    <LogOut className="size-4" /> Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <Link
            href="/login"
            className="active:scale-95 transition-transform bg-gradient-to-br from-[#adc6ff] to-[#4d8efe] text-[#002e69] px-5 py-2 rounded font-bold text-sm"
          >
            Connect Node
          </Link>
        )}

        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="inline-flex items-center justify-center rounded-lg p-2 text-[#c2c6d5] transition-colors hover:bg-[#201f1f] hover:text-[#e5e2e1] md:hidden"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="absolute inset-x-0 top-16 z-40 bg-[#131313]/95 backdrop-blur-xl border-t border-[#424753]/15 md:hidden">
          <nav className="flex flex-col gap-1 px-4 py-3">
            {navLinks.map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(link.href + "/")
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={
                    isActive
                      ? "rounded px-3 py-2.5 text-sm font-medium text-[#adc6ff] bg-[#201f1f]"
                      : "rounded px-3 py-2.5 text-sm font-medium text-[#c2c6d5] hover:bg-[#201f1f] hover:text-[#e5e2e1]"
                  }
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>
          <div className="border-t border-[#424753]/15 px-4 py-3">
            {user ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {avatarUrl ? (
                    <Image src={avatarUrl} alt="" width={28} height={28} className="size-7 rounded" />
                  ) : (
                    <div className="size-7 rounded bg-[#353534] flex items-center justify-center">
                      <User className="size-4 text-[#adc6ff]" />
                    </div>
                  )}
                  <span className="text-sm text-[#c2c6d5]">{displayName}</span>
                </div>
                <button
                  onClick={handleSignOut}
                  className="text-sm text-[#ffb4ab] hover:text-[#ffb4ab]/80"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="block w-full text-center bg-gradient-to-br from-[#adc6ff] to-[#4d8efe] text-[#002e69] font-bold px-6 py-2.5 rounded text-sm"
              >
                Connect Node
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
