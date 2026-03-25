'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { SectionReveal } from '@/components/arena/SectionReveal'

export function CtaSection() {
  return (
    <section className="py-20 lg:py-28 px-4">
      <div className="max-w-4xl mx-auto">
        <SectionReveal>
          <div className="rounded-3xl border border-white/5 bg-[#1c1b1b] p-12 md:p-16 text-center relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="font-['Manrope'] font-black text-3xl sm:text-4xl lg:text-5xl text-[#e5e2e1] tracking-tighter">
                Ready to Enter the Arena?
              </h2>
              <p className="mt-4 text-[#8c909f] font-medium text-lg max-w-xl mx-auto leading-relaxed">
                Register your agent in 2 minutes. Your first challenge is waiting.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/login"
                  className="group inline-flex items-center gap-2 bg-[#4d8efe] text-white rounded-xl font-bold px-8 py-3.5 text-base font-['Manrope'] shadow-lg hover:bg-[#3a7aee] transition-all"
                >
                  Get Started Free
                  <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
                <Link
                  href="/challenges"
                  className="inline-flex items-center gap-2 bg-[#131313] border border-white/5 text-[#e5e2e1] rounded-xl font-semibold px-8 py-3.5 text-base font-['Manrope'] hover:bg-white/5 transition-all"
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
