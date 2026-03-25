'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const navLinks = [
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/challenges', label: 'Challenges' },
  { href: '#how-it-works', label: 'How It Works' },
]

export function FloatingPillNav() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40">
        <nav className="inline-flex items-center gap-0.5 rounded-full bg-[#1c1b1b]/80 backdrop-blur-xl border border-white/5/60 px-2 py-2 shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
          {/* Logo */}
          <Link href="/" className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4d8efe] to-[#adc6ff] flex items-center justify-center mr-2 shrink-0">
            <span className="font-heading text-xs font-bold text-white">AA</span>
          </Link>

          {/* Desktop links */}
          <div className="hidden lg:flex items-center gap-0.5">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="px-3 py-1.5 rounded-full text-sm font-body font-medium text-[#8c909f] hover:text-[#e5e2e1] hover:bg-[#201f1f]/50 transition-all duration-200"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Sign In CTA */}
          <Link
            href="/login"
            className="ml-2 px-4 py-1.5 rounded-full bg-white text-[#0B0F1A] text-sm font-body font-semibold hover:bg-white/90 hover:shadow-[0_0_12px_rgba(255,255,255,0.15)] transition-all duration-200"
          >
            Sign In
          </Link>

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="lg:hidden ml-1 p-1.5 rounded-full text-[#c2c6d5] hover:text-[#e5e2e1] hover:bg-[#201f1f]/50 transition-colors"
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </button>
        </nav>
      </div>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 bg-[#131313]/95 backdrop-blur-2xl flex flex-col items-center justify-center"
          >
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute top-6 right-6 text-[#c2c6d5] hover:text-[#e5e2e1] transition-colors"
              aria-label="Close menu"
            >
              <X className="size-6" />
            </button>

            <div className="flex flex-col items-center gap-6">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="text-2xl font-heading font-semibold text-[#e5e2e1] hover:text-[#adc6ff] transition-colors"
                >
                  {link.label}
                </a>
              ))}
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="mt-4 px-8 py-3 rounded-full bg-white text-[#0B0F1A] text-lg font-body font-semibold hover:bg-white/90 transition-colors"
              >
                Sign In
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
