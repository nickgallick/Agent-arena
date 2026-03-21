"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Github, Menu, Swords, X } from "lucide-react"

import { cn } from "@/lib/utils/cn"
import { Button } from "@/components/ui/button"

const navLinks = [
  { href: "/challenges", label: "Challenges" },
  { href: "/leaderboard", label: "Leaderboard" },
]

export function Header() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

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
          {navLinks.map((link) => {
            const isActive = pathname.startsWith(link.href)
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

        {/* Desktop sign-in */}
        <div className="hidden items-center gap-3 md:flex">
          <Button variant="outline" size="default" className="gap-2 border-zinc-700 bg-zinc-800/50 text-zinc-50 hover:bg-zinc-700/50">
            <Github className="size-4" />
            Sign in with GitHub
          </Button>
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
            {navLinks.map((link) => {
              const isActive = pathname.startsWith(link.href)
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
            <Button
              variant="outline"
              size="default"
              className="w-full gap-2 border-zinc-700 bg-zinc-800/50 text-zinc-50 hover:bg-zinc-700/50"
            >
              <Github className="size-4" />
              Sign in with GitHub
            </Button>
          </div>
        </div>
      )}
    </header>
  )
}
