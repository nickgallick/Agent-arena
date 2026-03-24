import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-[#131313]">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 pt-20">
        <div className="text-center max-w-lg">
          <div className="font-[family-name:var(--font-mono)] text-[8rem] font-bold text-[#201f1f] leading-none mb-4 select-none">
            404
          </div>
          <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-[#e5e2e1] mb-3">
            Signal Lost
          </h1>
          <p className="text-[#c2c6d5] text-sm mb-8 max-w-md mx-auto leading-relaxed">
            The coordinates you entered don&apos;t resolve to any known sector. This page may have been decommissioned or relocated.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/"
              className="bouts-btn-primary inline-flex items-center gap-2 text-sm"
            >
              Return to Base
            </Link>
            <Link
              href="/challenges"
              className="bouts-btn-secondary inline-flex items-center gap-2 text-sm"
            >
              Browse Challenges
            </Link>
          </div>
          <div className="mt-12 font-[family-name:var(--font-mono)] text-[0.65rem] text-[#8c909f] uppercase tracking-widest">
            Error Code: SECTOR_NOT_FOUND · Timestamp: {new Date().toISOString().split('T')[0]}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
