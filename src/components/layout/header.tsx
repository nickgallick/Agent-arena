"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { Menu, X, User, LogOut, Settings, Bot } from "lucide-react"
import { useUser } from "@/lib/hooks/use-user"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils/cn"

const navLinks = [
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/challenges", label: "Challenges" },
  { href: "/how-it-works", label: "How It Works" },
]

export function Header() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { user, loading } = useUser()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

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

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center w-full px-4 pointer-events-none">
      <nav className={`pointer-events-auto bg-[#1c1b1b]/60 backdrop-blur-xl rounded-full mt-4 mx-auto max-w-fit px-6 py-2 sticky top-4 shadow-2xl shadow-black/50 flex items-center gap-8 transition-all ${scrolled ? "scale-95" : ""}`}>
        <Link href="/" className="text-xl font-bold tracking-tighter text-[#e5e2e1] font-[family-name:var(--font-heading)] hover:text-[#adc6ff] transition-colors">
          Bouts
        </Link>
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[#c2c6d5] hover:text-[#adc6ff] transition-colors duration-150 font-[family-name:var(--font-heading)] font-medium text-[0.875rem] tracking-tight active:scale-95"
            >
              {link.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-4">
          {loading ? (
            <div className="h-8 w-16 animate-pulse rounded-lg bg-[#201f1f]" />
          ) : user ? (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 text-sm font-medium text-[#c2c6d5] hover:text-[#e5e2e1] transition-colors duration-150"
              >
                {avatarUrl ? (
                  <Image src={avatarUrl} alt="" width={28} height={28} className="size-7 rounded-full" />
                ) : (
                  <User className="size-6 text-[#adc6ff] cursor-pointer" />
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
            <>
              <Link
                href="/login"
                className="text-[#adc6ff] hover:text-[#e5e2e1] transition-colors duration-150 font-[family-name:var(--font-heading)] font-medium text-[0.875rem] tracking-tight active:scale-95"
              >
                Sign In
              </Link>
              <Link href="/profile">
                <User className="size-6 text-[#adc6ff] cursor-pointer" />
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="inline-flex items-center justify-center rounded-lg p-2 text-[#c2c6d5] transition-colors hover:bg-[#201f1f] hover:text-[#e5e2e1] md:hidden"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </nav>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="pointer-events-auto fixed inset-x-0 top-16 z-40 mx-4 mt-2 rounded-2xl bg-[#1c1b1b]/95 backdrop-blur-xl shadow-2xl shadow-black/50 md:hidden">
          <nav className="flex flex-col gap-1 px-4 py-3">
            {navLinks.map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(link.href + "/")
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150 font-[family-name:var(--font-heading)]",
                    isActive
                      ? "bg-[#201f1f] text-[#adc6ff]"
                      : "text-[#c2c6d5] hover:bg-[#201f1f] hover:text-[#e5e2e1]"
                  )}
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
                    <Image src={avatarUrl} alt="" width={28} height={28} className="size-7 rounded-full" />
                  ) : (
                    <div className="size-7 rounded-full bg-[#4d8efe]/20 flex items-center justify-center">
                      <User className="size-4 text-[#adc6ff]" />
                    </div>
                  )}
                  <span className="text-sm text-[#c2c6d5]">{displayName}</span>
                </div>
                <button onClick={handleSignOut} aria-label="Sign out" className="text-sm text-[#ffb4ab] hover:text-[#ffb4ab]/80">
                  Sign out
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="block w-full text-center bg-gradient-to-br from-[#adc6ff] to-[#4d8efe] text-[#002e69] font-bold px-6 py-2.5 rounded shadow-lg text-sm font-[family-name:var(--font-heading)]"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
