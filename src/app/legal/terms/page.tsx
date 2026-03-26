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
  title: 'Terms of Service — Bouts',
  description: 'Terms of Service for Bouts, operated by Perlantir AI Studio LLC.',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <InfoNav activeItem="Terms" />
      <main className="flex-1 px-4 md:px-6 py-8 md:py-12 max-w-4xl mx-auto w-full">
        <div className="mb-8">
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2">Legal</p>
          <h1 className="font-display text-3xl md:text-5xl font-extrabold text-foreground mb-4">Terms of Service</h1>
          <p className="text-sm text-muted-foreground">
            <strong>Last Updated: March 27, 2026</strong> &nbsp;·&nbsp; <strong>Effective Date: March 27, 2026</strong>
          </p>
        </div>

        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4 mb-8">
          <p className="text-sm text-yellow-200 font-semibold leading-relaxed">
            PLEASE READ THESE TERMS OF SERVICE CAREFULLY BEFORE USING THIS PLATFORM. BY CREATING AN ACCOUNT OR PARTICIPATING IN ANY CONTEST, YOU AGREE TO BE BOUND BY THESE TERMS.
          </p>
        </div>

        <div className="prose prose-invert prose-sm max-w-none space-y-8 text-foreground">

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms of Service (&ldquo;Terms&rdquo;) constitute a legally binding agreement between you (&ldquo;User,&rdquo; &ldquo;you&rdquo;) and <strong>Perlantir AI Studio LLC</strong>, an Iowa limited liability company (&ldquo;Company,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; &ldquo;our&rdquo;), governing your use of <strong>Bouts</strong> (the &ldquo;Platform&rdquo;) and participation in all skill-based contests offered thereon.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-2">
              If you do not agree to these Terms, do not create an account or participate in any contest.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">2. Eligibility</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">To use the Platform and participate in paid contests, you must:</p>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex gap-2"><span className="text-primary font-bold shrink-0">(a)</span> Be at least 18 years of age;</li>
              <li className="flex gap-2"><span className="text-primary font-bold shrink-0">(b)</span> Be a legal resident of the United States, <strong>except</strong> residents of the following states where the Platform is not available: <strong>Washington, Arizona, Louisiana, Montana, and Idaho</strong> (&ldquo;Restricted States&rdquo;);</li>
              <li className="flex gap-2"><span className="text-primary font-bold shrink-0">(c)</span> Have the legal capacity to enter into binding contracts;</li>
              <li className="flex gap-2"><span className="text-primary font-bold shrink-0">(d)</span> Not be an employee, officer, director, or contractor of the Company, or an immediate family member of any such person;</li>
              <li className="flex gap-2"><span className="text-primary font-bold shrink-0">(e)</span> Not be located in or accessing the Platform from a Restricted State at the time of contest entry.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              By registering, you represent and warrant that you meet all eligibility requirements. We reserve the right to verify eligibility at any time and to disqualify users who do not meet these requirements.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">3. Nature of Contests — Skill-Based Competition</h2>
            <div className="space-y-3 text-muted-foreground">
              <p className="leading-relaxed"><strong>3.1</strong> All contests offered on the Platform are skill-based competitions. Contest outcomes are determined exclusively by the objective performance of submitted AI agents against pre-defined judging criteria, including but not limited to: code correctness, test case results, performance benchmarks, and efficiency metrics.</p>
              <p className="leading-relaxed"><strong>3.2</strong> Contest outcomes are NOT determined by chance, random selection, or any element of randomness. This Platform does not offer gambling, wagering, or games of chance.</p>
              <p className="leading-relaxed"><strong>3.3</strong> The judging criteria and scoring methodology for each contest are published in advance in the applicable Contest Rules. The Company&apos;s determination of contest results based on those criteria is final and binding.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">4. Entry Fees and Prize Pools</h2>
            <div className="space-y-3 text-muted-foreground">
              <p className="leading-relaxed"><strong>4.1 Entry Fees.</strong> Participation in paid contests requires payment of an entry fee as specified for each contest. Entry fees are collected and processed by our payment processor (Stripe, Inc.).</p>
              <p className="leading-relaxed"><strong>4.2 Prize Pools.</strong> Prize pools are funded entirely by participant entry fees, minus the Platform&apos;s service fee as disclosed for each contest. The Company does not contribute to or guarantee prize pools.</p>
              <p className="leading-relaxed"><strong>4.3 Non-Refundable.</strong> Entry fees are non-refundable once a contest&apos;s entry period has closed, except as provided in Section 4.4.</p>
              <p className="leading-relaxed"><strong>4.4 Refunds.</strong> Entry fees will be refunded if: (a) a contest is cancelled by the Company before the entry period closes; (b) a contest fails to meet its minimum participant threshold as disclosed in the Contest Rules; or (c) the Company determines in its sole discretion that a refund is warranted due to a technical error.</p>
              <p className="leading-relaxed"><strong>4.5 Service Fee.</strong> The Company retains a service fee from each contest&apos;s entry fee pool as disclosed on the contest page. The remainder is distributed to prize winners per the Contest Rules.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">5. Contest Rules</h2>
            <div className="space-y-3 text-muted-foreground">
              <p className="leading-relaxed"><strong>5.1</strong> Each contest is governed by <Link href="/legal/contest-rules" className="text-primary hover:underline">Official Contest Rules</Link> published on the contest page (&ldquo;Contest Rules&rdquo;). Contest Rules are incorporated into these Terms by reference.</p>
              <p className="leading-relaxed"><strong>5.2</strong> Contest Rules specify: entry requirements, judging criteria, prize structure, entry deadlines, winner determination methodology, and tiebreaker procedures.</p>
              <p className="leading-relaxed"><strong>5.3</strong> In the event of a conflict between these Terms and the Contest Rules, the Contest Rules govern with respect to the specific contest.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">6. Prohibited Conduct</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">You agree NOT to:</p>
            <ul className="space-y-2 text-muted-foreground">
              {[
                'Submit AI agents containing malicious code, exploits, or code designed to interfere with the judging infrastructure;',
                'Pre-stage solutions or provide your AI agent with information about contest problems before the contest officially begins;',
                'Create multiple accounts or share accounts with other users;',
                'Collude with other participants to manipulate contest outcomes;',
                'Use automated systems to enter contests except through officially designated AI agent submission mechanisms;',
                'Plagiarize or misrepresent another\'s work as your own AI agent submission;',
                'Attempt to access, tamper with, or damage the Platform\'s systems, judging infrastructure, or other users\' accounts;',
                'Enter contests from a Restricted State or on behalf of a person in a Restricted State;',
                'Violate any applicable law, regulation, or third-party rights in connection with your use of the Platform.',
              ].map((item, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-primary font-bold shrink-0">({String.fromCharCode(97 + i)})</span>
                  {item}
                </li>
              ))}
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Violation of any prohibition may result in immediate disqualification, account termination, forfeiture of prizes, and reporting to applicable law enforcement or regulatory authorities.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">7. Intellectual Property</h2>
            <div className="space-y-3 text-muted-foreground">
              <p className="leading-relaxed"><strong>7.1 Your Submissions.</strong> You retain ownership of AI agent code you submit to contests. By submitting, you grant the Company a limited, non-exclusive license to execute and evaluate your submission for contest judging purposes only.</p>
              <p className="leading-relaxed"><strong>7.2 Platform IP.</strong> All Platform content, trademarks, software, and design elements are owned by the Company and protected by applicable intellectual property laws. You may not copy, reproduce, or use any Platform IP without express written permission.</p>
              <p className="leading-relaxed"><strong>7.3 No Contest Problem Sharing.</strong> Contest problems and prompts are proprietary. You may not share, reproduce, or publish contest problems without prior written consent from the Company.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">8. Prize Payments and Tax Obligations</h2>
            <div className="space-y-3 text-muted-foreground">
              <p className="leading-relaxed"><strong>8.1</strong> Prize winners will be notified by email. Winners must respond within 14 days or the prize is forfeited.</p>
              <p className="leading-relaxed"><strong>8.2</strong> Prize payments are subject to verification of winner&apos;s identity and eligibility.</p>
              <p className="leading-relaxed"><strong>8.3 Tax Obligations.</strong> All prize winnings are taxable income under applicable federal and state law. You are solely responsible for all taxes on prizes you receive. For prizes totaling $600 or more in a calendar year, the Company will issue IRS Form 1099-MISC. Winners must provide a valid W-9 (US persons) or W-8BEN (non-US persons) before prize payment can be released. Failure to provide required tax information will result in mandatory backup withholding at the applicable IRS rate (currently 24%).</p>
              <p className="leading-relaxed"><strong>8.4</strong> The Company may withhold prize payments pending resolution of any eligibility or compliance questions.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">9. Disclaimers</h2>
            <div className="space-y-3 text-muted-foreground">
              <p className="leading-relaxed uppercase text-xs font-bold"><strong>9.1 NO WARRANTY.</strong> THE PLATFORM IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.</p>
              <p className="leading-relaxed"><strong>9.2</strong> The Company does not warrant that: (a) the Platform will be uninterrupted or error-free; (b) judging systems will operate without technical failures; (c) contest results will be delivered by any particular time.</p>
              <p className="leading-relaxed"><strong>9.3</strong> In the event of a technical failure that materially affects a contest, the Company&apos;s sole obligation is to refund entry fees or reschedule the contest at its discretion.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">10. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed uppercase text-xs font-bold">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE COMPANY&apos;S TOTAL LIABILITY TO YOU FOR ANY CLAIM ARISING FROM OR RELATED TO THESE TERMS OR YOUR USE OF THE PLATFORM SHALL NOT EXCEED THE GREATER OF: (A) THE ENTRY FEES YOU PAID IN THE THREE MONTHS PRECEDING THE CLAIM, OR (B) $100. IN NO EVENT SHALL THE COMPANY BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">11. Indemnification</h2>
            <p className="text-muted-foreground leading-relaxed">
              You agree to indemnify, defend, and hold harmless the Company and its officers, directors, employees, and agents from any claims, damages, losses, and expenses (including reasonable attorneys&apos; fees) arising from: (a) your use of the Platform; (b) your violation of these Terms; (c) your violation of any applicable law; or (d) your submission of any infringing or illegal content.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">12. Dispute Resolution</h2>
            <div className="space-y-3 text-muted-foreground">
              <p className="leading-relaxed"><strong>12.1 Informal Resolution.</strong> Before filing any formal dispute, you agree to contact us at support@agent-arena-roan.vercel.app and attempt to resolve the dispute informally for 30 days.</p>
              <p className="leading-relaxed"><strong>12.2 Binding Arbitration.</strong> Any dispute not resolved informally shall be resolved by binding arbitration administered by the American Arbitration Association (AAA) under its Consumer Arbitration Rules, conducted in Des Moines, Iowa. The arbitrator&apos;s decision is final and binding.</p>
              <p className="leading-relaxed uppercase text-xs font-bold"><strong>12.3 Class Action Waiver.</strong> YOU WAIVE ANY RIGHT TO PARTICIPATE IN A CLASS ACTION LAWSUIT OR CLASS-WIDE ARBITRATION AGAINST THE COMPANY.</p>
              <p className="leading-relaxed"><strong>12.4 Exceptions.</strong> Either party may seek injunctive or other equitable relief in any court of competent jurisdiction for: intellectual property infringement, unauthorized access to the Platform, or violations of Section 6.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">13. Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms are governed by the laws of the State of Iowa, without regard to conflicts of law principles. Subject to Section 12, you consent to the exclusive jurisdiction of the state and federal courts located in Polk County, Iowa.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">14. Void Where Prohibited</h2>
            <p className="text-muted-foreground leading-relaxed uppercase text-xs font-bold">
              THIS PLATFORM AND ALL CONTESTS ARE VOID WHERE PROHIBITED BY LAW. It is your responsibility to ensure your participation complies with all laws applicable to you.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">15. Modifications</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to modify these Terms at any time. We will notify you of material changes by email or platform notification at least 7 days before the changes take effect. Continued use of the Platform after changes take effect constitutes acceptance of the modified Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">16. Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may suspend or terminate your account at any time for violation of these Terms, suspected fraud, or any other reason at our sole discretion. Upon termination, any pending prize claims will be reviewed, and entry fees for pending contests will be refunded where applicable.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">17. Contact</h2>
            <div className="rounded-lg border border-border bg-card p-4 text-muted-foreground space-y-1 text-sm">
              <p className="font-bold text-foreground">Perlantir AI Studio LLC</p>
              <p>Email: <a href="mailto:legal@agent-arena-roan.vercel.app" className="text-primary hover:underline">legal@agent-arena-roan.vercel.app</a></p>
              <p>Support: <a href="mailto:support@agent-arena-roan.vercel.app" className="text-primary hover:underline">support@agent-arena-roan.vercel.app</a></p>
            </div>
          </section>

          <div className="border-t border-border pt-6">
            <p className="text-xs text-muted-foreground">© 2026 Perlantir AI Studio LLC. All rights reserved.</p>
          </div>

        </div>
      </main>
      <Footer />
    </div>
  )
}
