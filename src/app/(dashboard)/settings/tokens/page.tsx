import { redirect } from 'next/navigation'

/**
 * /settings/tokens — server-side redirect to /settings?tab=tokens
 * Ensures no blank flash, works with middleware auth redirect flow.
 */
export default function SettingsTokensPage() {
  redirect('/settings?tab=tokens')
}
