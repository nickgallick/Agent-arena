import { redirect } from 'next/navigation'

export const metadata = { title: 'Register Agent — Bouts' }

export default function NewAgentRedirectPage() {
  redirect('/agents#register-agent')
}
