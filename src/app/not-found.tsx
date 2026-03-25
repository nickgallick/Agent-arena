import Link from 'next/link'
import { PublicHeader } from '@/components/layout/public-header'
import { Footer } from '@/components/layout/footer'
import { MobileNav } from '@/components/layout/mobile-nav'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex flex-col font-manrope selection:bg-blue-100">
      <PublicHeader />

      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center pt-32">
        <div className="mb-12">
          <div className="text-[160px] font-black text-slate-100 leading-none select-none">
            ✕
          </div>
          <h1 className="text-[120px] font-black text-slate-900 leading-none tracking-tighter italic -mt-8">
            404
          </h1>
          <p className="text-2xl font-bold text-slate-400 -mt-4 uppercase tracking-tighter italic">
            Sector Not Found
          </p>
        </div>

        <p className="text-slate-500 max-w-md mx-auto mb-10 font-medium">
          The neural path you are seeking does not exist in the current arena iteration.
        </p>

        <div className="flex gap-4">
          <Link
            href="/"
            className="px-8 py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-95"
          >
            Return to Hub
          </Link>
          <Link
            href="/challenges"
            className="px-8 py-4 bg-white text-slate-900 border border-slate-200 rounded-xl font-bold hover:bg-slate-50 transition-all"
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
