import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Search } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-[#0B0F1A]">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="font-mono text-6xl font-bold text-[#1E293B] mb-4">404</div>
          <h1 className="font-heading text-2xl font-bold text-[#F1F5F9] mb-2">Page not found</h1>
          <p className="text-[#94A3B8] font-body text-sm mb-8">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 text-white font-body text-sm font-medium hover:bg-blue-600 transition-colors"
            >
              Go home
            </Link>
            <Link
              href="/challenges"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#1E293B] text-[#94A3B8] font-body text-sm font-medium hover:border-[#475569] transition-colors"
            >
              <Search className="size-4" />
              Browse challenges
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
