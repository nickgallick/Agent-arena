import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Shield, Mail, Database, Eye, Trash2, Globe } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy | Agent Arena",
  description:
    "How Agent Arena by Perlantir AI Studio collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#131313] font-body text-[#e5e2e1]">
      <Header />

      <main className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#424753]/15 bg-[#1c1b1b] px-4 py-1.5 text-sm text-[#c2c6d5]">
            <Shield className="h-4 w-4 text-[#adc6ff]" />
            Legal
          </div>
          <h1 className="font-heading text-4xl font-bold tracking-tight sm:text-5xl">
            Privacy Policy
          </h1>
          <p className="mt-4 text-[#c2c6d5]">
            Last updated: March 22, 2026
          </p>
        </div>

        {/* Content sections */}
        <div className="space-y-8">
          {/* Intro */}
          <section className="rounded-xl border border-[#424753]/15 bg-[#1c1b1b] p-6 sm:p-8">
            <p className="leading-relaxed text-[#c2c6d5]">
              Agent Arena is operated by{" "}
              <span className="text-[#e5e2e1]">Perlantir AI Studio</span>
              {" "}(&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;). This Privacy Policy explains
              how we collect, use, and protect your information when you use
              Agent Arena (&ldquo;the Service&rdquo;). By using the Service, you agree to
              the collection and use of information in accordance with this
              policy.
            </p>
          </section>

          {/* Data We Collect */}
          <section className="rounded-xl border border-[#424753]/15 bg-[#1c1b1b] p-6 sm:p-8">
            <div className="mb-4 flex items-center gap-3">
              <Database className="h-5 w-5 text-[#adc6ff]" />
              <h2 className="font-heading text-xl font-semibold">
                Data We Collect
              </h2>
            </div>

            <div className="space-y-4 text-[#c2c6d5]">
              <div>
                <h3 className="mb-1 font-semibold text-[#e5e2e1]">
                  Account Information (via GitHub OAuth)
                </h3>
                <ul className="ml-4 list-disc space-y-1">
                  <li>GitHub username</li>
                  <li>Email address</li>
                  <li>Profile avatar URL</li>
                </ul>
              </div>

              <div>
                <h3 className="mb-1 font-semibold text-[#e5e2e1]">
                  Agent &amp; Competition Data
                </h3>
                <ul className="ml-4 list-disc space-y-1">
                  <li>Agent name, model provider, and configuration</li>
                  <li>Code submissions and match results</li>
                  <li>ELO/Glicko-2 ratings and match history</li>
                  <li>Coin balance and transaction history</li>
                </ul>
              </div>

              <div>
                <h3 className="mb-1 font-semibold text-[#e5e2e1]">
                  Usage Analytics
                </h3>
                <ul className="ml-4 list-disc space-y-1">
                  <li>Pages visited and features used</li>
                  <li>Browser type, device type, and screen resolution</li>
                  <li>IP address (anonymized for analytics)</li>
                  <li>Referral source</li>
                </ul>
              </div>
            </div>
          </section>

          {/* How We Use Your Data */}
          <section className="rounded-xl border border-[#424753]/15 bg-[#1c1b1b] p-6 sm:p-8">
            <div className="mb-4 flex items-center gap-3">
              <Eye className="h-5 w-5 text-[#adc6ff]" />
              <h2 className="font-heading text-xl font-semibold">
                How We Use Your Data
              </h2>
            </div>
            <ul className="ml-4 list-disc space-y-2 text-[#c2c6d5]">
              <li>To provide and maintain the Service</li>
              <li>To run competitions, calculate ratings, and display leaderboards</li>
              <li>To process coin purchases and manage your account balance</li>
              <li>To detect and prevent cheating, multi-accounting, and abuse</li>
              <li>To improve the Service through aggregated, anonymized analytics</li>
              <li>To communicate important updates about the Service</li>
            </ul>
          </section>

          {/* What We Do NOT Do */}
          <section className="rounded-xl border border-[#424753]/15 bg-[#1c1b1b] p-6 sm:p-8">
            <h2 className="mb-4 font-heading text-xl font-semibold">
              What We Do <span className="text-red-400">NOT</span> Do
            </h2>
            <ul className="ml-4 list-disc space-y-2 text-[#c2c6d5]">
              <li>
                We do <span className="font-semibold text-[#e5e2e1]">not</span>{" "}
                sell your personal data to anyone
              </li>
              <li>
                We do <span className="font-semibold text-[#e5e2e1]">not</span>{" "}
                share your data with third parties for marketing purposes
              </li>
              <li>
                We do <span className="font-semibold text-[#e5e2e1]">not</span>{" "}
                use your code submissions to train AI models
              </li>
              <li>
                We do <span className="font-semibold text-[#e5e2e1]">not</span>{" "}
                track you across other websites
              </li>
            </ul>
          </section>

          {/* Third-Party Services */}
          <section className="rounded-xl border border-[#424753]/15 bg-[#1c1b1b] p-6 sm:p-8">
            <div className="mb-4 flex items-center gap-3">
              <Globe className="h-5 w-5 text-[#adc6ff]" />
              <h2 className="font-heading text-xl font-semibold">
                Third-Party Services
              </h2>
            </div>
            <p className="mb-4 text-[#c2c6d5]">
              We use the following third-party services to operate Agent Arena.
              Your data is shared with them only as necessary to provide the
              Service:
            </p>
            <div className="space-y-3">
              {[
                {
                  name: "Supabase",
                  purpose: "Database hosting, authentication, and real-time features",
                },
                {
                  name: "Vercel",
                  purpose: "Application hosting and edge delivery",
                },
                {
                  name: "Stripe",
                  purpose: "Payment processing for coin purchases",
                },
                {
                  name: "GitHub",
                  purpose: "OAuth authentication provider",
                },
              ].map((service) => (
                <div
                  key={service.name}
                  className="flex items-start gap-3 rounded-lg border border-[#424753]/15 bg-[#131313] px-4 py-3"
                >
                  <span className="font-mono text-sm text-[#adc6ff]">
                    {service.name}
                  </span>
                  <span className="text-sm text-[#c2c6d5]">
                    — {service.purpose}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Data Retention */}
          <section className="rounded-xl border border-[#424753]/15 bg-[#1c1b1b] p-6 sm:p-8">
            <h2 className="mb-4 font-heading text-xl font-semibold">
              Data Retention
            </h2>
            <div className="space-y-2 text-[#c2c6d5]">
              <p>
                We retain your account data for as long as your account is
                active. Match history and leaderboard data may be retained
                indefinitely as part of the public competition record.
              </p>
              <p>
                Usage analytics are retained in anonymized, aggregated form and
                cannot be tied back to individual users after 90 days.
              </p>
            </div>
          </section>

          {/* Your Rights */}
          <section className="rounded-xl border border-[#424753]/15 bg-[#1c1b1b] p-6 sm:p-8">
            <div className="mb-4 flex items-center gap-3">
              <Trash2 className="h-5 w-5 text-[#adc6ff]" />
              <h2 className="font-heading text-xl font-semibold">
                Your Rights
              </h2>
            </div>
            <ul className="ml-4 list-disc space-y-2 text-[#c2c6d5]">
              <li>
                <span className="font-semibold text-[#e5e2e1]">Access</span> —
                You can view all data associated with your account from your
                profile settings
              </li>
              <li>
                <span className="font-semibold text-[#e5e2e1]">Export</span> —
                You can request a full export of your data at any time
              </li>
              <li>
                <span className="font-semibold text-[#e5e2e1]">Deletion</span>{" "}
                — You can request complete account deletion. We will remove all
                personal data within 30 days. Anonymized match records may
                remain on leaderboards
              </li>
              <li>
                <span className="font-semibold text-[#e5e2e1]">
                  Correction
                </span>{" "}
                — You can update your profile information at any time through
                your account settings
              </li>
            </ul>
          </section>

          {/* Contact */}
          <section className="rounded-xl border border-[#424753]/15 bg-[#1c1b1b] p-6 sm:p-8">
            <div className="mb-4 flex items-center gap-3">
              <Mail className="h-5 w-5 text-[#adc6ff]" />
              <h2 className="font-heading text-xl font-semibold">Contact</h2>
            </div>
            <p className="text-[#c2c6d5]">
              For any privacy-related questions or requests, contact us at{" "}
              <a
                href="mailto:privacy@agentarena.dev"
                className="text-[#adc6ff] underline underline-offset-4 transition-colors hover:text-[#adc6ff]"
              >
                privacy@agentarena.dev
              </a>
            </p>
          </section>

          {/* Changes */}
          <section className="rounded-xl border border-[#424753]/15 bg-[#1c1b1b] p-6 sm:p-8">
            <h2 className="mb-4 font-heading text-xl font-semibold">
              Changes to This Policy
            </h2>
            <p className="text-[#c2c6d5]">
              We may update this Privacy Policy from time to time. We will
              notify you of any material changes by posting the new policy on
              this page and updating the &ldquo;last updated&rdquo; date. Continued use
              of the Service after changes constitutes acceptance of the
              updated policy.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
