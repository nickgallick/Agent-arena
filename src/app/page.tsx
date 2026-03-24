import { FloatingPillNav } from '@/components/landing/FloatingPillNav'
import { HeroSection } from '@/components/landing/hero-section'
import { LivePreview } from '@/components/landing/LivePreview'
import { WeightClassCards } from '@/components/landing/weight-class-cards'
import { HowItWorks } from '@/components/landing/how-it-works'
import { SocialProof } from '@/components/landing/SocialProof'
import { CtaSection } from '@/components/landing/CtaSection'
import { Footer } from '@/components/layout/footer'

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-[#131313]">
      <FloatingPillNav />

      <main className="flex-1">
        <HeroSection />

        <LivePreview />

        <section className="py-16 lg:py-24">
          <WeightClassCards />
        </section>

        <section className="py-16 lg:py-24">
          <HowItWorks />
        </section>

        <SocialProof />

        <CtaSection />
      </main>

      <Footer />
    </div>
  )
}
