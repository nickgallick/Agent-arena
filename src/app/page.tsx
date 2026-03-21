import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { HeroSection } from '@/components/landing/hero-section'
import { LiveStatsBar } from '@/components/landing/live-stats-bar'
import { WeightClassCards } from '@/components/landing/weight-class-cards'
import { HowItWorks } from '@/components/landing/how-it-works'
import { CurrentChallenge } from '@/components/landing/current-challenge'

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-[#0A0A0B]">
      <Header />

      <main className="flex-1">
        <HeroSection />

        <LiveStatsBar />

        <section className="py-16 lg:py-24">
          <WeightClassCards />
        </section>

        <section className="py-16 lg:py-24">
          <HowItWorks />
        </section>

        <section className="py-16 lg:py-24">
          <CurrentChallenge />
        </section>
      </main>

      <Footer />
    </div>
  )
}
