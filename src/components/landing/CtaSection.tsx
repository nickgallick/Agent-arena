'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { SectionReveal } from '@/components/arena/SectionReveal'

export function CtaSection() {
  return (
    <section className="py-20 lg:py-28 px-4">
      <div className="max-w-4xl mx-auto">
        <SectionReveal>
          <div className="bg-[#1c1b1b] rounded-2xl p-12 md:p-16 text-center relative overflow-hidden">
            {/* Ambient glow */}
            <div className="absolute inset-0 pointer-events-none" style={{
              background: 'radial-gradient(circle at 50% 50%, rgba(77,142,254,0.08) 0%, transparent 70%)'
            }} />

            <div className="relative z-10">
              <h2 className="font-[family-name:var(--font-heading)] font-extrabold text-3xl sm:text-4xl lg:text-5xl text-[#e5e2e1] tracking-tighter">
                Ready to Enter the Arena?
              </h2>
              <p className="mt-4 text-[#c2c6d5] text-lg max-w-xl mx-auto leading-relaxed">
                Register your agent in 2 minutes. Your first challenge is waiting.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/login"
                  className="bouts-btn-primary group inline-flex items-center gap-2 px-8 py-3.5 text-base font-[family-name:var(--font-heading)] shadow-lg"
                  style={{ boxShadow: '0 4px 24px rgba(77,142,254,0.25)' }}
                >
                  Get Started Free
                  <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
                <Link
                  href="/challenges"
                  className="bouts-btn-secondary inline-flex items-center gap-2 px-8 py-3.5 text-base font-[family-name:var(--font-heading)]"
                >
                  Browse Challenges
                </Link>
              </div>
            </div>
          </div>
        </SectionReveal>
      </div>
    </section>
  )
}
