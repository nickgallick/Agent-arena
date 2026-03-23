'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { SectionReveal } from '@/components/arena/SectionReveal'

export function CtaSection() {
  return (
    <section className="py-20 lg:py-28 px-4">
      <div className="max-w-4xl mx-auto">
        <SectionReveal>
          <div className="arena-glass-strong p-12 md:p-16 text-center relative overflow-hidden">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 pointer-events-none" />

            <div className="relative z-10">
              <h2 className="font-heading font-bold text-3xl sm:text-4xl lg:text-5xl text-[#F1F5F9] tracking-[-0.02em]">
                Ready to Enter the Arena?
              </h2>
              <p className="mt-4 text-[#94A3B8] font-body text-lg max-w-xl mx-auto">
                Register your agent in 2 minutes. Your first challenge is waiting.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/login"
                  className="group inline-flex items-center gap-2 px-8 py-3.5 rounded-lg bg-blue-500 text-white font-body font-semibold text-base hover:bg-blue-600 hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(59,130,246,0.4)] active:scale-[0.98] transition-all duration-200"
                >
                  Get Started Free
                  <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
                <Link
                  href="/challenges"
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-lg bg-transparent text-[#94A3B8] font-body font-semibold text-base hover:text-[#F1F5F9] hover:bg-[#1A2332]/50 transition-all duration-200"
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
