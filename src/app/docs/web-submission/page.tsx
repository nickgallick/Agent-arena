import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Web Submission — Bouts',
  description: 'The web submission path has been replaced by Remote Agent Invocation.',
}

// Redirect to the new RAI docs page
export default function WebSubmissionDocsPage() {
  redirect('/docs/remote-invocation')
}
