"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { Github, Menu, Swords, X, User, LogOut, Settings, Bot } from "lucide-react"
import { useUser } from "@/lib/hooks/use-user"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils/cn"
import { Button } from "@/components/ui/button"

const navLinks = [
  { href: "/challenges", label: "Challenges" },
  { href: "/leaderboard", label: "Leaderboard" },
]

const authedNavLinks = [
  { href: "/agents", label: "My Agents" },
  { href: "/results", label: "Results" },
  { href: "/wallet", label: "Wallet" },
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

  const displayName = user?.user_metadata?.user_name
    || user?.user_metadata?.name
    || user?.email?.split("@")[0]
    || "User"

  const avatarUrl = user?.user_metadata?.avatar_url

  const allNavLinks = user ? [...navLinks, ...authedNavLinks] : navLinks

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Swords className="size-6 text-blue-500" />
          <span className="text-lg font-bold tracking-tight text-zinc-50">
            Agent Arena
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {allNavLinks.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(link.href + "/")
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-blue-500/10 text-blue-500"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-50"
                )}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>

        {/* Desktop auth */}
        <div className="hidden items-center gap-3 md:flex">
          {loading ? (
            <div className="h-8 w-20 animate-pulse rounded-lg bg-zinc-800" />
          ) : user ? (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                {avatarUrl ? (
                  <Image src={avatarUrl} alt="" width={28} height={28} className="size-7 rounded-full border border-zinc-700" />
                ) : (
                  <div className="size-7 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                    <User className="size-4 text-blue-400" />
                  </div>
                )}
                <span className="max-w-[120px] truncate">{displayName}</span>
              </button>

              {dropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 z-50 w-48 rounded-xl bg-zinc-900 border border-zinc-800 shadow-xl py-1">
                    <Link
                      href="/agents"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
                    >
                      <Bot className="size-4" /> My Agents
                    </Link>
                    <Link
                      href="/settings"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
                    >
                      <Settings className="size-4" /> Settings
                    </Link>
                    <div className="border-t border-zinc-800 my-1" />
                    <button
                      onClick={handleSignOut}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-zinc-800 transition-colors"
                    >
                      <LogOut className="size-4" /> Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <a href="/api/auth/github">
              <Button variant="outline" size="default" className="gap-2 border-zinc-700 bg-zinc-800/50 text-zinc-50 hover:bg-zinc-700/50">
                <Github className="size-4" />
                Sign in with GitHub
              </Button>
            </a>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="inline-flex items-center justify-center rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-50 md:hidden"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="border-t border-zinc-800 bg-zinc-900/95 backdrop-blur-xl md:hidden">
          <nav className="flex flex-col gap-1 px-4 py-3">
            {allNavLinks.map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(link.href + "/")
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-blue-500/10 text-blue-500"
                      : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-50"
                  )}
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>
          <div className="border-t border-zinc-800 px-4 py-3">
            {user ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {avatarUrl ? (
                    <Image src={avatarUrl} alt="" width={28} height={28} className="size-7 rounded-full border border-zinc-700" />
                  ) : (
                    <div className="size-7 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <User className="size-4 text-blue-400" />
                    </div>
                  )}
                  <span className="text-sm text-zinc-300">{displayName}</span>
                </div>
                <button onClick={handleSignOut} aria-label="Sign out" className="text-sm text-red-400 hover:text-red-300">
                  Sign out
                </button>
              </div>
            ) : (
              <a href="/api/auth/github" onClick={() => setMobileOpen(false)}>
                <Button variant="outline" size="default" className="w-full gap-2 border-zinc-700 bg-zinc-800/50 text-zinc-50 hover:bg-zinc-700/50">
                  <Github className="size-4" />
                  Sign in with GitHub
                </Button>
              </a>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
