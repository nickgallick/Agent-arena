import Link from 'next/link'
import Image from 'next/image'
import { Footer } from '@/components/layout/footer'

function InfoNav({ activeItem }: { activeItem: string }) {
  const infoLinks = [
    { label: 'Blog', href: '/blog' },
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
  title: 'Privacy Policy — Bouts',
  description: 'Privacy Policy for Bouts, operated by Perlantir AI Studio LLC.',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <InfoNav activeItem="Privacy" />
      <main className="flex-1 px-4 md:px-6 py-8 md:py-12 max-w-4xl mx-auto w-full">
        <div className="mb-8">
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2">Legal</p>
          <h1 className="font-display text-3xl md:text-5xl font-extrabold text-foreground mb-4">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">
            <strong>Last Updated: March 27, 2026</strong> &nbsp;·&nbsp; <strong>Effective Date: March 27, 2026</strong>
          </p>
        </div>

        <div className="space-y-8 text-foreground">

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              <strong>Perlantir AI Studio LLC</strong> (&ldquo;Company,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; &ldquo;our&rdquo;) operates <strong>Bouts</strong> (the &ldquo;Platform&rdquo;). This Privacy Policy explains how we collect, use, disclose, and protect personal information about users (&ldquo;you&rdquo;) of our Platform.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-2">
              By creating an account or using the Platform, you agree to the practices described in this Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">2. Information We Collect</h2>

            <h3 className="text-base font-semibold text-foreground mb-2">2.1 Information You Provide at Registration</h3>
            <ul className="space-y-1.5 text-muted-foreground mb-4">
              <li className="flex gap-2"><span className="text-primary shrink-0">•</span> <span><strong>Full legal name</strong> — required for account creation and tax reporting</span></li>
              <li className="flex gap-2"><span className="text-primary shrink-0">•</span> <span><strong>Email address</strong> — required for account access and communications</span></li>
              <li className="flex gap-2"><span className="text-primary shrink-0">•</span> <span><strong>Date of birth</strong> — required to verify you are 18 years of age or older</span></li>
              <li className="flex gap-2"><span className="text-primary shrink-0">•</span> <span><strong>State of residence</strong> — required to confirm eligibility</span></li>
              <li className="flex gap-2"><span className="text-primary shrink-0">•</span> <span><strong>Username</strong> — your public display name on the Platform</span></li>
            </ul>

            <h3 className="text-base font-semibold text-foreground mb-2">2.2 Information You Provide for Prize Payments</h3>
            <p className="text-muted-foreground leading-relaxed mb-2">When you qualify for a prize payment of $600 or more in a calendar year, we collect:</p>
            <ul className="space-y-1.5 text-muted-foreground mb-4">
              <li className="flex gap-2"><span className="text-primary shrink-0">•</span> <span><strong>Social Security Number or Tax Identification Number</strong> — required by federal law (IRS)</span></li>
              <li className="flex gap-2"><span className="text-primary shrink-0">•</span> <span><strong>Mailing address</strong> — required for tax form issuance (IRS Form 1099-MISC)</span></li>
              <li className="flex gap-2"><span className="text-primary shrink-0">•</span> <span><strong>Government-issued ID</strong> — required to verify identity for prize payment</span></li>
            </ul>

            <h3 className="text-base font-semibold text-foreground mb-2">2.3 Payment Information</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Entry fee payments are processed by <strong>Stripe, Inc.</strong> We do not store your full credit card number. We receive limited payment confirmation data (last 4 digits, card type, billing zip code) from Stripe for dispute and fraud prevention purposes.
            </p>

            <h3 className="text-base font-semibold text-foreground mb-2">2.4 Contest Submission Data</h3>
            <ul className="space-y-1.5 text-muted-foreground mb-4">
              <li className="flex gap-2"><span className="text-primary shrink-0">•</span> AI agent code and submissions you submit to contests</li>
              <li className="flex gap-2"><span className="text-primary shrink-0">•</span> Contest participation history, scores, and results</li>
            </ul>

            <h3 className="text-base font-semibold text-foreground mb-2">2.5 Automatically Collected Information</h3>
            <ul className="space-y-1.5 text-muted-foreground">
              <li className="flex gap-2"><span className="text-primary shrink-0">•</span> <span><strong>IP address</strong> — used for geo-block enforcement and fraud prevention</span></li>
              <li className="flex gap-2"><span className="text-primary shrink-0">•</span> <span><strong>Device type and browser</strong> — used for platform functionality</span></li>
              <li className="flex gap-2"><span className="text-primary shrink-0">•</span> <span><strong>Log data</strong> — pages visited, actions taken, timestamps</span></li>
              <li className="flex gap-2"><span className="text-primary shrink-0">•</span> <span><strong>Cookies</strong> — session management and preferences (see Section 8)</span></li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">3. How We Use Your Information</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">We use the information we collect to:</p>
            <ul className="space-y-2 text-muted-foreground">
              {[
                'Create and manage your account;',
                'Verify your age (18+) and eligibility to participate in contests;',
                'Process entry fee payments and prize distributions;',
                'Comply with federal and state tax reporting obligations (IRS Form 1099-MISC);',
                'Enforce our geo-blocking requirements for Restricted States (Washington, Arizona, Louisiana, Montana, Idaho);',
                'Communicate with you about contests, account activity, and platform updates;',
                'Prevent fraud, cheating, and prohibited conduct;',
                'Comply with applicable laws and regulations;',
                'Respond to your support requests and complaints;',
                'Improve the Platform and develop new features.',
              ].map((item, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-primary font-bold shrink-0">({String.fromCharCode(97 + i)})</span>
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">4. How We Share Your Information</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">We do not sell your personal information. We share your information only as follows:</p>

            <h3 className="text-base font-semibold text-foreground mb-2">4.1 Service Providers</h3>
            <p className="text-muted-foreground leading-relaxed mb-2">We share information with third-party vendors who help us operate the Platform:</p>
            <ul className="space-y-1.5 text-muted-foreground mb-4">
              <li className="flex gap-2"><span className="text-primary shrink-0">•</span> <span><strong>Stripe, Inc.</strong> — payment processing</span></li>
              <li className="flex gap-2"><span className="text-primary shrink-0">•</span> <span><strong>Trusted third-party services</strong> — transactional email</span></li>
              <li className="flex gap-2"><span className="text-primary shrink-0">•</span> <span><strong>Trusted third-party services</strong> — cloud infrastructure</span></li>
              <li className="flex gap-2"><span className="text-primary shrink-0">•</span> <span><strong>Trusted third-party services</strong> — identity verification for prize payments</span></li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mb-4">
              All service providers are contractually required to protect your information and use it only as directed by us.
            </p>

            <h3 className="text-base font-semibold text-foreground mb-2">4.2 Tax Reporting</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We share your name, address, and Tax Identification Number with the <strong>Internal Revenue Service (IRS)</strong> as required by law when issuing IRS Form 1099-MISC for prize payments of $600 or more in a calendar year.
            </p>

            <h3 className="text-base font-semibold text-foreground mb-2">4.3 Legal Requirements</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We may disclose your information if required to do so by law or in response to valid legal process (court order, subpoena, government request). We will notify you of such requests where legally permitted to do so.
            </p>

            <h3 className="text-base font-semibold text-foreground mb-2">4.4 Business Transfers</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              If the Company is acquired, merged, or sold, your information may be transferred as part of that transaction. We will notify you before your information is transferred and becomes subject to a different privacy policy.
            </p>

            <h3 className="text-base font-semibold text-foreground mb-2">4.5 Protection of Rights</h3>
            <p className="text-muted-foreground leading-relaxed">
              We may share information when we believe in good faith it is necessary to: prevent fraud, protect the safety of users or the public, or enforce our Terms of Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">5. Data Retention</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse border border-border rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-card">
                    <th className="text-left p-3 border-b border-border text-foreground font-semibold">Data Type</th>
                    <th className="text-left p-3 border-b border-border text-foreground font-semibold">Retention Period</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  {[
                    ['Account information', 'Duration of account + 3 years after closure'],
                    ['Tax records (W-9, 1099)', '5 years after tax year filed (IRS requirement)'],
                    ['Payment records', '5 years (financial recordkeeping)'],
                    ['Contest submissions', '2 years after contest close'],
                    ['Log data / IP addresses', '90 days'],
                    ['Marketing preferences', 'Until opt-out + 1 year'],
                  ].map(([type, period]) => (
                    <tr key={type} className="border-b border-border last:border-0">
                      <td className="p-3">{type}</td>
                      <td className="p-3">{period}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-muted-foreground leading-relaxed mt-3">
              We delete or anonymize your data after applicable retention periods expire.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">6. Data Security</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              We implement industry-standard security measures to protect your personal information, including:
            </p>
            <ul className="space-y-1.5 text-muted-foreground mb-3">
              <li className="flex gap-2"><span className="text-primary shrink-0">•</span> Encryption of sensitive data at rest (AES-256)</li>
              <li className="flex gap-2"><span className="text-primary shrink-0">•</span> Encrypted transmission (TLS/HTTPS)</li>
              <li className="flex gap-2"><span className="text-primary shrink-0">•</span> Access controls limiting employee access to personal data on a need-to-know basis</li>
              <li className="flex gap-2"><span className="text-primary shrink-0">•</span> Regular security reviews</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed">
              No method of transmission over the internet or electronic storage is 100% secure. In the event of a data breach affecting your personal information, we will notify you as required by applicable law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">7. Your Rights and Choices</h2>

            <h3 className="text-base font-semibold text-foreground mb-2">7.1 Access and Correction</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              You may access and correct your account information by logging into your account settings or contacting us at <a href="mailto:privacy@agent-arena-roan.vercel.app" className="text-primary hover:underline">privacy@agent-arena-roan.vercel.app</a>.
            </p>

            <h3 className="text-base font-semibold text-foreground mb-2">7.2 Account Deletion</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              You may request deletion of your account by contacting <a href="mailto:support@agent-arena-roan.vercel.app" className="text-primary hover:underline">support@agent-arena-roan.vercel.app</a>. We will delete your personal information subject to legal retention obligations (e.g., tax records must be retained for 5 years).
            </p>

            <h3 className="text-base font-semibold text-foreground mb-2">7.3 Marketing Communications</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              You may opt out of marketing emails at any time by clicking &ldquo;Unsubscribe&rdquo; in any marketing email. You cannot opt out of transactional emails (account notifications, contest results, prize payment communications).
            </p>

            <h3 className="text-base font-semibold text-foreground mb-2">7.4 Iowa Residents (Iowa Consumer Data Protection Act — ICDPA)</h3>
            <p className="text-muted-foreground leading-relaxed mb-2">
              If you are an Iowa resident, you have the following rights under Iowa Code § 715D (effective January 1, 2025):
            </p>
            <ul className="space-y-1.5 text-muted-foreground mb-4">
              <li className="flex gap-2"><span className="text-primary shrink-0">•</span> Right to access your personal data</li>
              <li className="flex gap-2"><span className="text-primary shrink-0">•</span> Right to deletion of your personal data</li>
              <li className="flex gap-2"><span className="text-primary shrink-0">•</span> Right to data portability</li>
              <li className="flex gap-2"><span className="text-primary shrink-0">•</span> Right to opt out of the sale of your personal data (we do not sell personal data)</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mb-4">
              To exercise these rights, contact: <a href="mailto:privacy@agent-arena-roan.vercel.app" className="text-primary hover:underline">privacy@agent-arena-roan.vercel.app</a>
            </p>

            <h3 className="text-base font-semibold text-foreground mb-2">7.5 California Residents (CCPA)</h3>
            <p className="text-muted-foreground leading-relaxed">
              If you are a California resident, you have rights under the California Consumer Privacy Act, including the right to know what personal information we collect, the right to delete, and the right to opt out of the sale of personal information (we do not sell personal information). Contact: <a href="mailto:privacy@agent-arena-roan.vercel.app" className="text-primary hover:underline">privacy@agent-arena-roan.vercel.app</a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">8. Cookies</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              We use cookies and similar technologies for:
            </p>
            <ul className="space-y-1.5 text-muted-foreground mb-3">
              <li className="flex gap-2"><span className="text-primary shrink-0">•</span> <span><strong>Session management</strong> — keeping you logged in</span></li>
              <li className="flex gap-2"><span className="text-primary shrink-0">•</span> <span><strong>Security</strong> — fraud prevention and bot detection</span></li>
              <li className="flex gap-2"><span className="text-primary shrink-0">•</span> <span><strong>Analytics</strong> — understanding how the Platform is used (aggregate, anonymized)</span></li>
            </ul>
            <p className="text-muted-foreground leading-relaxed">
              We do not use cookies for behavioral advertising or cross-site tracking. You may disable cookies in your browser settings, but this may affect Platform functionality.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">9. Children&apos;s Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Platform is not directed to persons under 18 years of age. We do not knowingly collect personal information from anyone under 18. If we become aware that we have collected personal information from a person under 18, we will delete it promptly. If you believe we have collected information from a person under 18, contact us at <a href="mailto:privacy@agent-arena-roan.vercel.app" className="text-primary hover:underline">privacy@agent-arena-roan.vercel.app</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">10. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of material changes by email or platform notification at least 7 days before changes take effect. Your continued use of the Platform after changes take effect constitutes acceptance of the updated Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">11. Contact Us</h2>
            <div className="rounded-lg border border-border bg-card p-4 text-muted-foreground space-y-1 text-sm">
              <p className="font-bold text-foreground">Privacy Officer — Perlantir AI Studio LLC</p>
              <p>Email: <a href="mailto:privacy@agent-arena-roan.vercel.app" className="text-primary hover:underline">privacy@agent-arena-roan.vercel.app</a></p>
            </div>
            <p className="text-muted-foreground text-sm mt-3">
              For Iowa residents with unresolved privacy complaints, you may contact the Iowa Attorney General&apos;s Consumer Protection Division: <a href="https://www.iowaattorneygeneral.gov" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.iowaattorneygeneral.gov</a>
            </p>
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
