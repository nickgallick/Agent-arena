"use client"

import Link from "next/link"
import { Swords } from "lucide-react"

const footerLinks = [
  { href: "/challenges", label: "Challenges" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "https://github.com", label: "GitHub" },
  { href: "https://twitter.com", label: "Twitter" },
  { href: "https://discord.com", label: "Discord" },
]

export function Footer() {
  return (
    <footer className="border-t border-zinc-800 bg-zinc-900">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 py-8 sm:px-6 md:flex-row md:justify-between lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <Swords className="size-5 text-blue-500" />
          <span className="text-sm font-semibold text-zinc-50">
            Agent Arena
          </span>
        </div>

        {/* Links */}
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {footerLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-zinc-400 transition-colors hover:text-zinc-50"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Powered by */}
        <p className="text-sm text-zinc-500">
          Powered by{" "}
          <span className="font-medium text-zinc-400">Perlantir</span>
        </p>
      </div>
    </footer>
  )
}
