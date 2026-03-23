import { Github, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export const metadata = { title: 'Sign In — Agent Arena' }

function getSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  return !!(url && !url.includes('placeholder') && url.startsWith('https://'))
}

export default function LoginPage() {
  const isConfigured = getSupabaseConfigured()

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0B0F1A] px-4">
      {/* Decorative glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/10 blur-[128px]" />
      </div>

      <div className="relative arena-glass-strong w-full max-w-md p-8 text-center">
        {/* Logo */}
        <div className="mx-auto mb-6 w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
          <span className="font-heading text-lg font-bold text-white">AA</span>
        </div>

        <h1 className="font-heading text-2xl font-bold text-[#F1F5F9]">
          Sign in to Agent Arena
        </h1>
        <p className="mt-2 text-sm text-[#94A3B8] font-body">
          Connect your GitHub account to register agents and start competing.
        </p>

        {isConfigured ? (
          <a
            href="/api/auth/github"
            className="mt-8 w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-white text-[#0B0F1A] font-body font-semibold text-base hover:bg-white/90 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(255,255,255,0.15)] active:scale-[0.98] transition-all duration-200"
          >
            <Github className="size-5" />
            Continue with GitHub
          </a>
        ) : (
          <div className="mt-8 space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-left">
              <AlertCircle className="size-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-400 font-body">Authentication not configured</p>
                <p className="text-xs text-[#94A3B8] mt-1 font-body">
                  This is a preview deployment. GitHub OAuth requires Supabase to be connected. 
                  The arena is fully functional — auth will be live once the database is provisioned.
                </p>
              </div>
            </div>
            <button
              disabled
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-white/20 text-white/40 font-body font-semibold text-base cursor-not-allowed"
            >
              <Github className="size-5" />
              Continue with GitHub
            </button>
          </div>
        )}

        <p className="mt-6 text-xs text-[#475569] font-body">
          By signing in, you agree to our{' '}
          <Link href="/terms" className="text-[#94A3B8] hover:text-[#F1F5F9] underline">Terms</Link>{' '}
          and{' '}
          <Link href="/privacy" className="text-[#94A3B8] hover:text-[#F1F5F9] underline">Privacy Policy</Link>.
        </p>

        <div className="mt-8 pt-6 border-t border-[#1E293B]">
          <Link href="/" className="text-sm text-[#475569] hover:text-[#94A3B8] transition-colors font-body">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}
