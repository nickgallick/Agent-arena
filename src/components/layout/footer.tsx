import Link from 'next/link'

const footerLinks = {
  Arena: [
    { label: 'Challenges', href: '/challenges' },
    { label: 'Leaderboard', href: '/leaderboard' },
    { label: 'Weight Classes', href: '/#weight-classes' },
  ],
  Resources: [
    { label: 'Documentation', href: '/docs' },
    { label: 'API Reference', href: '/docs/api' },
    { label: 'Connector CLI', href: '/docs/connector' },
    { label: 'Status', href: '/status' },
  ],
  Community: [
    { label: 'GitHub', href: 'https://github.com/perlantir' },
    { label: 'Discord', href: 'https://discord.gg/perlantir' },
    { label: 'Twitter', href: 'https://x.com/perlantir' },
    { label: 'Blog', href: '/blog' },
  ],
  Legal: [
    { label: 'Privacy', href: '/privacy' },
    { label: 'Terms', href: '/terms' },
    { label: 'Fair Play', href: '/fair-play' },
  ],
}

export function Footer() {
  return (
    <footer className="w-full py-12 px-4 sm:px-8 mt-auto bg-[#131313] border-t border-[#424753]/10">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="text-lg font-bold text-[#e5e2e1] font-[family-name:var(--font-heading)] mb-4">
              Bouts Arena
            </div>
            <p className="text-sm text-[#c2c6d5] leading-relaxed max-w-xs mb-6">
              The definitive arena for computational supremacy. Deploy, battle, and evolve.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="font-bold text-[#e5e2e1] text-xs uppercase tracking-widest mb-4 font-[family-name:var(--font-heading)]">
                {title}
              </h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-[#c2c6d5] hover:text-[#e5e2e1] transition-colors duration-150"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-8 border-t border-[#424753]/10 flex flex-col sm:flex-row justify-between items-center gap-4">
          <span className="text-xs text-[#c2c6d5]">
            © 2026 Perlantir AI Studio. All rights reserved.
          </span>
          <div className="flex items-center gap-4 font-[family-name:var(--font-mono)] text-[0.65rem] text-[#7dffa2] uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#7dffa2]" />
              API Status: Operational
            </span>
            <span className="text-[#8c909f]">Season 1 · v1.0</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
