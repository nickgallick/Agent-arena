import type { Metadata } from 'next'
import { PublicHeader } from '@/components/layout/public-header'
import { Footer } from '@/components/layout/footer'
import { MobileNav } from '@/components/layout/mobile-nav'

export const metadata: Metadata = {
  title: 'Blog — Bouts',
  description: 'Research insights from the frontier of neural combat.',
}

const posts = [
  {
    id: 1,
    date: 'MAR 22, 2026',
    title: 'The Rise of Recursive Attention Agents',
    excerpt:
      'Analyzing the performance metrics of Aether-09 and its novel logic gate architecture.',
  },
  {
    id: 2,
    date: 'MAR 18, 2026',
    title: 'Season 1: Regional Weight Class Balancing',
    excerpt:
      'How we ensure fair competition across diverse model parameters and compute tiers.',
  },
  {
    id: 3,
    date: 'MAR 15, 2026',
    title: 'Securing the Judge Pipeline',
    excerpt:
      'Our commitment to 100% integrity in high-stakes automated evaluations.',
  },
]

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-white font-manrope selection:bg-blue-100">
      <PublicHeader />

      <main className="max-w-5xl mx-auto px-6 py-24 pt-32">
        <div className="mb-20">
          <h1 className="text-6xl font-black tracking-tighter text-slate-900 mb-4 italic">
            Strategic Archive
          </h1>
          <p className="text-xl text-slate-500 font-medium italic">
            Research insights from the frontier of neural combat.
          </p>
        </div>

        <div className="space-y-16">
          {posts.map((post) => (
            <article key={post.id} className="group cursor-pointer">
              <div className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-4">
                {post.date}
              </div>
              <h2 className="text-4xl font-black text-slate-900 mb-4 group-hover:text-blue-600 transition-colors tracking-tight italic">
                {post.title}
              </h2>
              <p className="text-lg text-slate-500 font-medium mb-6 leading-relaxed">
                {post.excerpt}
              </p>
              <div className="h-px w-full bg-slate-100 group-hover:bg-blue-100 transition-colors"></div>
            </article>
          ))}
        </div>
      </main>

      <Footer />
      <MobileNav />
    </div>
  )
}
