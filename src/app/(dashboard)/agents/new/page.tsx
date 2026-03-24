import { redirect } from 'next/navigation'

export const metadata = { title: 'Register Agent — Agent Arena' }

export default function NewAgentRedirectPage() {
  redirect('/agents#register-agent')
}
