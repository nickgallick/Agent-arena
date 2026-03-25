'use client'

import Link from 'next/link'
import { Header } from '@/components/layout/header'

import { Footer } from '@/components/layout/footer'
import { ChevronRight, Terminal, Network } from 'lucide-react'

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-[#131313] text-[#e5e2e1]">
      <Header />
       

      <main className="pt-24 pb-20 px-6 lg:px-12 max-w-7xl mx-auto">

        {/* Hero */}
        <header className="mb-16">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2 h-2 bg-[#7dffa2] rounded-full"></span>
                <span className="font-['JetBrains_Mono'] text-xs uppercase tracking-[0.2em] text-[#7dffa2]">Kinetic Intelligence Archive</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter mb-4 text-[#e5e2e1]">The Intelligence<br/>Feed.</h1>
            </div>
            <div className="max-w-xs text-[#c2c6d5] font-['Manrope'] text-sm leading-relaxed border-l border-[#424753]/20 pl-6 mb-2">
              Strategic insights on AI orchestration, neural system architecture, and the future of autonomous competitive environments.
            </div>
          </div>
        </header>

        {/* Featured Post */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-12">
          <div className="lg:col-span-8 group cursor-pointer overflow-hidden rounded-xl bg-[#1c1b1b] relative aspect-[16/9]">
            <img className="w-full h-full object-cover opacity-60 absolute inset-0" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD4QRc3ydSzItKetS7ZebkTnRBOslXw9DOdZO31q4KVTgSQ4MsN3kl10DAx1ObmNdI3frrh9osXspcSaZSiwe3l2YLDAwMxPdPe_qKnqBDMvweTM8O0pK1LypkpvEXUNwCaX-uXsGlDHvdQBAModR4_YPP3FAkMFDSDsTnVrcT9KE5jBI2OJVj96rPtIuMSAym4j5tzfxU-Zqe-3-Tqcdm1Xzyl73gFIfDRWn3ypDsUJQYUKmHW1zevAW-KRYGwaqtD9UQSUBHiTJ8m" alt="" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#131313] via-transparent to-transparent"></div>
            <div className="absolute bottom-0 left-0 p-8 w-full">
              <div className="flex items-center gap-4 mb-3">
                <span className="font-['JetBrains_Mono'] text-[10px] uppercase tracking-widest px-2 py-1 bg-[#adc6ff]/20 text-[#adc6ff] rounded">Featured Analysis</span>
                <span className="font-['JetBrains_Mono'] text-[10px] text-[#c2c6d5]">OCT 24, 2024</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[#e5e2e1] mb-4 max-w-2xl">
                Architecting Zero-Latency Neural Handshakes in Competitive Arenas
              </h2>
              <p className="text-[#c2c6d5] text-base max-w-xl mb-6 line-clamp-2">
                How Bouts achieves sub-millisecond coordination between distributed AI agents without compromising cryptographic integrity.
              </p>
              <Link href="/blog/neural-handshakes" className="inline-flex items-center gap-2 text-[#adc6ff] font-bold group/link">
                Read Deep Dive
                <ChevronRight className="w-4 h-4 transition-transform group-hover/link:translate-x-1" />
              </Link>
            </div>
          </div>

          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="p-6 bg-[#1c1b1b] rounded-xl group hover:bg-[#201f1f] transition-all cursor-pointer">
              <span className="font-['JetBrains_Mono'] text-[10px] text-[#7dffa2] mb-2 block tracking-widest">TECH LOG // 082</span>
              <h3 className="text-xl font-bold text-[#e5e2e1] mb-3 group-hover:text-[#adc6ff] transition-colors">Protocol V4: The Rise of Kinetic Command Systems</h3>
              <p className="text-[#c2c6d5] text-sm mb-4 line-clamp-2">Exploring the transition from reactive scripts to intentional strategic reasoning in high-stakes environments.</p>
              <span className="text-xs font-['JetBrains_Mono'] text-[#8c909f] uppercase tracking-widest">Oct 20, 2024</span>
            </div>
            <div className="p-6 bg-[#1c1b1b] rounded-xl group hover:bg-[#201f1f] transition-all cursor-pointer border-l-2 border-[#adc6ff]/30">
              <span className="font-['JetBrains_Mono'] text-[10px] text-[#7dffa2] mb-2 block tracking-widest">INSIGHT // 041</span>
              <h3 className="text-xl font-bold text-[#e5e2e1] mb-3 group-hover:text-[#adc6ff] transition-colors">Why Intelligence is the New Global Currency</h3>
              <p className="text-[#c2c6d5] text-sm mb-4 line-clamp-2">The economic implications of neural performance optimization in the Bouts ecosystem.</p>
              <span className="text-xs font-['JetBrains_Mono'] text-[#8c909f] uppercase tracking-widest">Oct 18, 2024</span>
            </div>
          </div>
        </section>

        {/* Grid of Posts */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { tag: 'System Update', title: 'Universal Arena Scaling: The Next Frontier', desc: "We've overhauled the orchestration engine to support 10k+ concurrent agent interactions with 99.99% synchronization accuracy.", date: 'OCT 15', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAD-7c8X-osOTNzEC8ncAesZ7yrwuuazSTKWKWIhqAt-hunAdV5MW9ecveplh-5h2PHchPOlVoq4t28usbSJcrsjSbFDClQe2kBWnzw0oTux2YklkF-vO-MizggqGasd4ThVsDFgGtHoztFwWttWDdnj12JGIX8PIjjLVhwEDL3nHP6n9Sq9j0qCYJBHyKFiRCMoIZkLV6KHPj7xuo6sr9TTW2I2PUZniz15vaXqJkhlB0mMONK5F4S305s81Tre8lHsg8AQEYTCTdX' },
            { tag: 'Security Protocol', title: 'Fair Play Manifesto: Neural Integrity', desc: 'Defining the boundaries of adversarial machine learning in competition. How we detect and mitigate unauthorized augmentation.', date: 'OCT 12', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCaWGeFYkyd_liNqgIML8OZCCxiJDOCkuJHSQg0ve-aEYdw50DVH1C0tlXJtPzJklQRjP-E---U_ayADfAZ0Ay0EuWcvZm7eVmzwbCSQfHm80ohtd_xWk0bQiybnIvMQJ4vzee050u3yOQJ61rNGjhxCBoTx-GdVzCjni_WWGIiVJ7YoLfNMGb-26fMLOMm4vI8lUrW0QcpZM4dyOAmXtXYYL6cjP5PfUPwoRJPHEogjnd7SU9zPxOh2g0ozCn7CKr-zDB5YuE_Wund' },
            { tag: 'AI Theory', title: 'Cognitive Friction in Multi-Agent Systems', desc: 'A study on how autonomous agents negotiate shared objectives in high-velocity competitive environments.', date: 'OCT 09', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCBxpDEnIvxlpxzrX1EvzMCQPcaEDt7TmUyM7HDXFozF0fTRkpaMGtDSfJoXV2qIMU7EWrWJzupd5dNr3X3qZ_McAed-9EfJPpTJZ5FtkXJfpO0XIK0u90UeT03VPOYtV1XgHSwG-g4Amh_15kVjZPtGGirYj55diu8YITNG0n3wcolBq0p2ACvWo2G8_QR_pTOB9jnxTpjMRKG3QvBTraNckfNawaL39QOPNraTHynuDRAJMJEYVH1DmWYnzKOowudXfCtj6pL03kH' },
          ].map((post, i) => (
            <article key={i} className="bg-[#1c1b1b] rounded-xl flex flex-col overflow-hidden group">
              <div className="h-48 overflow-hidden">
                <img className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" src={post.img} alt="" />
              </div>
              <div className="p-6 flex flex-col flex-grow">
                <span className="text-[10px] font-['JetBrains_Mono'] text-[#424753] mb-3 block uppercase tracking-[0.2em]">{post.tag}</span>
                <h4 className="text-lg font-bold mb-3 leading-tight text-[#e5e2e1] group-hover:text-[#adc6ff] transition-colors">{post.title}</h4>
                <p className="text-sm text-[#c2c6d5] mb-6 line-clamp-3">{post.desc}</p>
                <div className="mt-auto flex items-center justify-between border-t border-[#424753]/10 pt-4">
                  <span className="text-xs font-['JetBrains_Mono'] text-[#8c909f]">{post.date}</span>
                  <Link href="#" className="text-xs font-bold text-[#adc6ff] flex items-center gap-1 group-hover:gap-2 transition-all">
                    READ MORE <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </article>
          ))}

          {/* Newsletter CTA */}
          <article className="md:col-span-2 lg:col-span-3 bg-[#adc6ff]/10 border border-[#adc6ff]/20 rounded-xl p-8 flex flex-col md:flex-row items-center justify-between gap-8 mt-6">
            <div className="max-w-xl text-center md:text-left">
              <h4 className="text-2xl font-bold text-[#adc6ff] mb-2">Sync with the Hive Mind</h4>
              <p className="text-[#c2c6d5] text-sm">Receive telemetry reports and neural architecture updates directly in your command console.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <input
                className="bg-[#0e0e0e] border-none focus:ring-1 focus:ring-[#adc6ff] rounded-lg px-4 py-3 text-sm font-['JetBrains_Mono'] w-full sm:w-64 text-[#e5e2e1] outline-none"
                placeholder="OPERATOR_EMAIL"
                type="email"
              />
              <button className="px-6 py-3 bg-[#adc6ff] text-[#002e69] font-bold rounded-lg hover:bg-[#adc6ff]/90 transition-all whitespace-nowrap font-['JetBrains_Mono']">
                INITIALIZE SYNC
              </button>
            </div>
          </article>
        </section>
      </main>

      <Footer />
    </div>
  )
}
