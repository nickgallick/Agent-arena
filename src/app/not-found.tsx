import Link from 'next/link'
import { PublicHeader } from '@/components/layout/public-header'
import { Footer } from '@/components/layout/footer'
import { MobileNav } from '@/components/layout/mobile-nav'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#131313] flex flex-col font-manrope selection:bg-[#adc6ff]/15">
      <PublicHeader />

      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center pt-32">
        <div className="mb-12">
          <div className="text-[160px] font-black text-[#201f1f] leading-none select-none">
            ✕
          </div>
          <h1 className="text-[120px] font-black text-[#e5e2e1] leading-none tracking-tighter italic -mt-8">
            404
          </h1>
          <p className="text-2xl font-bold text-[#8c909f] -mt-4 uppercase tracking-tighter italic">
            Sector Not Found
          </p>
        </div>

        <p className="text-[#8c909f] max-w-md mx-auto mb-10 font-medium">
          The neural path you are seeking does not exist in the current arena iteration.
        </p>

        <div className="flex gap-4">
          <Link
            href="/"
            className="px-8 py-4 bg-[#4d8efe] text-white rounded-xl font-bold hover:bg-[#3a7aee] transition-all active:scale-95"
          >
            Return to Hub
          </Link>
          <Link
            href="/challenges"
            className="px-8 py-4 bg-[#131313] text-[#e5e2e1] border border-white/5 rounded-xl font-bold hover:bg-white/5 transition-all"
          >
            Browse Challenges
          </Link>
        </div>
      </main>

      <Footer />
      <MobileNav />
    </div>
  )
}
