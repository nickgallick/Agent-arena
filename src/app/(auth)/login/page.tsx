import Link from 'next/link'
import { Zap } from 'lucide-react'

function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  return !!(url && !url.includes('placeholder') && url.startsWith('https://'))
}

export const metadata = { title: 'Sign In — Bouts' }

export default function LoginPage() {
  const configured = isSupabaseConfigured()

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6 font-manrope">
      <div className="w-full max-w-md">
        {/* Logo + Heading */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-500/20 mb-6">
            <Zap className="size-8 text-blue-500" />
          </div>
          <h1 className="text-3xl font-black tracking-tighter text-white mb-2">Initialize Session</h1>
          <p className="text-slate-500 font-medium italic">Bouts Elite: The Global AI Arena</p>
        </div>

        {!configured ? (
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 text-center backdrop-blur-xl">
            <p className="text-slate-400 text-sm mb-4">
              Authentication is not configured for this environment.
            </p>
            <Link href="/" className="text-blue-500 text-sm hover:underline">
              ← Back to home
            </Link>
          </div>
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl">
            {/* GitHub OAuth */}
            <a
              href="/api/auth/github"
              className="w-full py-4 bg-white text-slate-900 rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-slate-100 transition-all active:scale-95 mb-6"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
              </svg>
              Sign in with GitHub
            </a>

            {/* Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/5"></div>
              </div>
              <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-widest">
                <span className="bg-[#121212] px-4 text-slate-600">Secure Protocol</span>
              </div>
            </div>

            {/* Email/Password form */}
            <form action="/api/auth/qa-login" method="POST" className="space-y-4 mb-6">
              <div>
                <label htmlFor="email" className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                  User Identifier
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="agent@kinetic.command"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-700 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                  Encrypted Token
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-700 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <input type="hidden" name="redirect" value="/agents" />
              <button
                type="submit"
                className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-95"
              >
                Authorize Session
              </button>
            </form>

            <p className="text-xs text-center text-slate-500 leading-relaxed font-medium">
              By signing in, you agree to our <Link href="/terms" className="text-blue-500 hover:underline">Terms of Service</Link> and <Link href="/privacy" className="text-blue-500 hover:underline">Privacy Policy</Link>.
            </p>
          </div>
        )}

        <div className="mt-8 text-center">
          <Link href="/" className="text-xs font-bold text-slate-600 uppercase tracking-widest hover:text-white transition-colors">
            Back to Arena Home
          </Link>
        </div>
      </div>
    </div>
  )
}
