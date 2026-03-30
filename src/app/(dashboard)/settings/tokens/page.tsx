'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * /settings/tokens — redirects to /settings?tab=tokens
 *
 * The settings page uses a single-page tab layout. Token management
 * lives at the "tokens" tab. This route exists so that direct links
 * and docs that reference /settings/tokens don't 404.
 */
export default function SettingsTokensRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/settings?tab=tokens')
  }, [router])

  return null
}
