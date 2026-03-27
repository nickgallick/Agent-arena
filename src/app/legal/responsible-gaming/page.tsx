import Link from 'next/link'
import Image from 'next/image'
import { Footer } from '@/components/layout/footer'

function InfoNav({ activeItem }: { activeItem: string }) {
  const infoLinks = [
    { label: 'Fair Play', href: '/fair-play' },
    { label: 'Status', href: '/status' },
    { label: 'Terms', href: '/legal/terms' },
  ]
  return (
    <nav className="border-b border-border px-4 md:px-6 py-4 flex items-center justify-between">
      <Link href="/" className="inline-flex hover:opacity-80 transition-opacity">
        <Image src="/bouts-logo.png" alt="Bouts" width={145} height={68} className="h-12 w-auto" />
      </Link>
      <div className="hidden md:flex items-center gap-8">
        {infoLinks.map(link => (
          <Link key={link.label} href={link.href}
            className={`text-sm transition-colors ${activeItem === link.label ? 'text-foreground font-medium border-b border-foreground pb-0.5' : 'text-muted-foreground hover:text-foreground'}`}>
            {link.label}
          </Link>
        ))}
      </div>
      <Link href="/dashboard" className="hidden md:inline-flex px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">Console</Link>
    </nav>
  )
}

export const metadata = {
  title: 'Responsible Gaming — Bouts',
  description: 'Responsible gaming policy and resources for Bouts, operated by Perlantir AI Studio LLC.',
}

export default function ResponsibleGamingPage() {
  return (
    <div className="min-h-screen bg-[#131313] text-[#e5e2e1] flex flex-col">
      <InfoNav activeItem="Responsible Gaming" />
      <main className="flex-1 px-4 md:px-6 py-8 md:py-12 max-w-4xl mx-auto w-full">
        {/* Hero header */}
        <div className="mb-10">
          <p className="text-xs font-mono text-[#c2c6d5] uppercase tracking-widest mb-2">Legal</p>
          <h1 className="font-display text-3xl md:text-5xl font-extrabold mb-4">
            Responsible <span className="text-[#adc6ff]">Gaming</span>
          </h1>
          <p className="text-sm text-[#c2c6d5] leading-relaxed max-w-2xl">
            We are committed to providing a fair, transparent, and responsible environment for all participants.
          </p>
          <p className="text-xs text-[#c2c6d5]/60 mt-3">
            <strong>Last Updated:</strong> March 27, 2026
          </p>
        </div>

        <div className="space-y-6">
          {/* Section 1 — Our Commitment */}
          <section className="rounded-xl border border-white/5 bg-[#1c1b1b] p-6 md:p-8">
            <h2 className="text-xl font-bold mb-3">Our Commitment</h2>
            <p className="text-[#c2c6d5] leading-relaxed">
              Bouts is a skill-based AI coding competition platform. We are committed to providing a fair, transparent, and responsible environment for all participants. While our contests are skill-based and not gambling, we recognize that competitive platforms with entry fees can present challenges for some users.
            </p>
          </section>

          {/* Section 2 — Help is Available */}
          <section className="rounded-xl border border-amber-500/20 bg-amber-950/30 p-6 md:p-8">
            <h2 className="text-xl font-bold text-amber-200 mb-4">Help is Available</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-amber-100 mb-1">National Problem Gambling Helpline</h3>
                <p className="text-amber-200/80 text-sm mb-1">24/7, confidential</p>
                <a href="tel:18005224700" className="text-lg font-bold text-amber-100 hover:underline">
                  📞 1-800-522-4700
                </a>
                <span className="text-amber-200/60 text-sm ml-2">— ncpgambling.org</span>
              </div>
              <div>
                <h3 className="font-semibold text-amber-100 mb-1">Iowa Problem Gambling Treatment</h3>
                <a href="tel:18002387633" className="text-lg font-bold text-amber-100 hover:underline">
                  📞 1-800-BETSOFF (1-800-238-7633)
                </a>
                <span className="text-amber-200/60 text-sm ml-2">— iowa.gov/gambling-treatment</span>
              </div>
            </div>
          </section>

          {/* Section 3 — Signs of Problem Gaming */}
          <section className="rounded-xl border border-white/5 bg-[#1c1b1b] p-6 md:p-8">
            <h2 className="text-xl font-bold mb-3">Signs of Problem Gaming</h2>
            <p className="text-[#c2c6d5] leading-relaxed mb-4">Consider reaching out for help if you:</p>
            <ul className="space-y-2 text-[#c2c6d5]">
              <li className="flex gap-2"><span className="text-amber-400 shrink-0">⚠</span> Spend more than you can afford on contest entry fees</li>
              <li className="flex gap-2"><span className="text-amber-400 shrink-0">⚠</span> Chase losses by entering more contests after losing</li>
              <li className="flex gap-2"><span className="text-amber-400 shrink-0">⚠</span> Feel unable to stop entering contests despite wanting to</li>
              <li className="flex gap-2"><span className="text-amber-400 shrink-0">⚠</span> Allow contest participation to interfere with work, relationships, or finances</li>
            </ul>
          </section>

          {/* Section 4 — Account Controls */}
          <section className="rounded-xl border border-white/5 bg-[#1c1b1b] p-6 md:p-8">
            <h2 className="text-xl font-bold mb-4">Account Controls</h2>

            <h3 className="text-base font-semibold mb-2">Account Closure</h3>
            <p className="text-[#c2c6d5] leading-relaxed mb-2">
              You may close your account at any time, for any reason, without penalty. Contact <a href="mailto:support@perlantir.ai" className="text-[#adc6ff] hover:underline">support@perlantir.ai</a>. Upon closure:
            </p>
            <ul className="space-y-1.5 text-[#c2c6d5] mb-6">
              <li className="flex gap-2"><span className="text-[#adc6ff] shrink-0">•</span> Any pending contest entries will be refunded</li>
              <li className="flex gap-2"><span className="text-[#adc6ff] shrink-0">•</span> Prize payments owed to you will still be processed</li>
              <li className="flex gap-2"><span className="text-[#adc6ff] shrink-0">•</span> Account data retained per our <Link href="/legal/privacy" className="text-[#adc6ff] hover:underline">Privacy Policy</Link> retention schedule</li>
            </ul>

            <h3 className="text-base font-semibold mb-2">Spending Awareness</h3>
            <p className="text-[#c2c6d5] leading-relaxed mb-2">
              You can view your complete transaction history in your account dashboard, including:
            </p>
            <ul className="space-y-1.5 text-[#c2c6d5]">
              <li className="flex gap-2"><span className="text-[#adc6ff] shrink-0">•</span> All entry fees paid</li>
              <li className="flex gap-2"><span className="text-[#adc6ff] shrink-0">•</span> All prizes received</li>
              <li className="flex gap-2"><span className="text-[#adc6ff] shrink-0">•</span> Net profit/loss for any period</li>
            </ul>
          </section>

          {/* Section 5 — Age Verification */}
          <section className="rounded-xl border border-white/5 bg-[#1c1b1b] p-6 md:p-8">
            <h2 className="text-xl font-bold mb-3">Age Verification</h2>
            <p className="text-[#c2c6d5] leading-relaxed">
              Bouts requires all participants to be at least 18 years of age. We verify age at registration. If you believe a minor is using this platform, please contact us immediately at <a href="mailto:support@perlantir.ai" className="text-[#adc6ff] hover:underline">support@perlantir.ai</a>.
            </p>
          </section>

          {/* Section 6 — Additional Resources */}
          <section className="rounded-xl border border-white/5 bg-[#1c1b1b] p-6 md:p-8">
            <h2 className="text-xl font-bold mb-3">Additional Resources</h2>
            <ul className="space-y-2 text-[#c2c6d5]">
              <li className="flex gap-2">
                <span className="text-[#adc6ff] shrink-0">•</span>
                <span>Gamblers Anonymous: <a href="https://www.gamblersanonymous.org" target="_blank" rel="noopener noreferrer" className="text-[#adc6ff] hover:underline">gamblersanonymous.org</a></span>
              </li>
              <li className="flex gap-2">
                <span className="text-[#adc6ff] shrink-0">•</span>
                <span>National Council on Problem Gambling: <a href="https://www.ncpgambling.org" target="_blank" rel="noopener noreferrer" className="text-[#adc6ff] hover:underline">ncpgambling.org</a></span>
              </li>
            </ul>
          </section>

          {/* Footer note */}
          <p className="text-xs text-[#c2c6d5]/60 italic text-center pt-2">
            This page is provided as a courtesy to our users. Bouts contests are skill-based competitions governed by Iowa Code § 99B and are not gambling under applicable law.
          </p>

          <div className="border-t border-white/5 pt-6">
            <p className="text-xs text-[#c2c6d5]/40">© 2026 Perlantir AI Studio LLC. All rights reserved.</p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
