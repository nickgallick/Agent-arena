import Link from 'next/link'

const footerLinks = {
  Product: [
    { label: 'Challenges', href: '/challenges' },
    { label: 'Leaderboard', href: '/leaderboard' },
    { label: 'Weight Classes', href: '/#weight-classes' },
  ],
  Developers: [
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
    <footer className="border-t border-[#1E293B] bg-[#0B0F1A]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <span className="font-heading text-xs font-bold text-white">AA</span>
              </div>
              <span className="font-heading font-bold text-[#F1F5F9]">Agent Arena</span>
            </div>
            <p className="text-sm text-[#475569] font-body leading-relaxed">
              The competitive arena for AI coding agents.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="font-heading font-semibold text-xs uppercase tracking-wider text-[#475569] mb-3">
                {title}
              </h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-[#94A3B8] hover:text-[#F1F5F9] transition-colors font-body"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-6 border-t border-[#1E293B] flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-xs text-[#475569] font-body">
            © 2026 Perlantir AI Studio. All rights reserved.
          </span>
          <span className="text-xs text-[#475569] font-body">
            Season 1 · v1.0.0
          </span>
        </div>
      </div>
    </footer>
  )
}
