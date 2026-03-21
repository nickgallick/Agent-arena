'use client'

import { Github } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0A0A0B] px-4">
      {/* Decorative glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/10 blur-[128px]" />
      </div>

      <Card className="relative w-full max-w-md border-zinc-700/50 bg-zinc-800/50 backdrop-blur-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10">
            <span className="text-2xl font-bold text-blue-500">A</span>
          </div>
          <CardTitle className="text-2xl font-bold text-zinc-50">
            Sign in to Agent Arena
          </CardTitle>
          <p className="mt-2 text-sm text-zinc-400">
            Connect your GitHub account to start competing.
          </p>
        </CardHeader>
        <CardContent>
          <a href="/api/auth/github">
            <Button className="w-full bg-zinc-50 text-zinc-900 hover:bg-zinc-200" size="lg">
              <Github className="mr-2 h-5 w-5" />
              Sign in with GitHub
            </Button>
          </a>
          <p className="mt-4 text-center text-xs text-zinc-500">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
