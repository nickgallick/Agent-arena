"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { Menu, X, LogOut, Settings, Bot, Bell, User } from "lucide-react"
import { useUser } from "@/lib/hooks/use-user"
import { createClient } from "@/lib/supabase/client"

// Context-aware nav per Stitch designs
function getNavConfig(pathname: string) {
  if (pathname.startsWith('/blog') || pathname.startsWith('/fair-play') || pathname.startsWith('/status') || pathname.startsWith('/terms') || pathname.startsWith('/privacy')) {
    return {
      links: [
        { href: '/blog', label: 'Blog' },
        { href: '/fair-play', label: 'Fair Play' },
        { href: '/status', label: 'Status' },
        { href: '/terms', label: 'Terms' },
      ],
      cta: { label: 'Console', href: '/dashboard', style: 'gradient' },
      showAvatar: true,
    }
  }
  if (pathname.startsWith('/docs') || pathname.startsWith('/agents')) {
    return {
      links: [
        { href: '/challenges', label: 'Arena' },
        { href: '/agents', label: 'Agents' },
        { href: '/leaderboard', label: 'Telemetry' },
        { href: '/docs', label: 'Docs' },
      ],
      cta: { label: 'Connect Node', href: '/dashboard', style: 'gradient' },
      showAvatar: false,
    }
  }
  // Arena pages (leaderboard, challenges, landing, default)
  return {
    links: [
      { href: '/leaderboard', label: 'Leaderboard' },
      { href: '/challenges', label: 'Challenges' },
      { href: '/how-it-works', label: 'How It Works' },
    ],
    cta: { label: 'Launch Agent', href: '/dashboard', style: 'gradient' },
    showAvatar: false,
  }
}

export function Header() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const { user, loading } = useUser()
  const navConfig = getNavConfig(pathname)

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
    <header className="fixed top-0 w-full z-50 bg-[#131313]/80 backdrop-blur-xl flex justify-between items-center px-6 h-16">
      {/* Brand */}
      <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
        <Image src="/bouts-logo.png" alt="Bouts" width={190} height={90} className="h-16 w-auto" priority />
      </Link>

      {/* Desktop nav */}
      <nav className="hidden md:flex items-center gap-8">
        {navConfig.links.map(link => (
          <Link
            key={link.label}
            href={link.href}
            className={
              isActive(link.href)
                ? "font-['Manrope'] font-medium text-sm tracking-tight text-[#adc6ff] border-b-2 border-[#adc6ff] pb-1"
                : "font-['Manrope'] font-medium text-sm tracking-tight text-[#c2c6d5] hover:text-[#e5e2e1] transition-colors duration-150"
            }
          >
            {link.label}
          </Link>
        ))}
      </nav>

      {/* Right */}
      <div className="flex items-center gap-4">
        {loading ? (
          <div className="h-8 w-28 animate-pulse rounded bg-[#201f1f]" />
        ) : user ? (
          <>
            <button className="text-[#c2c6d5] hover:text-[#adc6ff] transition-colors">
              <Bell className="size-5" />
            </button>
            <div className="relative">
              <button onClick={() => setDropdownOpen(!dropdownOpen)} className="text-[#c2c6d5] hover:text-[#adc6ff] transition-colors">
                {avatarUrl ? (
                  <Image src={avatarUrl} alt={displayName} width={32} height={32} className="w-8 h-8 rounded bg-[#353534] object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded bg-[#353534] flex items-center justify-center">
                    <User className="size-4 text-[#adc6ff]" />
                  </div>
                )}
              </button>
              {dropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                  <div className="absolute right-0 top-full mt-3 z-50 w-48 rounded-xl bg-[#201f1f] border border-[#424753]/15 shadow-2xl shadow-black/50 py-1">
                    <div className="px-4 py-2.5 border-b border-[#424753]/15">
                      <div className="text-sm font-medium text-[#e5e2e1]">{displayName}</div>
                      <div className="text-xs text-[#8c909f] truncate">{user.email}</div>
                    </div>
                    <Link href="/agents" onClick={() => setDropdownOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-[#c2c6d5] hover:bg-[#2a2a2a]">
                      <Bot className="size-4" /> My Agents
                    </Link>
                    <Link href="/settings" onClick={() => setDropdownOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-[#c2c6d5] hover:bg-[#2a2a2a]">
                      <Settings className="size-4" /> Settings
                    </Link>
                    <div className="my-1 border-t border-[#424753]/15" />
                    <button onClick={handleSignOut} className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-[#ffb4ab] hover:bg-[#2a2a2a]">
                      <LogOut className="size-4" /> Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
            <Link href="/agents/new" className="active:scale-95 transition-transform px-5 py-2 rounded bg-gradient-to-br from-[#adc6ff] to-[#4d8efe] text-[#001a41] font-bold text-sm">
              {navConfig.cta.label}
            </Link>
          </>
        ) : (
          <Link href={navConfig.cta.href} className="active:scale-95 transition-transform px-5 py-2 rounded-lg bg-gradient-to-br from-[#adc6ff] to-[#4d8efe] text-[#001a41] font-semibold text-sm">
            {navConfig.cta.label}
          </Link>
        )}
        <button type="button" onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden text-[#c2c6d5] hover:text-[#e5e2e1] p-1">
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="absolute inset-x-0 top-16 z-40 bg-[#131313]/95 backdrop-blur-xl border-b border-[#424753]/15 md:hidden">
          <nav className="flex flex-col gap-1 px-4 py-3">
            {navConfig.links.map(link => (
              <Link key={link.label} href={link.href} onClick={() => setMobileOpen(false)}
                className={isActive(link.href)
                  ? "rounded px-3 py-2.5 text-sm font-semibold text-[#adc6ff] bg-[#201f1f]"
                  : "rounded px-3 py-2.5 text-sm text-[#c2c6d5] hover:bg-white/5"
                }
              >{link.label}</Link>
            ))}
          </nav>
          <div className="border-t border-[#424753]/15 px-4 py-3">
            <Link href="/login" onClick={() => setMobileOpen(false)}
              className="block w-full text-center bg-gradient-to-br from-[#adc6ff] to-[#4d8efe] text-[#001a41] font-bold px-6 py-2.5 rounded text-sm">
              {navConfig.cta.label}
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
