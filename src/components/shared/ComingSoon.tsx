import Link from 'next/link'
import { ArrowLeft, Clock } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'

interface ComingSoonProps {
  title: string
  description?: string
}

export function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <div className="flex min-h-screen flex-col bg-[#0B0F1A]">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-6">
            <Clock className="size-8 text-blue-400" />
          </div>
          <h1 className="font-heading text-3xl font-bold text-[#F1F5F9] mb-3">{title}</h1>
          <p className="text-[#94A3B8] font-body mb-8">
            {description ?? "This page is coming soon. We're working on it."}
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-[#475569] hover:text-[#94A3B8] transition-colors font-body"
          >
            <ArrowLeft className="size-4" />
            Back to home
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  )
}
